<!--render-https://inventorylens-demo.onrender.com
netlify - https://inventoryanalysis-ai.netlify.app/ -->
## Table of Contents

1. [Key Features](#key-features)
2. [Tech Stack](#tech-stack)
3. [Architecture](#architecture)

   * [Frontend Flow](#frontend-flow)
   * [Backend Flow](#backend-flow)
4. [Project Structure](#project-structure)
5. [Setup](#setup)

   * [Backend](#backend)
   * [Frontend](#frontend)
6. [API Endpoints](#api-endpoints)
7. [Improvements](#improvements)

---

## Key Features

* **AI Object Detection:** Uses HuggingFace DETR ResNet-50
* **Drag & Drop UI:** Upload images or select from sample images
* **Export Reports:** Generate TXT reports with object counts and positions
* **Analysis History:** Track past scans with timestamps and cached results

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

### High-Level Overview

![InventoryLens Architecture](https://github.com/KamoEllen/InventoryLens-Demo/blob/master/readme-images/lens.png)

* **Frontend:** React 18 + Tailwind CSS handles upload, preview, analysis, and report generation
* **Backend:** FastAPI receives uploads, calls HuggingFace API, processes results, and returns structured JSON
* **AI Integration:** DETR ResNet-50 detects objects in images
* **Deployment:** Frontend on Netlify, Backend on Render, AI via HuggingFace API

---

### Frontend Flow

![Frontend Flow](https://github.com/KamoEllen/InventoryLens-Demo/blob/master/readme-images/2.png)

**React Architecture (Frontend 18+)**

* **Upload Zone & Drag & Drop Interface**

  * Click or drag files to upload
  * Format validation and live preview

* **Sample Gallery:** Quick access to four test images

* **Results Panel:**

  * Object counts, category breakdown
  * Confidence metrics & visual charts

* **Analysis Controls:**

  * Analysis button triggers API call
  * History tracker shows last 10 analyses with timestamps
  * Export manager generates TXT/CSV reports

* **State Management:** Loading states, error handling, API orchestration, user feedback

---

### Backend Flow

![Backend Flow](https://github.com/KamoEllen/InventoryLens-Demo/blob/master/readme-images/1.png)

**FastAPI Services**

* **API Routes**

  * `GET /health` – Health check
  * `POST /detect` – Object detection
  * `POST /analyze` – Full analysis with metadata

* **Image Processor**

  * PIL-based resizing & format conversion
  * Base64 encoding for AI processing

* **AI Integration**

  * HuggingFace API client with token authentication
  * Rate limiting & error handling

* **Error & Response Management**

  * CORS handler for dev/prod origins
  * Consistent JSON schema, formatted object counts
  * HTTP error recovery and logging

---

## Project Structure

```
inventorylens/
├── frontend/          # React app
│   ├── src/App.js     # Main component
│   └── public/       # Static assets
├── backend/           # FastAPI server
│   ├── main.py        # API & core logic
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

| Endpoint   | Method | Description                   |
| ---------- | ------ | ----------------------------- |
| `/detect`  | POST   | Single image object detection |
| `/analyze` | POST   | Full analysis with metadata   |

**Sample Response:**

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

---

## Improvements

1. **Streamlined Architecture:** Unified Frontend/Backend flows with diagrams
2. **Enhanced UX:** Drag & Drop, live preview, sample gallery
3. **Error Management:** Centralized backend handling with CORS, rate limiting, logging
4. **Export Options:** TXT/CSV report generation
5. **History Tracking:** Cached results with timestamps
