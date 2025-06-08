import React, { useState, useRef } from 'react';
import './App.css';
import image1 from './images/1.jpg';
import image2 from './images/2.jpg';
import image3 from './images/3.jpg';
import image4 from './images/4.jpg';


// configure base URL for backend depending on development or production mode
// ---------- Local Development (Non ACTIVE) ----------
//const API_BASE_URL = 'http://localhost:8000';

// ---------- Production ----------
 const API_BASE_URL = process.env.NODE_ENV === 'production' 
   ? 'https://inventorylens-demo.onrender.com'  
   : 'http://localhost:8000';


const sampleImages = [
  {
    id: 1,
    src: image1,  
    name: 'Sample Image 1',
    description: 'Test inventory image'
  },
  {
    id: 2,
    src: image2,
    name: 'Sample Image 2',
    description: 'Test inventory image'
  },
  {
    id: 3,
    src: image3,
    name: 'Sample Image 3',
    description: 'Test inventory image'
  },
  {
    id: 4,
    src: image4,
    name: 'Sample Image 4',
    description: 'Test inventory image'
  }
];

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [detectionResults, setDetectionResults] = useState(null);
  const [analysisHistory, setAnalysisHistory] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [draggedImage, setDraggedImage] = useState(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      setError('');
      
      
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
      
      
      setDetectionResults(null);
    }
  };

  const handleSampleImageSelect = async (imageSrc, imageName) => {
    try {
      
      const response = await fetch(imageSrc);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
      }
      const blob = await response.blob();
      
     
      const file = new File([blob], imageName, { type: blob.type });
      
      setSelectedFile(file);
      setImagePreview(imageSrc);
      setDetectionResults(null);
      setError('');
    } catch (error) {
      setError(`Failed to load sample image: ${error.message}`);
      console.error('Sample image loading error:', error);
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    setIsDraggingOver(false);
  };

 
  const handleGalleryDragStart = (event, image) => {
    setDraggedImage(image);
    event.dataTransfer.effectAllowed = 'copy';
    event.dataTransfer.setData('text/plain', '');
  };

  const handleGalleryDragEnd = () => {
    setDraggedImage(null);
  };

  const handleUploadAreaDrop = async (event) => { //handling image from user , from file system or gallery
    event.preventDefault();
    setIsDraggingOver(false);
    
    // Check if it's a file from the file system
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        setSelectedFile(file);
        
        const reader = new FileReader();
        reader.onload = (e) => {
          setImagePreview(e.target.result);
        };
        reader.readAsDataURL(file);
        
        setDetectionResults(null);
        setError('');
      } else {
        setError('Please upload an image file');
      }
    } 
    // Check if it's a dragged image from the gallery
    else if (draggedImage) {
      await handleSampleImageSelect(draggedImage.src, draggedImage.name);
    }
  };
