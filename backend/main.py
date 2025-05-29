from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import requests
import base64
import io
from PIL import Image
import os
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import json
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

app = FastAPI(title="InventoryLens AI", version="1.0.0")

# CORS middleware - Updated for production deployment
allowed_origins = [
    "http://localhost:5173",  # Local React dev
    "http://localhost:3000",  # Local React dev
    "https://inventorylens-demo.onrender.com",  # Your Render backend
]

# Add Netlify domain when you know it
netlify_domain = os.getenv("NETLIFY_DOMAIN", "")
if netlify_domain:
    allowed_origins.append(f"https://{netlify_domain}")
    allowed_origins.append(f"https://{netlify_domain}.netlify.app")

# For development, you can also allow all origins (not recommended for production)
if os.getenv("ENVIRONMENT") == "development":
    allowed_origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# HuggingFace API configuration - Updated model URLs
HF_API_TOKEN = os.getenv("HUGGINGFACE_API_KEY", "")
OBJECT_DETECTION_URL = "https://api-inference.huggingface.co/models/facebook/detr-resnet-50"
IMAGE_CLASSIFICATION_URL = "https://api-inference.huggingface.co/models/google/vit-base-patch16-224"

# Improved headers with better error handling
headers = {
    "Content-Type": "application/json"
}
if HF_API_TOKEN and HF_API_TOKEN != "your_huggingface_token_here":
    headers["Authorization"] = f"Bearer {HF_API_TOKEN}"
    print(f"✅ Using HuggingFace API token: {HF_API_TOKEN[:10]}...")
else:
    print("⚠️  No valid HuggingFace API token found - using public inference (may be rate limited)")

def encode_image_to_base64(image: Image.Image) -> str:
    """Convert PIL Image to base64 string"""
    buffered = io.BytesIO()
    # Save as JPEG to ensure compatibility
    if image.mode in ('RGBA', 'LA', 'P'):
        image = image.convert('RGB')
    image.save(buffered, format="JPEG", quality=90)
    img_str = base64.b64encode(buffered.getvalue()).decode()
    return img_str

def process_image(image: Image.Image) -> Image.Image:
    """Preprocess image for better AI performance"""
    # Convert to RGB if needed (important for HuggingFace APIs)
    if image.mode != "RGB":
        image = image.convert("RGB")
    
    # Resize if too large (HuggingFace has size limits)
    max_size = 800  # Reduced from 1024 for better API compatibility
    if max(image.size) > max_size:
        ratio = max_size / max(image.size)
        new_size = tuple(int(dim * ratio) for dim in image.size)
        image = image.resize(new_size, Image.Resampling.LANCZOS)
    
    return image

def categorize_classification_labels(predictions: List[Dict]) -> Dict[str, float]:
    """Categorize image classification results into inventory-relevant categories"""
    # Define category mappings for inventory analysis
    category_mappings = {
        "food": [
            "bakery", "grocery store", "restaurant", "pizzeria", "ice cream", 
            "bagel", "pretzel", "hotdog", "hamburger", "pizza", "burrito",
            "breakfast", "meat loaf", "soup", "potpie", "stew", "carbonara",
            "grocery_store", "confectionery", "butcher_shop"
        ],
        "beverages": [
            "wine bottle", "beer bottle", "water bottle", "pop bottle", 
            "cocktail", "espresso", "cup", "coffee mug", "beer glass",
            "wine_bottle", "water_jug", "bottle"
        ],
        "electronics": [
            "laptop", "desktop computer", "tablet", "smartphone", "monitor",
            "television", "radio", "printer", "scanner", "keyboard",
            "mouse", "hard disc", "cd player", "ipod", "cell phone"
        ],
        "clothing": [
            "suit", "jersey", "sweater", "cardigan", "sweatshirt", "miniskirt",
            "jean", "bow tie", "neck brace", "stole", "academic gown",
            "bikini", "swimming trunks", "pajama"
        ],
        "household": [
            "vacuum", "washbasin", "bathtub", "shower curtain", "toilet tissue",
            "paper towel", "dishwasher", "refrigerator", "microwave", 
            "toaster", "coffee maker", "blender", "laundry basket"
        ],
        "books_media": [
            "book jacket", "comic book", "crossword puzzle", "magazine",
            "newspaper", "envelope", "menu", "bookshop"
        ],
        "health_beauty": [
            "lotion", "sunscreen", "hair slide", "hair spray", "perfume",
            "lipstick", "face powder", "soap dispenser", "pill bottle"
        ],
        "tools_hardware": [
            "screwdriver", "hammer", "wrench", "plunger", "chain saw",
            "power drill", "nail", "screw", "buckle", "padlock"
        ],
        "toys_games": [
            "teddy", "jigsaw puzzle", "balloon", "pinwheel", "yo-yo",
            "puzzle", "toy store", "barbell", "dumbbell"
        ],
        "office_supplies": [
            "binder", "notebook", "pencil case", "ballpoint", "marker",
            "rubber eraser", "stapler", "paper clip", "calculator"
        ]
    }
    
    # Initialize category scores
    category_scores = {category: 0.0 for category in category_mappings.keys()}
    category_scores["other"] = 0.0
    
    # Process predictions and map to categories
    total_confidence = 0.0
    for pred in predictions[:10]:  # Consider top 10 predictions
        label = pred["label"].lower()
        confidence = pred["score"]
        total_confidence += confidence
        
        # Find matching category
        matched = False
        for category, keywords in category_mappings.items():
            if any(keyword in label for keyword in keywords):
                category_scores[category] += confidence
                matched = True
                break
        
        if not matched:
            category_scores["other"] += confidence
    
    # Normalize scores to percentages
    if total_confidence > 0:
        for category in category_scores:
            category_scores[category] = round((category_scores[category] / total_confidence) * 100, 1)
    
    # Remove categories with 0% score
    return {k: v for k, v in category_scores.items() if v > 0}

