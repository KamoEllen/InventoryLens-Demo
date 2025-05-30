import React, { useState, useRef } from 'react';
import './App.css';
// At the top of your component file
import image1 from './images/1.jpg';
import image2 from './images/2.jpg';
import image3 from './images/3.jpg';
import image4 from './images/4.jpg';

// ========== API Configuration ==========

// ---------- Local Development (ACTIVE) ----------
//const API_BASE_URL = 'http://localhost:8000';

// ---------- Production (COMMENTED OUT) ----------
 const API_BASE_URL = process.env.NODE_ENV === 'production' 
   ? 'https://inventorylens-demo.onrender.com'  // Your Render backend URL
   : 'http://localhost:8000';

// Sample images data - Updated paths for public folder
const sampleImages = [
  {
    id: 1,
    src: image1,  // Use the imported variable
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
  const [isDetecting, setIsDetecting] = useState(false);
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
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
      
      // Reset previous results
      setDetectionResults(null);
    }
  };

  const handleSampleImageSelect = async (imageSrc, imageName) => {
    try {
      // Fetch the image from the public folder
      const response = await fetch(imageSrc);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
      }
      const blob = await response.blob();
      
      // Create a File object from the blob
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

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDraggingOver(false);
    
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
  };

  // Gallery drag and drop handlers
  const handleGalleryDragStart = (event, image) => {
    setDraggedImage(image);
    event.dataTransfer.effectAllowed = 'copy';
    event.dataTransfer.setData('text/plain', ''); // Required for some browsers
  };

  const handleGalleryDragEnd = () => {
    setDraggedImage(null);
  };

  const handleUploadAreaDrop = async (event) => {
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
        
        // Add to analysis history
        const newAnalysis = {
          filename: selectedFile.name,
          timestamp: new Date().toLocaleString(),
          date: new Date().toISOString(),
          detection: data,
          type: 'detection'
        };
        setAnalysisHistory(prev => [newAnalysis, ...prev.slice(0, 9)]); // Keep last 10
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
        // Set detection results
        if (data.object_detection?.success) {
          setDetectionResults(data.object_detection);
          
          // Add to analysis history
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

  const exportToPDF = async () => {
    try {
      // Dynamically import jsPDF and autoTable
      const { jsPDF } = await import('jspdf');
      await import('jspdf-autotable');

      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(20);
      doc.setTextColor(40, 44, 52);
      doc.text('InventoryLens AI - Analysis Report', 20, 25);
      
      // Add generation date
      doc.setFontSize(12);
      doc.setTextColor(100);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 35);
      
      let currentY = 50;

      // Current Analysis Results Section
      if (detectionResults) {
        doc.setFontSize(16);
        doc.setTextColor(40, 44, 52);
        doc.text('Current Analysis Results', 20, currentY);
        currentY += 10;

        // Image info
        doc.setFontSize(12);
        doc.setTextColor(60);
        doc.text(`Image: ${selectedFile?.name || 'Unknown'}`, 20, currentY);
        doc.text(`Total Objects Found: ${detectionResults.total_objects}`, 20, currentY + 7);
        currentY += 20;

        // Object Detection Table
        if (detectionResults.detections && detectionResults.detections.length > 0) {
          const detectionTableData = detectionResults.detections.map((detection, index) => [
            index + 1,
            detection.label,
            `${(detection.confidence * 100).toFixed(1)}%`,
            detection.box ? 
              `X:${Math.round(detection.box.xmin || 0)}, Y:${Math.round(detection.box.ymin || 0)}` : 
              'N/A'
          ]);

          doc.autoTable({
            startY: currentY,
            head: [['#', 'Object Type', 'Confidence', 'Position']],
            body: detectionTableData,
            theme: 'striped',
            headStyles: { fillColor: [59, 130, 246] },
            styles: { fontSize: 10 },
            margin: { left: 20, right: 20 },
          });

          currentY = doc.lastAutoTable.finalY + 15;
        }

        // Object Counts Summary Table
        if (detectionResults.object_counts && Object.keys(detectionResults.object_counts).length > 0) {
          doc.setFontSize(14);
          doc.setTextColor(40, 44, 52);
          doc.text('Object Summary by Type', 20, currentY);
          currentY += 10;

          const summaryTableData = Object.entries(detectionResults.object_counts).map(([label, count]) => [
            label.charAt(0).toUpperCase() + label.slice(1),
            count,
            `${((count / detectionResults.total_objects) * 100).toFixed(1)}%`
          ]);

          doc.autoTable({
            startY: currentY,
            head: [['Object Type', 'Count', 'Percentage']],
            body: summaryTableData,
            theme: 'grid',
            headStyles: { fillColor: [147, 51, 234] },
            styles: { fontSize: 10 },
            margin: { left: 20, right: 20 },
          });

          currentY = doc.lastAutoTable.finalY + 20;
        }
      }

      // Analysis History Section
      if (analysisHistory.length > 0) {
        // Check if we need a new page
        if (currentY > 200) {
          doc.addPage();
          currentY = 30;
        }

        doc.setFontSize(16);
        doc.setTextColor(40, 44, 52);
        doc.text('Analysis History', 20, currentY);
        currentY += 15;

        // Create history table data
        const historyTableData = analysisHistory.map((analysis, index) => [
          index + 1,
          analysis.filename,
          analysis.timestamp,
          analysis.type === 'full_analysis' ? 'Full Analysis' : 'Object Detection',
          analysis.detection?.total_objects || 0,
          Object.keys(analysis.detection?.object_counts || {}).length || 0
        ]);

        doc.autoTable({
          startY: currentY,
          head: [['#', 'Filename', 'Date & Time', 'Analysis Type', 'Objects Found', 'Object Types']],
          body: historyTableData,
          theme: 'striped',
          headStyles: { fillColor: [16, 185, 129] },
          styles: { fontSize: 9 },
          margin: { left: 20, right: 20 },
          columnStyles: {
            0: { cellWidth: 15 },
            1: { cellWidth: 45 },
            2: { cellWidth: 35 },
            3: { cellWidth: 30 },
            4: { cellWidth: 25 },
            5: { cellWidth: 25 }
          }
        });

        currentY = doc.lastAutoTable.finalY + 15;

        // Detailed history breakdown
        if (analysisHistory.length > 0 && currentY < 250) {
          doc.setFontSize(14);
          doc.text('Detailed History Breakdown', 20, currentY);
          currentY += 10;

          // Create detailed breakdown for each analysis
          const detailedData = [];
          analysisHistory.forEach((analysis, historyIndex) => {
            if (analysis.detection?.object_counts) {
              Object.entries(analysis.detection.object_counts).forEach(([objectType, count]) => {
                detailedData.push([
                  `${historyIndex + 1}`,
                  analysis.filename.substring(0, 20) + (analysis.filename.length > 20 ? '...' : ''),
                  objectType.charAt(0).toUpperCase() + objectType.slice(1),
                  count
                ]);
              });
            }
          });

          if (detailedData.length > 0) {
            doc.autoTable({
              startY: currentY,
              head: [['Analysis #', 'Image', 'Object Type', 'Count']],
              body: detailedData,
              theme: 'grid',
              headStyles: { fillColor: [245, 101, 101] },
              styles: { fontSize: 9 },
              margin: { left: 20, right: 20 },
            });
          }
        }
      }

      // Add footer
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`InventoryLens AI Report - Page ${i} of ${pageCount}`, 20, doc.internal.pageSize.height - 10);
        doc.text(`Generated by InventoryLens AI`, doc.internal.pageSize.width - 60, doc.internal.pageSize.height - 10);
      }

      // Save the PDF
      const filename = `InventoryLens-Report-${new Date().toISOString().split('T')[0]}-${Date.now()}.pdf`;
      doc.save(filename);
      
    } catch (error) {
      console.error('PDF generation error:', error);
      setError('Failed to generate PDF. Please try again.');
    }
  };

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
          {/* Left Column - Main Content (3/4 width) */}
          <div className="lg:col-span-3 space-y-6">
            {/* Image Upload Section */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <span className="mr-2">📁</span>
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

          
         
          {/* Right Column - Analysis History */}
          <div className="space-y-6">
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
                  <span className="mr-2">💾</span>
                  Export Results
                </h2>
                <div className="space-y-3">
                  {/*
                  <button
                    onClick={exportToPDF}
                    className="w-full bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 flex items-center justify-center"
                  >
                    <span className="mr-2">📄</span>
                    Download PDF Report
                  </button>
                  */}
                  <button
                    onClick={exportToTXT}
                    className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 flex items-center justify-center"
                  >
                    <span className="mr-2">📝</span>
                    Download Text Report
                  </button>
                </div>
              </div>
            )}
          </div>

        {/* outer container */}
