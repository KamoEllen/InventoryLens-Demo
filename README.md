# InventoryLens AI 

**AI-Powered Object Detection for Inventory Analysis**

InventoryLens AI is a modern web application that combines computer vision and artificial intelligence to automatically detect and analyze objects in inventory images. Built with React frontend and FastAPI backend, it provides real-time object detection, detailed analysis reports, and comprehensive inventory insights.

##  Features

### Core Functionality
- **Real-time Object Detection**: Powered by Facebook's DETR ResNet-50 model via HuggingFace
- **Drag & Drop Interface**: Intuitive image upload with drag-and-drop support
- **Sample Gallery**: Pre-loaded test images for quick demonstrations
- **Analysis History**: Track and review past detection results
- **Export Reports**: Generate detailed text reports of analysis results

##  Architecture

### Data Flow Architecture
```
USER INTERACTION FLOW
═══════════════════════════════════════════════════════════════════════════════

1. IMAGE UPLOAD
   ┌─────────────┐    Select/Drop    ┌─────────────────┐    File Validation
   │    User     │ ─────────────────► │  Upload Area    │ ──────────────────┐
   └─────────────┘                   └─────────────────┘                   │
                                                                           ▼
2. IMAGE PROCESSING                                            ┌─────────────────┐
   ┌─────────────────┐    Convert    ┌─────────────────┐      │ Format Check    │
   │  File Reader    │ ─────────────► │  Image Preview  │      │ • JPG/PNG/WEBP │
   └─────────────────┘               └─────────────────┘      │ • Size Limit    │
                                                              └─────────────────┘

3. ANALYSIS REQUEST
   ┌─────────────────┐    FormData   ┌─────────────────┐    HTTP POST
   │  Analyze Button │ ─────────────► │  FastAPI /analyze│ ──────────────────┐
   └─────────────────┘               └─────────────────┘                   │
                                                                           ▼
4. BACKEND PROCESSING                                           ┌─────────────────┐
   ┌─────────────────┐    Process    ┌─────────────────┐        │ PIL Processing  │
   │  Image Upload   │ ─────────────► │  Image Handler  │        │ • RGB Convert   │
   └─────────────────┘               └─────────────────┘        │ • Resize 800px  │
                                             │                  │ • Quality 90%   │
                                             ▼                  └─────────────────┘
                                    ┌─────────────────┐
                                    │ Base64 Encoder  │
                                    └─────────────────┘
                                             │
                                             ▼
5. AI INFERENCE
   ┌─────────────────┐    API Call   ┌─────────────────┐    JSON Response
   │ HuggingFace API │ ◄─────────────│  Request Handler│ ──────────────────┐
   └─────────────────┘               └─────────────────┘                   │
           │                                                               │
           ▼                                                               ▼
   ┌─────────────────┐              ┌─────────────────────────────────────────┐
   │ DETR Model      │              │           DETECTION RESULTS             │
   │ • Confidence    │              │                                         │
   │ • Bounding Box  │              │  • Object Labels                       │
   │ • Classification│              │  • Confidence Scores                   │
   └─────────────────┘              │  • Bounding Coordinates                │
                                    │  • Object Counts                       │
                                    └─────────────────────────────────────────┘

6. RESULTS PROCESSING
   ┌─────────────────┐    Filter     ┌─────────────────┐    JSON Response
   │ Raw Detections  │ ─────────────► │ Result Processor│ ──────────────────┐
   └─────────────────┘               └─────────────────┘                   │
                                                                           ▼
7. FRONTEND DISPLAY                                             ┌─────────────────┐
   ┌─────────────────┐    Update     ┌─────────────────┐        │ Results Display │
   │ React State     │ ◄─────────────│  API Response   │        │ • Object Count  │
   └─────────────────┘               └─────────────────┘        │ • Categories    │
                                                                │ • Confidence    │
                                                                │ • Summary       │
                                                                └─────────────────┘
```

### Component Architecture