// sends the selected image to the backend and get object detection results
  const runFullAnalysis = async () => {
    if (!selectedFile) {
      setError('Please select an image first');
      return;
    }

    setIsAnalyzing(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      console.log('Making request to:', `${API_BASE_URL}/analyze`);

      const response = await fetch(`${API_BASE_URL}/analyze`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        if (data.object_detection?.success) {
          setDetectionResults(data.object_detection);
          
          const newAnalysis = {
            filename: selectedFile.name,
            timestamp: new Date().toLocaleString(),
            date: new Date().toISOString(),
            detection: data.object_detection,
            type: 'full_analysis'
          };
          setAnalysisHistory(prev => [newAnalysis, ...prev.slice(0, 9)]);
        }
      } else {
        setError(data.detail || 'Analysis failed');
      }
    } catch (err) {
      setError(`Network error: ${err.message}. Check if backend is running at ${API_BASE_URL}`);
      console.error('Analysis error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  //export current and past analysis results as a downloadable text file
  const exportToTXT = () => {
    let txtContent = '';
    
    // Header
    txtContent += '========================================\n';
    txtContent += '       INVENTORYLENS AI REPORT\n';
    txtContent += '========================================\n';
    txtContent += `Generated: ${new Date().toLocaleString()}\n\n`;

    // Current Analysis Results
    if (detectionResults) {
      txtContent += '--- CURRENT ANALYSIS RESULTS ---\n';
      txtContent += `Image: ${selectedFile?.name || 'Unknown'}\n`;
      txtContent += `Total Objects Found: ${detectionResults.total_objects}\n`;
      txtContent += `Analysis Summary: ${detectionResults.summary}\n\n`;

      // Object Counts
      if (detectionResults.object_counts && Object.keys(detectionResults.object_counts).length > 0) {
        txtContent += 'OBJECT SUMMARY BY TYPE:\n';
        txtContent += '-'.repeat(40) + '\n';
        Object.entries(detectionResults.object_counts).forEach(([label, count]) => {
          const percentage = ((count / detectionResults.total_objects) * 100).toFixed(1);
          txtContent += `${label.padEnd(20)} : ${count.toString().padStart(3)} (${percentage}%)\n`;
        });
        txtContent += '\n';
      }

      // Detailed Detections
      if (detectionResults.detections && detectionResults.detections.length > 0) {
        txtContent += 'DETAILED OBJECT DETECTIONS:\n';
        txtContent += '-'.repeat(60) + '\n';
        txtContent += '#'.padEnd(4) + 'Object Type'.padEnd(20) + 'Confidence'.padEnd(12) + 'Position\n';
        txtContent += '-'.repeat(60) + '\n';
        
        detectionResults.detections.forEach((detection, index) => {
          const position = detection.box ? 
            `X:${Math.round(detection.box.xmin || 0)}, Y:${Math.round(detection.box.ymin || 0)}` : 
            'N/A';
          
          txtContent += `${(index + 1).toString().padEnd(4)}${detection.label.padEnd(20)}${(detection.confidence * 100).toFixed(1).padEnd(10)}%  ${position}\n`;
        });
        txtContent += '\n';
      }
    }

    // Analysis History
    if (analysisHistory.length > 0) {
      txtContent += '--- ANALYSIS HISTORY ---\n';
      txtContent += `Total Analyses Performed: ${analysisHistory.length}\n\n`;
      
      analysisHistory.forEach((analysis, index) => {
        txtContent += `${index + 1}. ${analysis.filename}\n`;
        txtContent += `   Date: ${analysis.timestamp}\n`;
        txtContent += `   Type: ${analysis.type === 'full_analysis' ? 'Full Analysis' : 'Object Detection'}\n`;
        txtContent += `   Objects Found: ${analysis.detection?.total_objects || 0}\n`;
        
        if (analysis.detection?.object_counts) {
          txtContent += '   Object Types: ';
          const types = Object.entries(analysis.detection.object_counts)
            .map(([type, count]) => `${type}(${count})`)
            .join(', ');
          txtContent += types + '\n';
        }
        txtContent += '\n';
      });

      // Summary Statistics
      txtContent += '--- SUMMARY STATISTICS ---\n';
      const totalObjects = analysisHistory.reduce((sum, analysis) => 
        sum + (analysis.detection?.total_objects || 0), 0);
      txtContent += `Total Objects Analyzed: ${totalObjects}\n`;
      txtContent += `Average Objects per Image: ${analysisHistory.length > 0 ? 
        (totalObjects / analysisHistory.length).toFixed(1) : 0}\n`;
      
      // Most common objects
      const allObjectCounts = {};
      analysisHistory.forEach(analysis => {
        if (analysis.detection?.object_counts) {
          Object.entries(analysis.detection.object_counts).forEach(([type, count]) => {
            allObjectCounts[type] = (allObjectCounts[type] || 0) + count;
          });
        }
      });
      
      if (Object.keys(allObjectCounts).length > 0) {
        const sortedObjects = Object.entries(allObjectCounts)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 5);
        
        txtContent += '\nMost Common Object Types:\n';
        sortedObjects.forEach(([type, count], index) => {
          txtContent += `${index + 1}. ${type}: ${count} times\n`;
        });
      }
    }

    txtContent += '\n========================================\n';
    txtContent += 'Report generated by InventoryLens AI\n';
    txtContent += '========================================\n';

    // Create and download the file
    const blob = new Blob([txtContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `InventoryLens-Report-${new Date().toISOString().split('T')[0]}-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            InventoryLens Object Detection
          </h1>
          <p className="text-lg text-gray-600">
            AI-powered object detection for inventory analysis
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            <div className="flex items-center">
              <span className="mr-2">⚠️</span>
              {error}
            </div>
          </div>
        )}

        {/* Main Layout - Two Column */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          <div className="lg:col-span-3 space-y-6">
            
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <span className="mr-2">-</span>
                Upload Image
              </h2>
              
              {/* Upload Area */}
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isDraggingOver 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-300 hover:border-blue-400'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleUploadAreaDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="flex flex-col items-center">
                  <span className="text-4xl mb-2">
                    {isDraggingOver ? '🎯' : '📤'}
                  </span>
                  <p className="text-gray-600 mb-2">
                    {isDraggingOver 
                      ? 'Drop your image here!' 
                      : 'Drag & drop an image here, or click to select'
                    }
                  </p>
                  <p className="text-sm text-gray-400">
                    Supports JPG, PNG, WEBP • Or drag from sample gallery
                  </p>
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />

              {/* shows preview of selected or dropped image */}
              {imagePreview && (
                <div className="mt-4">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full max-h-64 object-contain rounded border"
                  />
                  <p className="text-sm text-gray-500 mt-2">
                    File: {selectedFile?.name}
                  </p>
                </div>
              )}
            </div>

            {/* Analysis Actions */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <span className="mr-2">-</span>
                Analysis Actions
              </h2>
              
              <div className="space-y-3">
                {/*  button ui to trigger full analysis request */}
                <button
                
                  onClick={runFullAnalysis}
                  disabled={!selectedFile || isAnalyzing}
                  className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isAnalyzing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Running Analysis...
                    </>
                  ) : (
                    <>
                      <span className="mr-2">-</span>
                      Full Analysis
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Object Detection Results */}
            {detectionResults && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center">
                  <span className="mr-2">-</span>
                  Object Detection Results
                </h2>
                
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-blue-700 mb-3 font-medium">
                    {detectionResults.summary}
                  </p>
                  
                  {Object.entries(detectionResults.object_counts).length > 0 && (
                    <div className="space-y-1">
                      <p className="font-semibold text-blue-800">Object Counts:</p>
                      {Object.entries(detectionResults.object_counts).map(([label, count]) => (
                        <div key={label} className="flex justify-between text-sm bg-white rounded px-2 py-1">
                          <span className="capitalize">{label}</span>
                          <span className="font-medium text-blue-600">{count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Analysis History */}
            {analysisHistory.length > 0 && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center">
                  <span className="mr-2">-</span>
                  Analysis History
                </h2>
                
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {analysisHistory.map((analysis, index) => (
                    <div key={index} className="bg-gray-50 p-3 rounded-lg border-l-4 border-blue-400">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-600">
                          {analysis.filename}
                        </span>
                        <span className="text-xs text-gray-400">
                          {analysis.timestamp}
                        </span>
                      </div>
                      
                      {analysis.detection && (
                        <div className="text-sm">
                          <p className="text-gray-700">
                            <span className="font-medium">Objects Found:</span> {analysis.detection.total_objects}
                          </p>
                          <p className="text-gray-600 text-xs mt-1">
                            Types: {Object.keys(analysis.detection.object_counts || {}).join(', ')}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            
          </div>

          
         
         
          <div className="space-y-6">
            {/* Analysis History */}
            {analysisHistory.length > 0 && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center">
                  <span className="mr-2">-</span>
                  Analysis History
                </h2>
                
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {analysisHistory.map((analysis, index) => (
                    <div key={index} className="bg-gray-50 p-3 rounded-lg border-l-4 border-blue-400">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-600">
                          {analysis.filename}
                        </span>
                        <span className="text-xs text-gray-400">
                          {analysis.timestamp}
                        </span>
                      </div>
                      
                      {analysis.detection && (
                        <div className="text-sm">
                          <p className="text-gray-700">
                            <span className="font-medium">Objects Found:</span> {analysis.detection.total_objects}
                          </p>
                          <p className="text-gray-600 text-xs mt-1">
                            Types: {Object.keys(analysis.detection.object_counts || {}).join(', ')}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Export Results */}
            {(detectionResults || analysisHistory.length > 0) && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center">
                  <span className="mr-2">-</span>
                  Export Results
                </h2>
                <div className="space-y-3">
                  <button
                    onClick={exportToTXT}
                    className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 flex items-center justify-center"
                  >
                    <span className="mr-2">-</span>
                    Download Text Report
                  </button>
                </div>
              </div>
            )}
          </div>

        
<div className="lg:w-1/2 lg:max-w-xs">
  <div className="bg-white rounded-lg shadow-lg p-3 sticky top-4">
    <h2 className="text-sm font-semibold mb-2 flex items-center">
      <span className="mr-1">-</span>
      Sample Images
    </h2>
    <p className="text-gray-600 mb-3 text-xs">
      Click or drag to upload
    </p>

    {/*  clickable and draggable gallery of test images */}
    <div className="w-[240px] h-[60px] mx-auto border border-gray-200 rounded-lg p-0 bg-gray-50">
     <div className="w-full h-full flex overflow-hidden rounded-lg">
        {sampleImages.map((image, index) => (
          <div
            key={image.id}
            className="flex-1 h-full cursor-pointer overflow-hidden hover:border-blue-400 transition-all duration-200 hover:scale-105 bg-white relative"
            style={{
              borderTopLeftRadius: index === 0 ? '0.5rem' : '0',
              borderBottomLeftRadius: index === 0 ? '0.5rem' : '0',
              borderTopRightRadius: index === sampleImages.length - 1 ? '0.5rem' : '0',
              borderBottomRightRadius: index === sampleImages.length - 1 ? '0.5rem' : '0'
            }}
            draggable
            onDragStart={(e) => handleGalleryDragStart(e, image)}
            onDragEnd={handleGalleryDragEnd}
            onClick={() => handleSampleImageSelect(image.src, image.name)}
          >
            <img
              src={image.src}
              alt={image.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.src = `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'><rect width='60' height='60' fill='%23f5f5f5' stroke='%23ddd'/><text x='30' y='35' text-anchor='middle' font-size='10' fill='%23999'>${image.id}</text></svg>`;
              }}
            />
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-blue-500 bg-opacity-0 hover:bg-opacity-20 transition-opacity duration-200 flex items-center justify-center">
              <span className="text-white text-xs font-bold opacity-0 hover:opacity-100 transition-opacity duration-200">
                {image.id}
              </span>
            </div>
            {/* Drag */}
            {draggedImage?.id === image.id && (
              <div className="absolute inset-0 border-2 border-blue-500 bg-blue-200 bg-opacity-30"></div>
            )}
          </div>
        ))}
      </div>
    </div>

    {/* Compact tip */}
    <div className="mt-2 p-1 bg-blue-50 rounded text-xs text-blue-700 text-center">
       Drag to upload area
    </div>
  </div>

  {/* Analysis History */}
  {analysisHistory.length > 0 && (
    <div className="bg-white rounded-lg shadow-lg p-3 mt-3">
      <h2 className="text-sm font-semibold mb-2 flex items-center">
        <span className="mr-1">📈</span>
        Recent Analysis
      </h2>

      <div className="space-y-1 max-h-48 overflow-y-auto">
        {analysisHistory.slice(0, 3).map((analysis, index) => (
          <div key={index} className="bg-gray-50 p-2 rounded border-l-2 border-green-400">
            <div className="text-xs font-medium text-gray-700 truncate">
              {analysis.filename}
            </div>
            <div className="text-xs text-gray-500">
              Objects: {analysis.detection?.total_objects || 0}
            </div>
          </div>
        ))}
      </div>

      {analysisHistory.length > 3 && (
        <div className="text-xs text-gray-400 mt-1 text-center">
          +{analysisHistory.length - 3} more
        </div>
      )}
    </div>
  )}
</div>
        </div>

        {/* step: footer showing model name and app info */}
        <div className="text-center mt-12 text-gray-500">
          <p>
            InventoryLens Object Detection
          </p>
          <p className="text-sm mt-1">
            Object Detection: facebook/detr-resnet-50
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