<div className="lg:w-1/2 lg:max-w-xs">
  <div className="bg-white rounded-lg shadow-lg p-3 sticky top-4">
    <h2 className="text-sm font-semibold mb-2 flex items-center">
      <span className="mr-1">🖼️</span>
      Sample Images
    </h2>
    <p className="text-gray-600 mb-3 text-xs">
      Click or drag to upload
    </p>

    {/* Fixed Size Container - 240px width x 60px height for single row */}
    {/* This container defines the overall area for the images */}
    <div className="w-[240px] h-[60px] mx-auto border border-gray-200 rounded-lg p-0 bg-gray-50">
      {/* Flex container to hold the images in a single row */}
      <div className="w-full h-full flex overflow-hidden rounded-lg">
        {sampleImages.map((image, index) => (
          <div
            key={image.id}
            // Each image takes 1/4 of the container width and full height
            className="flex-1 h-full cursor-pointer overflow-hidden hover:border-blue-400 transition-all duration-200 hover:scale-105 bg-white relative"
            style={{
              // Apply rounded corners only to first and last images
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
            {/* Drag indicator */}
            {draggedImage?.id === image.id && (
              <div className="absolute inset-0 border-2 border-blue-500 bg-blue-200 bg-opacity-30"></div>
            )}
          </div>
        ))}
      </div>
    </div>

    {/* Compact tip */}
    <div className="mt-2 p-1 bg-blue-50 rounded text-xs text-blue-700 text-center">
      💡 Drag to upload area
    </div>
  </div>

  {/* Analysis History - Compact version */}
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

        {/* Footer */}
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
