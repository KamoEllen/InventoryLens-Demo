<!--render-https://inventorylens-demo.onrender.com
netlify - https://inventoryanalysis-ai.netlify.app/ -->

## Table of Contents

1. [Key Features](#key-features)
2. [Tech Stack](#tech-stack)
3. [Architecture](#architecture)
4. [Project Structure](#project-structure)
5. [Setup](#setup)

   * [Backend](#backend)
   * [Frontend](#frontend)
6. [API Endpoints](#api-endpoints)
7. [Improvements](#improvements)

---

## Key Features

* **AI Object Detection** using HuggingFace DETR ResNet-50
* **Drag & Drop UI** with sample image gallery
* **Exportable Reports** (TXT) with object counts and metadata
* **Analysis History** with timestamps and cached results

---

## Tech Stack

| Layer         | Technology                                |
| ------------- | ----------------------------------------- |
| Frontend      | React 18, Tailwind CSS                    |
| Backend       | FastAPI, Python 3.8+                      |
| AI Processing | HuggingFace Inference API, DETR ResNet-50 |
| Deployment    | Render (Backend), Netlify (Frontend)      |

---

## Architecture

### High-Level System Architecture

![InventoryLens Architecture Diagram](https://github.com/KamoEllen/InventoryLens-Demo/blob/master/diagram-img.png)

**System Overview**

* **Frontend (React 18)**
  Handles image upload, previews, triggering analysis, result display, and report export.

* **Backend (FastAPI)**
  Receives image uploads, validates input, orchestrates AI inference, parses results, and returns structured JSON.

* **AI Processing (HuggingFace API)**
  DETR ResNet-50 model performs object detection and returns bounding boxes, labels, and confidence scores.

* **Deployment**
  Frontend deployed on Netlify, Backend on Render, AI inference via HuggingFace API.

---

### Frontend Flow (Textual)

1. User uploads an image via drag-and-drop or selects a sample image
2. Client performs format validation and preview rendering
3. User triggers analysis
4. Frontend sends image to backend (`/detect` or `/analyze`)
5. Results are rendered:

   * Object counts
   * Confidence metrics
   * Category breakdown
6. User can:

   * Export TXT report
   * Review previous analyses (history)

---

### Backend Flow (Textual)

1. FastAPI receives image upload request
2. Image processing pipeline:

   * Format normalization (PIL)
   * Resize & encode (Base64)
3. Request forwarded to HuggingFace Inference API
4. AI returns detection results
5. Backend:

   * Parses response
   * Normalizes output schema
   * Handles errors & rate limits
6. Structured JSON response returned to frontend

---

## Project Structure

```
inventorylens/
├── frontend/          # React application
│   ├── src/App.js     # Main UI logic
│   └── public/        # Static assets
├── backend/           # FastAPI backend
│   ├── main.py        # API routes & orchestration
│   └── requirements.txt
└── README.md
```

---

## Setup

### Backend

```bash
cd backend
pip install -r requirements.txt
echo "HUGGINGFACE_API_KEY=your_key" > .env
python start_backend.py
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## API Endpoints

| Endpoint   | Method | Description                 |
| ---------- | ------ | --------------------------- |
| `/detect`  | POST   | Object detection            |
| `/analyze` | POST   | Full analysis with metadata |

**Sample Response**

```json
{
  "success": true,
  "object_counts": { "bottle": 3 },
  "detections": [
    {
      "label": "bottle",
      "confidence": 0.92,
      "box": { "xmin": 100, "ymin": 50 }
    }
  ]
}
```