#### Frontend Components (React 18+)
```
┌─────────────────────────────────────────────────────────────────┐
│                       APP.JS MAIN COMPONENT                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  UPLOAD ZONE    │  │  SAMPLE GALLERY │  │  RESULTS PANEL  │ │
│  │                 │  │                 │  │                 │ │
│  │  • Drag & Drop  │  │  • 4 Test Images│  │  • Object Count │ │
│  │  • File Browser │  │  • Click Upload │  │  • Categories   │ │
│  │  • Format Check │  │  • Drag to Upload│  │  • Confidence   │ │
│  │  • Preview      │  │  • Hover Effects│  │  • Visual Data  │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ ANALYSIS BUTTON │  │ HISTORY TRACKER │  │ EXPORT MANAGER  │ │
│  │                 │  │                 │  │                 │ │
│  │  • Loading State│  │  • 10 Recent    │  │  • TXT Reports  │ │
│  │  • Error Handle │  │  • Timestamps   │  │  • Statistics   │ │
│  │  • API Calls    │  │  • Results Cache│  │  • History Data │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

#### Backend Services (FastAPI)
```
┌─────────────────────────────────────────────────────────────────┐
│                      MAIN.PY FASTAPI APP                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   API ROUTES    │  │ IMAGE PROCESSOR │  │  AI INTEGRATION │ │
│  │                 │  │                 │  │                 │ │
│  │  • GET /        │  │  • PIL Handler  │  │  • HF API Client│ │
│  │  • GET /health  │  │  • Format Conv  │  │  • Token Auth   │ │
│  │  • POST /detect │  │  • Resize Logic │  │  • Error Handle │ │
│  │  • POST /analyze│  │  • Base64 Encode│  │  • Rate Limiting│ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  CORS HANDLER   │  │ ERROR MANAGER   │  │ RESPONSE FORMAT │ │
│  │                 │  │                 │  │                 │ │
│  │  • Dev Origins  │  │  • HTTP Errors  │  │  • JSON Schema  │ │
│  │  • Prod Domains │  │  • API Failures │  │  • Success Data │ │
│  │  • Methods/Headers│  │  • User Messages│  │  • Object Counts│ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Technology Stack

**Frontend:**
- React 18+ with Hooks
- Tailwind CSS for styling
- File upload and drag-drop handling
- Responsive design components

**Backend:**
- FastAPI framework
- Python 3.8+
- PIL (Pillow) for image processing
- Requests for API communication
- CORS middleware for cross-origin requests

**AI/ML:**
- HuggingFace Inference API
- Facebook DETR (Detection Transformer) ResNet-50
- Base64 image encoding for API transmission

##  Quick Start

### Prerequisites
- **Node.js** 16+ and npm
- **Python** 3.8+
- **HuggingFace Account** (optional, for higher rate limits)

### Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The React app will be available at `http://localhost:3000`

### Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install Python dependencies
pip install -r requirements.txt

# Start the backend server
python start_backend.py
```

The API will be available at `http://localhost:8000`

### Environment Configuration

Create a `.env` file in the backend directory:

```env
# Optional: HuggingFace API token for higher rate limits
HUGGINGFACE_API_KEY=your_huggingface_token_here

# Optional: Netlify domain for production CORS
NETLIFY_DOMAIN=your-app-name
```

##  API Documentation

### Core Endpoints

#### `GET /`
Returns API status and available endpoints
```json
{
  "message": "InventoryLens AI Backend is running!",
  "status": "healthy",
  "version": "1.0.0",
  "endpoints": {
    "health": "/health",
    "object_detection": "/detect",
    "full_analysis": "/analyze"
  }
}
```

#### `POST /detect`
Performs object detection on uploaded image
- **Content-Type**: `multipart/form-data`
- **Parameters**: `file` (image file)
- **Response**: Detection results with object counts and confidence scores

#### `POST /analyze`
Comprehensive analysis including object detection and image metadata
- **Content-Type**: `multipart/form-data`
- **Parameters**: `file` (image file)
- **Response**: Complete analysis with detailed object information

#### `GET /health`
Health check endpoint for monitoring
```json
{
  "status": "healthy",
  "services": ["object_detection"],
  "huggingface_token": "configured"
}
```

### Response Format

```json
{
  "success": true,
  "total_objects": 15,
  "object_counts": {
    "person": 3,
    "car": 2,
    "bicycle": 1
  },
  "detections": [
    {
      "label": "person",
      "confidence": 0.892,
      "box": {
        "xmin": 100,
        "ymin": 50,
        "xmax": 200,
        "ymax": 300
      }
    }
  ],
  "summary": "Found 15 objects with 8 different types"
}
```

##  Development

### Project Structure