@app.get("/")
async def root():
    """Root endpoint with deployment info"""
    return {
        "message": "InventoryLens AI Backend is running!", 
        "status": "healthy",
        "version": "1.0.0",
        "deployed_on": "render.com",
        "endpoints": {
            "health": "/health",
            "object_detection": "/detect",
            "image_classification": "/classify",
            "full_analysis": "/analyze"
        }
    }

@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring"""
    return {
        "status": "healthy", 
        "services": ["object_detection", "image_classification"],
        "huggingface_token": "configured" if HF_API_TOKEN else "not_configured"
    }

@app.post("/detect")
async def detect_objects(file: UploadFile = File(...)):
    """
    Object Detection endpoint
    Detects and counts objects in uploaded image
    """
    try:
        # Validate file type
        if not file.content_type or not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Read and process image
        image_data = await file.read()
        if not image_data:
            raise HTTPException(status_code=400, detail="Empty image file")
            
        image = Image.open(io.BytesIO(image_data))
        image = process_image(image)
        
        # Convert image to base64 for HuggingFace API
        image_b64 = encode_image_to_base64(image)
        
        # Prepare payload for HuggingFace API
        payload = {
            "inputs": image_b64,
            "parameters": {
                "threshold": 0.3  # Confidence threshold
            }
        }
        
        print(f"Sending object detection request to: {OBJECT_DETECTION_URL}")
        print(f"Image size: {image.size}, Format: {image.format}, Mode: {image.mode}")
        
        # Call HuggingFace Object Detection API
        try:
            response = requests.post(
                OBJECT_DETECTION_URL,
                headers=headers,
                json=payload,
                timeout=30
            )
            
            print(f"Object Detection API Response Status: {response.status_code}")
            print(f"Object Detection API Response: {response.text[:500]}...")
            
        except requests.exceptions.RequestException as e:
            raise HTTPException(status_code=500, detail=f"API request failed: {str(e)}")
        
        # Handle different response codes
        if response.status_code == 401:
            raise HTTPException(
                status_code=401, 
                detail="HuggingFace API authentication failed. Check your API token."
            )
        elif response.status_code == 503:
            raise HTTPException(
                status_code=503, 
                detail="Model is loading. Please try again in a few moments."
            )
        elif response.status_code == 429:
            raise HTTPException(
                status_code=429,
                detail="Rate limit exceeded. Please wait and try again."
            )
        elif response.status_code != 200:
            # Try to parse error message
            try:
                error_data = response.json()
                error_msg = error_data.get('error', f'Unknown error (Status {response.status_code})')
            except:
                error_msg = f'API error (Status {response.status_code}): {response.text}'
            raise HTTPException(status_code=500, detail=error_msg)
        
        # Parse response
        try:
            detections = response.json()
        except json.JSONDecodeError:
            raise HTTPException(status_code=500, detail="Invalid JSON response from API")
        
        # Handle case where model is still loading
        if isinstance(detections, dict) and "error" in detections:
            if "loading" in detections["error"].lower():
                raise HTTPException(status_code=503, detail="Model is loading. Please try again in a few moments.")
            else:
                raise HTTPException(status_code=500, detail=f"API Error: {detections['error']}")
        
        # Process detections
        if not isinstance(detections, list):
            raise HTTPException(status_code=500, detail="Unexpected response format from detection API")
        
        object_counts = {}
        filtered_detections = []
        
        for detection in detections:
            if isinstance(detection, dict) and detection.get("score", 0) > 0.3:
                label = detection.get("label", "unknown")
                object_counts[label] = object_counts.get(label, 0) + 1
                filtered_detections.append({
                    "label": label,
                    "confidence": round(detection.get("score", 0), 3),
                    "box": detection.get("box", {})
                })
        
        total_objects = len(filtered_detections)
        
        return {
            "success": True,
            "total_objects": total_objects,
            "detections": filtered_detections,
            "object_counts": object_counts,
            "summary": f"Found {total_objects} objects with {len(object_counts)} different types"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Detection error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Detection error: {str(e)}")

@app.post("/classify")
async def classify_image(file: UploadFile = File(...)):
    """
    Image Classification endpoint
    Classifies the overall content/scene of the uploaded image
    """
    try:
        # Validate file type
        if not file.content_type or not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Read and process image
        image_data = await file.read()
        if not image_data:
            raise HTTPException(status_code=400, detail="Empty image file")
            
        image = Image.open(io.BytesIO(image_data))
        image = process_image(image)
        
        # Convert image to base64 for HuggingFace API
        image_b64 = encode_image_to_base64(image)
        
        # Prepare payload for HuggingFace API
        payload = {
            "inputs": image_b64
        }
        
        print(f"Sending image classification request to: {IMAGE_CLASSIFICATION_URL}")
        print(f"Image size: {image.size}")
        
        # Call HuggingFace Image Classification API
        try:
            response = requests.post(
                IMAGE_CLASSIFICATION_URL,
                headers=headers,
                json=payload,
                timeout=30
            )
            
            print(f"Classification API Response Status: {response.status_code}")
            print(f"Classification API Response: {response.text[:500]}...")
            
        except requests.exceptions.RequestException as e:
            raise HTTPException(status_code=500, detail=f"Classification API request failed: {str(e)}")
        
        # Handle different response codes
        if response.status_code == 401:
            raise HTTPException(
                status_code=401, 
                detail="HuggingFace API authentication failed. Check your API token."
            )
        elif response.status_code == 503:
            raise HTTPException(
                status_code=503, 
                detail="Classification model is loading. Please try again in a few moments."
            )
        elif response.status_code == 429:
            raise HTTPException(
                status_code=429,
                detail="Rate limit exceeded. Please wait and try again."
            )
        elif response.status_code != 200:
            try:
                error_data = response.json()
                error_msg = error_data.get('error', f'Classification API error (Status {response.status_code})')
            except:
                error_msg = f'Classification API error (Status {response.status_code}): {response.text}'
            raise HTTPException(status_code=500, detail=error_msg)
        
        # Parse response
        try:
            classifications = response.json()
        except json.JSONDecodeError:
            raise HTTPException(status_code=500, detail="Invalid JSON response from Classification API")
        
        # Handle loading error
        if isinstance(classifications, dict) and "error" in classifications:
            if "loading" in classifications["error"].lower():
                raise HTTPException(status_code=503, detail="Classification model is loading. Please try again in a few moments.")
            else:
                raise HTTPException(status_code=500, detail=f"Classification API Error: {classifications['error']}")
        
        # Process classifications
        if not isinstance(classifications, list):
            raise HTTPException(status_code=500, detail="Unexpected response format from classification API")
        
        # Get top predictions
        top_predictions = classifications[:10]  # Top 10 predictions
        
        # Categorize into inventory-relevant categories
        category_breakdown = categorize_classification_labels(top_predictions)
        
        # Get the most likely category
        top_category = max(category_breakdown.items(), key=lambda x: x[1]) if category_breakdown else ("unknown", 0)
        
        # Create summary
        category_text = ", ".join([f"{cat}: {score}%" for cat, score in sorted(category_breakdown.items(), key=lambda x: x[1], reverse=True)[:3]])
        
        return {
            "success": True,
            "top_prediction": {
                "label": top_predictions[0]["label"] if top_predictions else "unknown",
                "confidence": round(top_predictions[0]["score"] * 100, 1) if top_predictions else 0
            },
            "category_breakdown": category_breakdown,
            "top_category": {
                "category": top_category[0],
                "percentage": top_category[1]
            },
            "summary": f"Primary category: {top_category[0]} ({top_category[1]}%)",
            "detailed_summary": f"Content breakdown: {category_text}" if category_text else "Unable to categorize content",
            "raw_predictions": top_predictions[:5]  # Include top 5 raw predictions
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Classification error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Classification error: {str(e)}")

@app.post("/analyze")
async def full_analysis(file: UploadFile = File(...)):
    """
    Combined analysis: Object detection + Image classification
    """
    try:
        # Validate file
        if not file.content_type or not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Read and process image
        image_data = await file.read()
        image = Image.open(io.BytesIO(image_data))
        image = process_image(image)
        
        # Get base64 for API calls
        image_b64 = encode_image_to_base64(image)
        
        results = {
            "success": True,
            "image_info": {
                "size": image.size,
                "mode": image.mode
            }
        }
        
        # Object Detection
        try:
            detection_payload = {
                "inputs": image_b64,
                "parameters": {"threshold": 0.3}
            }
            
            detection_response = requests.post(
                OBJECT_DETECTION_URL,
                headers=headers,
                json=detection_payload,
                timeout=30
            )
            
            if detection_response.status_code == 200:
                detections = detection_response.json()
                if isinstance(detections, list):
                    object_counts = {}
                    filtered_detections = []
                    
                    for detection in detections:
                        if isinstance(detection, dict) and detection.get("score", 0) > 0.3:
                            label = detection.get("label", "unknown")
                            object_counts[label] = object_counts.get(label, 0) + 1
                            filtered_detections.append({
                                "label": label,
                                "confidence": round(detection.get("score", 0), 3),
                                "box": detection.get("box", {})
                            })
                    
                    results["object_detection"] = {
                        "success": True,
                        "total_objects": len(filtered_detections),
                        "detections": filtered_detections,
                        "object_counts": object_counts
                    }
                else:
                    results["object_detection"] = {"success": False, "error": "Invalid detection response"}
            else:
                results["object_detection"] = {"success": False, "error": f"Detection API error: {detection_response.status_code}"}
        except Exception as e:
            results["object_detection"] = {"success": False, "error": str(e)}
        
        # Image Classification
        try:
            classification_payload = {"inputs": image_b64}
            
            classification_response = requests.post(
                IMAGE_CLASSIFICATION_URL,
                headers=headers,
                json=classification_payload,
                timeout=30
            )
            
            if classification_response.status_code == 200:
                classifications = classification_response.json()
                if isinstance(classifications, list):
                    top_predictions = classifications[:10]
                    category_breakdown = categorize_classification_labels(top_predictions)
                    top_category = max(category_breakdown.items(), key=lambda x: x[1]) if category_breakdown else ("unknown", 0)
                    
                    results["image_classification"] = {
                        "success": True,
                        "top_prediction": {
                            "label": top_predictions[0]["label"] if top_predictions else "unknown",
                            "confidence": round(top_predictions[0]["score"] * 100, 1) if top_predictions else 0
                        },
                        "category_breakdown": category_breakdown,
                        "top_category": {
                            "category": top_category[0],
                            "percentage": top_category[1]
                        }
                    }
                else:
                    results["image_classification"] = {"success": False, "error": "Invalid classification response"}
            else:
                results["image_classification"] = {"success": False, "error": f"Classification API error: {classification_response.status_code}"}
        except Exception as e:
            results["image_classification"] = {"success": False, "error": str(e)}
        
        return results
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis error: {str(e)}")

# Health check endpoint for Render deployment
@app.get("/ping")
async def ping():
    """Simple ping endpoint for health checks"""
    return {"status": "pong"}

if __name__ == "__main__":
    import uvicorn
    # Use PORT environment variable for Render deployment
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
