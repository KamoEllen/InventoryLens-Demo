import React, { useState, useRef } from 'react';
import './App.css';

// Updated API configuration for production deployment
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://inventorylens-demo.onrender.com'  // Your Render backend URL
  : 'http://localhost:8000'; // Local development

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [detectionResults, setDetectionResults] = useState(null);
  const [classificationResults, setClassificationResults] = useState(null);
  const [analysisHistory, setAnalysisHistory] = useState([]);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isClassifying, setIsClassifying] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      setError('');
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
      
      // Reset previous results
      setDetectionResults(null);
      setClassificationResults(null);
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  const handleDrop = (event) => {
    event.preventDefault();
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
        setClassificationResults(null);
        setError('');
      } else {
        setError('Please upload an image file');
      }
    }
  };

  const detectObjects = async () => {
    if (!selectedFile) {
      setError('Please select an image first');
      return;
    }

    setIsDetecting(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      console.log('Making request to:', `${API_BASE_URL}/detect`);
      
      const response = await fetch(`${API_BASE_URL}/detect`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setDetectionResults(data);
      } else {
        setError(data.detail || 'Detection failed');
      }
    } catch (err) {
      setError(`Network error: ${err.message}. Check if backend is running at ${API_BASE_URL}`);
      console.error('Detection error:', err);
    } finally {
      setIsDetecting(false);
    }
  };

  const classifyImage = async () => {
    if (!selectedFile) {
      setError('Please select an image first');
      return;
    }

    setIsClassifying(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      console.log('Making request to:', `${API_BASE_URL}/classify`);

      const response = await fetch(`${API_BASE_URL}/classify`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setClassificationResults(data);
        
        // Add to analysis history
        const newAnalysis = {
          filename: selectedFile.name,
          timestamp: new Date().toLocaleTimeString(),
          classification: data,
          type: 'classification'
        };
        setAnalysisHistory(prev => [newAnalysis, ...prev.slice(0, 4)]); // Keep last 5
      } else {
        setError(data.detail || 'Classification failed');
      }
    } catch (err) {
      setError(`Network error: ${err.message}. Check if backend is running at ${API_BASE_URL}`);
      console.error('Classification error:', err);
    } finally {
      setIsClassifying(false);
    }
  };

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
        // Set individual results
        if (data.object_detection?.success) {
          setDetectionResults(data.object_detection);
        }
        if (data.image_classification?.success) {
          setClassificationResults(data.image_classification);
          
          // Add to analysis history
          const newAnalysis = {
            filename: selectedFile.name,
            timestamp: new Date().toLocaleTimeString(),
            classification: data.image_classification,
            detection: data.object_detection,
            type: 'full_analysis'
          };
          setAnalysisHistory(prev => [newAnalysis, ...prev.slice(0, 4)]);
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

  const exportResults = () => {
    const exportData = {
      filename: selectedFile?.name,
      timestamp: new Date().toISOString(),
      detection: detectionResults,
      classification: classificationResults,
      analysis_history: analysisHistory
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-analysis-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getCategoryColor = (category) => {
    const colors = {
      food: 'bg-green-100 text-green-800',
      beverages: 'bg-blue-100 text-blue-800',
      electronics: 'bg-purple-100 text-purple-800',
      clothing: 'bg-pink-100 text-pink-800',
      household: 'bg-yellow-100 text-yellow-800',
      books_media: 'bg-indigo-100 text-indigo-800',
      health_beauty: 'bg-red-100 text-red-800',
      tools_hardware: 'bg-gray-100 text-gray-800',
      toys_games: 'bg-orange-100 text-orange-800',
      office_supplies: 'bg-teal-100 text-teal-800',
      other: 'bg-gray-100 text-gray-600'
    };
    return colors[category] || colors.other;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            🔍 InventoryLens AI
          </h1>
          <p className="text-lg text-gray-600">
            AI-powered inventory analysis with object detection and image classification
          </p>
          {/* Backend Status Indicator */}
          <div className="mt-2">
            <span className="text-sm text-gray-500">
              Backend: {API_BASE_URL} 
              <span className={`ml-2 px-2 py-1 rounded text-xs ${
                process.env.NODE_ENV === 'production' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {process.env.NODE_ENV === 'production' ? 'Production' : 'Development'}
              </span>
            </span>
          </div>
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Image Upload & Detection */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <span className="mr-2">📁</span>
                Upload Image
              </h2>
              
              {/* Upload Area */}
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 transition-colors"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="flex flex-col items-center">
                  <span className="text-4xl mb-2">📤</span>
                  <p className="text-gray-600 mb-2">
                    Drag & drop an image here, or click to select
                  </p>
                  <p className="text-sm text-gray-400">
                    Supports JPG, PNG, WEBP
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

              {/* Image Preview */}
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
                <span className="mr-2">🚀</span>
                Analysis Actions
              </h2>
              
              <div className="space-y-3">
                {/* Object Detection */}
                <button
                  onClick={detectObjects}
                  disabled={!selectedFile || isDetecting}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isDetecting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Detecting Objects...
                    </>
                  ) : (
                    <>
                      <span className="mr-2">🎯</span>
                      Detect Objects
                    </>
                  )}
                </button>

                {/* Image Classification */}
                <button
                  onClick={classifyImage}
                  disabled={!selectedFile || isClassifying}
                  className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isClassifying ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Classifying...
                    </>
                  ) : (
                    <>
                      <span className="mr-2">📊</span>
                      Classify Image
                    </>
                  )}
                </button>

                {/* Full Analysis */}
                <button
                  onClick={runFullAnalysis}
                  disabled={!selectedFile || isAnalyzing}
                  className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isAnalyzing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Running Full Analysis...
                    </>
                  ) : (
                    <>
                      <span className="mr-2">🔬</span>
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
                  <span className="mr-2">🎯</span>
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
          </div>

          {/* Right Column - Classification & History */}
          <div className="space-y-6">
            {/* Image Classification Results */}
            {classificationResults && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center">
                  <span className="mr-2">📊</span>
                  Image Classification
                </h2>

                {/* Top Prediction */}
                <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4 mb-4">
                  <h3 className="font-semibold text-gray-800 mb-2">Top Prediction</h3>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-medium text-gray-700 capitalize">
                      {classificationResults.top_prediction?.label || 'Unknown'}
                    </span>
                    <span className="text-lg font-bold text-green-600">
                      {classificationResults.top_prediction?.confidence || 0}%
                    </span>
                  </div>
                </div>

                {/* Category Breakdown */}
                {classificationResults.category_breakdown && (
                  <div className="mb-4">
                    <h3 className="font-semibold text-gray-800 mb-3">Category Breakdown</h3>
                    <div className="space-y-2">
                      {Object.entries(classificationResults.category_breakdown)
                        .sort(([,a], [,b]) => b - a)
                        .map(([category, percentage]) => (
                          <div key={category} className="flex items-center justify-between">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getCategoryColor(category)}`}>
                              {category.replace('_', ' ')}
                            </span>
                            <div className="flex items-center space-x-2">
                              <div className="w-20 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${Math.min(percentage, 100)}%` }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium text-gray-600 w-12 text-right">
                                {percentage}%
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Summary */}
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Summary:</span> {classificationResults.detailed_summary || classificationResults.summary}
                  </p>
                </div>
              </div>
            )}

            {/* Analysis History */}
            {analysisHistory.length > 0 && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center">
                  <span className="mr-2">📈</span>
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
                      
                      {analysis.classification && (
                        <div className="text-sm">
                          <p className="text-gray-700">
                            <span className="font-medium">Top Category:</span>{' '}
                            <span className={`px-1 py-0.5 rounded text-xs ${getCategoryColor(analysis.classification.top_category?.category)}`}>
                              {analysis.classification.top_category?.category?.replace('_', ' ')} 
                              ({analysis.classification.top_category?.percentage}%)
                            </span>
                          </p>
                          
                          {analysis.detection && (
                            <p className="text-gray-600 text-xs mt-1">
                              Objects detected: {analysis.detection.total_objects}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Export Results */}
            {(detectionResults || classificationResults) && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center">
                  <span className="mr-2">💾</span>
                  Export Results
                </h2>
                <button
                  onClick={exportResults}
                  className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg hover:bg-purple-700 flex items-center justify-center"
                >
                  <span className="mr-2">📥</span>
                  Download Analysis (JSON)
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-12 text-gray-500">
          <p>
            InventoryLens AI Demo - Powered by HuggingFace AI Models
          </p>
          <p className="text-sm mt-1">
            Object Detection: facebook/detr-resnet-50 | Image Classification: google/vit-base-patch16-224
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
