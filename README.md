<!--render-https://inventorylens-demo.onrender.com
netlify - https://inventoryanalysis-ai.netlify.app/ -->
    
# InventoryLens AI 

# InventoryLens: AI-Powered Inventory Analysis

![Demo](demo.gif) 
<!--
**Live Demos:**  
[Backend on Render](https://inventorylens-demo.onrender.com) | [Frontend on Netlify](https://inventoryanalysis-ai.netlify.app)
-->
##  Key Features
- **AI Object Detection**: Uses HuggingFace's DETR ResNet-50 model
- **Drag & Drop UI**: Upload images or select from samples
- **Export Reports**: Generate TXT reports with object counts/positions
- **Analysis History**: Track past scans with timestamps

## 🛠 Tech Stack
| Component       | Technologies                          |
|-----------------|---------------------------------------|
| **Frontend**    | React 18, Tailwind CSS                |
| **Backend**     | FastAPI, Python 3.8+                 |
| **AI**          | HuggingFace Inference API             |
| **Deployment**  | Render (Backend), Netlify (Frontend)  |

##  Project Structure
```
inventorylens/
├── frontend/          # React app
│   ├── src/App.js     # Main component
│   └── public/        # Static assets
├── backend/           # FastAPI server
│   ├── main.py        # Core logic
│   └── requirements.txt
└── README.md
```

##  Setup
1. **Backend**:
   ```bash
   cd backend
   pip install -r requirements.txt
   echo "HUGGINGFACE_API_KEY=your_key" > .env
   python start_backend.py
   ```

2. **Frontend**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

##  API Endpoints
| Endpoint | Method | Description                |
|----------|--------|----------------------------|
| `/detect`| POST   | Object detection           |
| `/analyze`| POST  | Full analysis with metadata|

**Example Response**:
```json
{
  "success": true,
  "object_counts": {"bottle": 3},
  "detections": [{
    "label": "bottle",
    "confidence": 0.92,
    "box": {"xmin": 100, "ymin": 50}
  }]
}
```

##  Architecture Diagrams

### Frontend Flow
```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'primaryColor': '#1a365d'}}}%%
flowchart TD
    A[App] --> B[ImageUpload]
    A --> C[ResultsDisplay]
    B --> D[useState]
    C --> E[ObjectTable]
```

### Backend Flow
```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'primaryColor': '#1a365d'}}}%%
flowchart LR
    A[FastAPI] --> B[/detect]
    B --> C[HuggingFace API]
    C --> D[Result Parser]
```

##  What's Accurate in Your Original:
- Core feature descriptions
- Tech stack listing
- API response format
- Setup instructions

##  Improvements Made:
1. **Fixed Mermaid Syntax**: Added missing `%%` in diagram declarations
2. **Removed Redundancies**: Consolidated duplicate architecture sections
3. **Simplified Setup**: Streamlined installation steps
4. **Better Formatting**: Consistent headers and table layouts
5. **Removed Placeholders**: Replaced generic "demo.gif" note

##  Suggested Additions:
1. **Error Handling Section**:
   ```markdown
   ##  Common Issues
   - CORS Errors: Verify `allowed_origins` in `main.py`
   - Rate Limiting: Add HuggingFace API key
   ```

2. **Docker Support** (if applicable):
   ```dockerfile
   # backend/Dockerfile
   FROM python:3.9
   COPY requirements.txt .
   RUN pip install -r requirements.txt
   CMD ["python", "start_backend.py"]
   ```