```
inventorylens-ai/
├── frontend/
│   ├── src/
│   │   ├── App.js          # Main React component
│   │   ├── App.css         # Styling
│   │   └── images/         # Sample images
│   ├── public/
│   └── package.json
├── backend/
│   ├── main.py             # FastAPI application
│   ├── start_backend.py    # Backend launcher
│   ├── run_backend.py      # Alternative launcher
│   ├── requirements.txt    # Python dependencies
│   └── .env               # Environment variables
└── README.md
```

### Development Scripts

**Frontend:**
```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
```

**Backend:**
```bash
python start_backend.py    # Start with simplified launcher
python run_backend.py      # Start with detailed checks
python -m uvicorn main:app --reload  # Direct uvicorn start
```

### Code Quality

The project follows these conventions:
- **React**: Functional components with hooks
- **Python**: PEP 8 style guidelines
- **API**: RESTful design principles
- **Error Handling**: Comprehensive error catching and user feedback
- **CORS**: Configured for both development and production environments

##  Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `HUGGINGFACE_API_KEY` | HuggingFace API token | None (rate limited) |
| `NETLIFY_DOMAIN` | Netlify app domain | None |
| `NODE_ENV` | Environment mode | development |

### CORS Configuration

The backend is configured for:
- **Development**: `localhost:3000`, `localhost:5173`
- **Production**: Configured domains in `allowed_origins`

### Image Processing

- **Supported formats**: JPG, PNG, WEBP
- **Maximum resolution**: 800px (auto-resized)
- **Quality**: 90% JPEG compression
- **Color space**: RGB conversion for consistency

##  Features Deep Dive

### Object Detection
- Uses Facebook's DETR (Detection Transformer) ResNet-50 model
- Confidence threshold: 0.3 (30%)
- Real-time processing with visual feedback
- Detailed bounding box coordinates

### Analysis History
- Stores up to 10 recent analyses
- Includes timestamps and object summaries
- Exportable to detailed text reports
- Object type frequency tracking

### Export Functionality
- Comprehensive text reports
- Analysis statistics and summaries
- Object detection details with confidence scores
- Historical analysis overview

### User Interface
- Responsive design for all screen sizes
- Drag-and-drop image upload
- Sample image gallery with click-to-select
- Real-time analysis progress indicators
- Error handling with user-friendly messages

##  Deployment

### Production Deployment

**Frontend (Netlify):**
1. Build the React app: `npm run build`
2. Deploy the `dist` folder to Netlify
3. Configure environment variables in Netlify dashboard

**Backend (Render/Railway):**
1. Push code to Git repository
2. Configure environment variables
3. Set start command: `python start_backend.py`

<!-- ### Docker Support

```dockerfile
# Backend Dockerfile
FROM python:3.9-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["python", "start_backend.py"]
``` -->

##  Troubleshooting

### Common Issues

**"Import Error" on Backend Start:**
```bash
pip install -r requirements.txt
```

**CORS Errors:**
- Check `allowed_origins` in `main.py`
- Verify frontend URL matches backend configuration

**Rate Limiting:**
- Add HuggingFace API token to `.env` file
- Check HuggingFace API status

**Image Upload Fails:**
- Verify image format (JPG, PNG, WEBP)
- Check image size and network connection
- Review browser console for error details

### Debug Mode

Enable detailed logging:
```bash
export LOG_LEVEL=DEBUG
python start_backend.py
```

##  Contributing

1. Fork the repository
2. Create a feature branch: 
3. Make your changes
4. Test thoroughly
5. Submit a pull request

<!-- ### Development Guidelines

- Follow existing code style
- Add comments for complex logic
- Test API endpoints thoroughly
- Ensure responsive design on frontend
- Update documentation for new features -->


<!-- ## 🙏 Acknowledgments

- **HuggingFace** for providing the inference API
- **Facebook Research** for the DETR model
- **FastAPI** and **React** communities for excellent frameworks
- **Tailwind CSS** for the styling framework

## 📞 Support

For issues and questions:
- Open a GitHub issue
- Check the troubleshooting section
- Review API documentation at `/docs` endpoint -->

---

**InventoryLens AI** - Transforming inventory management through computer vision 🤝

<!--git clone https://github.com/KamoEllen/InventoryLens-Demo.git
cd InventoryLens-Demo                                     echo backend/.env >> .gitignore
 git add .
git commit -m "Clean push without secrets"
git push origin main --force
-->
