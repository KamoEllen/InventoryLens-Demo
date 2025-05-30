from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import requests
import base64
import io
from PIL import Image
import os
from typing import List, Dict, Any
import json
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

app = FastAPI(title="InventoryLens AI", version="1.0.0")

# ========== CORS Configuration ==========

# ---------- Local Development (ACTIVE) ----------
#allowed_origins = [
 #   "http://localhost:5173",  # Vite React dev server
#     "http://localhost:3000",  # Create React App dev server
#     "http://127.0.0.1:5173",  # Alternative localhost
#     "http://127.0.0.1:3000",  # Alternative localhost
# ]

# ---------- Production (COMMENTED OUT) ----------
allowed_origins = [
    "https://inventorylens-demo.onrender.com",  # Your Render backend
    "https://inventoryanalysis-ai.netlify.app",  # Your Netlify frontend
]

# Add additional Netlify domain patterns for production
netlify_domain = os.getenv("NETLIFY_DOMAIN", "inventoryanalysis-ai")
if netlify_domain:
    allowed_origins.append(f"https://{netlify_domain}.netlify.app")
    allowed_origins.append(f"https://deploy-preview-*--{netlify_domain}.netlify.app")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ========== API Configuration ==========

# HuggingFace API configuration
HF_API_TOKEN = os.getenv("HUGGINGFACE_API_KEY", "")
OBJECT_DETECTION_URL = "https://api-inference.huggingface.co/models/facebook/detr-resnet-50"

# Setup headers with authentication
headers = {
    "Content-Type": "application/json"
}
if HF_API_TOKEN and HF_API_TOKEN != "your_huggingface_token_here":
    headers["Authorization"] = f"Bearer {HF_API_TOKEN}"
    print(f"✅ Using HuggingFace API token: {HF_API_TOKEN[:10]}...")
else:
    print("⚠️  No valid HuggingFace API token found - using public inference (may be rate limited)")

# ========== Helper Functions ==========

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
    max_size = 800  # Reduced for better API compatibility
    if max(image.size) > max_size:
        ratio = max_size / max(image.size)
        new_size = tuple(int(dim * ratio) for dim in image.size)
        image = image.resize(new_size, Image.Resampling.LANCZOS)
    
    return image

# ========== API Endpoints ==========

@app.get("/")
async def root():
    """Root endpoint with deployment info"""
    return {
        "message": "InventoryLens AI Backend is running!", 
        "status": "healthy",
        "version": "1.0.0",
        "environment": "local_development",  # Change to "production" when deploying
        "endpoints": {
            "health": "/health",
            "object_detection": "/detect",
            "full_analysis": "/analyze"
        }
    }

@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring"""
    return {
        "status": "healthy", 
        "services": ["object_detection"],
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

@app.post("/analyze")
async def full_analysis(file: UploadFile = File(...)):
    """
    Full analysis: Object detection only (classification removed)
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
        
        # Object Detection only
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
                        "object_counts": object_counts,
                        "summary": f"Found {len(filtered_detections)} objects with {len(object_counts)} different types"
                    }
                else:
                    results["object_detection"] = {"success": False, "error": "Invalid detection response"}
            else:
                results["object_detection"] = {"success": False, "error": f"Detection API error: {detection_response.status_code}"}
        except Exception as e:
            results["object_detection"] = {"success": False, "error": str(e)}
        
        return results
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis error: {str(e)}")

# ========== Health Check for Deployment ==========

# ---------- Local Development (ACTIVE) ----------
@app.get("/ping")
async def ping():
    """Simple ping endpoint for health checks"""
    return {"status": "pong", "environment": "local"}

# ---------- Production (COMMENTED OUT) ----------
# @app.get("/ping")
# async def ping():
#     """Simple ping endpoint for health checks"""
#     return {"status": "pong", "environment": "production"}

# ========== Server Startup ==========

if __name__ == "__main__":
    import uvicorn
    
    # ---------- Local Development (ACTIVE) ----------
    port = 8000
    host = "0.0.0.0"
    
    # ---------- Production (COMMENTED OUT) ----------
    # port = int(os.getenv("PORT", 8000))
    # host = "0.0.0.0"
    
    print(f"🚀 Starting InventoryLens AI Backend on {host}:{port}")
    uvicorn.run(app, host=host, port=port)
