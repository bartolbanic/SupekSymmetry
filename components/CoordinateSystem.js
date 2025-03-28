import React, { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { evaluateFunction, smoothPoints } from '../utils/mathFunctions';

// Dynamically import Plotly to avoid SSR issues
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

const CoordinateSystem = ({ 
  xRange, 
  yRange, 
  functionString, 
  onDrawingComplete, 
  showActualFunction,
  drawnPoints,
  setDrawnPoints,
  isTestMode
}) => {
  const plotRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [actualFunction, setActualFunction] = useState(null);
  const [plotInstance, setPlotInstance] = useState(null);
  const [smoothedPoints, setSmoothedPoints] = useState([]);
  
  // Calculate grid density based on range
  const calculateGridDensity = useCallback(() => {
    const xSpan = Math.abs(xRange[1] - xRange[0]);
    const ySpan = Math.abs(yRange[1] - yRange[0]);
    
    // Base density - more lines for smaller ranges (higher zoom)
    const xDensity = Math.max(2, Math.min(20, Math.floor(100 / xSpan)));
    const yDensity = Math.max(2, Math.min(20, Math.floor(100 / ySpan)));
    
    return { xDensity, yDensity };
  }, [xRange, yRange]);

  // Generate actual function data
  useEffect(() => {
    if (functionString && showActualFunction) {
      try {
        const numPoints = 1000;
        const xStep = (xRange[1] - xRange[0]) / numPoints;
        const xValues = Array.from({ length: numPoints + 1 }, (_, i) => xRange[0] + i * xStep);
        const yValues = evaluateFunction(functionString, xValues);
        
        setActualFunction({ x: xValues, y: yValues });
        console.log("Generated actual function with", xValues.length, "points");
      } catch (err) {
        console.error("Error generating function data:", err);
        setActualFunction(null);
      }
    } else {
      setActualFunction(null);
    }
  }, [functionString, showActualFunction, xRange]);

  // Function to convert screen coordinates to plot coordinates
  const screenToPlotCoordinates = useCallback((screenX, screenY, rect) => {
    // If we have the plotly instance, use its conversion
    if (plotInstance && plotInstance._fullLayout) {
      try {
        const xaxis = plotInstance._fullLayout.xaxis;
        const yaxis = plotInstance._fullLayout.yaxis;
        
        if (xaxis && yaxis) {
          const x = xaxis.p2d(screenX - rect.left);
          const y = yaxis.p2d(screenY - rect.top);
          return { x, y };
        }
      } catch (err) {
        console.error("Error using Plotly conversion:", err);
      }
    }
    
    // Fallback to manual calculation
    const xPlotRatio = (xRange[1] - xRange[0]) / rect.width;
    const yPlotRatio = (yRange[1] - yRange[0]) / rect.height;
    
    const x = xRange[0] + (screenX - rect.left) * xPlotRatio;
    const y = yRange[1] - (screenY - rect.top) * yPlotRatio;
    
    return { x, y };
  }, [plotInstance, xRange, yRange]);

  // Drawing event handlers
  const handleMouseDown = useCallback((e) => {
    console.log("Mouse down event triggered, isTestMode:", isTestMode);
    
    if (!isTestMode) return;
    
    e.preventDefault();
    
    // Get bounding rectangle of the overlay div (e.currentTarget)
    const rect = e.currentTarget.getBoundingClientRect();
    
    // Convert screen coordinates to plot coordinates
    const { x, y } = screenToPlotCoordinates(e.clientX, e.clientY, rect);
    
    // Start drawing
    setIsDrawing(true);
    setDrawnPoints([{ x, y }]);
    
    console.log("Started drawing at:", { x, y });
  }, [isTestMode, screenToPlotCoordinates, setDrawnPoints]);

  const handleMouseMove = useCallback((e) => {
    if (!isDrawing || !isTestMode) return;
    
    e.preventDefault();
    
    // Get bounding rectangle of the overlay div (e.currentTarget)
    const rect = e.currentTarget.getBoundingClientRect();
    
    // Convert screen coordinates to plot coordinates
    const { x, y } = screenToPlotCoordinates(e.clientX, e.clientY, rect);
    
    // Add point to drawing
    setDrawnPoints(prev => [...prev, { x, y }]);
    
    // Limit logging to avoid console spam
    if (Math.random() < 0.05) {
      console.log("Drawing in progress, points:", drawnPoints.length + 1);
    }
  }, [isDrawing, isTestMode, screenToPlotCoordinates, drawnPoints.length, setDrawnPoints]);

  const handleMouseUp = useCallback(() => {
    if (!isDrawing) return;
    
    console.log("Drawing completed with", drawnPoints.length, "points");
    setIsDrawing(false);
    
    // Apply smoothing and vertical line test if we have enough points
    if (drawnPoints.length >= 3) {
      try {
        const smoothed = smoothPoints(drawnPoints);
        console.log("Smoothed to", smoothed.length, "points with cubic spline");
        setSmoothedPoints(smoothed);
        
        // Pass smoothed points to parent component
        if (onDrawingComplete) {
          onDrawingComplete(smoothed);
        }
      } catch (err) {
        console.error("Error smoothing points:", err);
        // If smoothing fails, use original points
        setSmoothedPoints([]);
        if (onDrawingComplete) {
          onDrawingComplete(drawnPoints);
        }
      }
    } else {
      // If not enough points for smoothing, use original
      setSmoothedPoints([]);
      if (drawnPoints.length > 0 && onDrawingComplete) {
        onDrawingComplete(drawnPoints);
      }
    }
  }, [isDrawing, drawnPoints, onDrawingComplete]);

  // Generate grid lines with dynamic density
  const generateGridLines = useCallback(() => {
    const { xDensity, yDensity } = calculateGridDensity();
    
    const gridLines = [];
    const xSpan = xRange[1] - xRange[0];
    const ySpan = yRange[1] - yRange[0];
    
    // Add vertical grid lines (constant x)
    const xStep = xSpan / xDensity;
    for (let x = Math.ceil(xRange[0] / xStep) * xStep; x <= xRange[1]; x += xStep) {
      // Skip the axis at x=0 as it will be added separately
      if (Math.abs(x) < 0.001) continue; 
      
      gridLines.push({
        x: [x, x],
        y: [yRange[0], yRange[1]],
        mode: 'lines',
        line: { width: 0.5, color: '#e0e0e0' },
        hoverinfo: 'none',
        showlegend: false
      });
    }
    
    // Add horizontal grid lines (constant y)
    const yStep = ySpan / yDensity;
    for (let y = Math.ceil(yRange[0] / yStep) * yStep; y <= yRange[1]; y += yStep) {
      // Skip the axis at y=0 as it will be added separately
      if (Math.abs(y) < 0.001) continue;
      
      gridLines.push({
        x: [xRange[0], xRange[1]],
        y: [y, y],
        mode: 'lines',
        line: { width: 0.5, color: '#e0e0e0' },
        hoverinfo: 'none',
        showlegend: false
      });
    }
    
    return gridLines;
  }, [xRange, yRange, calculateGridDensity]);

  // Define plot data
  const data = [
    // Dynamic grid lines
    ...generateGridLines(),
    
    // Main axes (bolder)
    {
      x: [xRange[0], xRange[1]],
      y: [0, 0],
      mode: 'lines',
      line: { width: 2, color: 'black' }, // Bolder line for x=0 axis
      hoverinfo: 'none',
      showlegend: false
    },
    {
      x: [0, 0],
      y: [yRange[0], yRange[1]],
      mode: 'lines',
      line: { width: 2, color: 'black' }, // Bolder line for y=0 axis
      hoverinfo: 'none',
      showlegend: false
    },
    
    // User drawn function (raw points)
    ...(drawnPoints.length > 1 ? [{
      x: drawnPoints.map(p => p.x),
      y: drawnPoints.map(p => p.y),
      mode: 'lines',
      line: { width: 1, color: 'rgba(255, 0, 0, 0.3)', dash: 'dot' },
      name: 'Raw Drawing',
      showlegend: smoothedPoints.length > 0 // Only show in legend if we have smoothed points
    }] : []),
    
    // Smoothed user prediction (if available)
    ...(smoothedPoints.length > 0 ? [{
      x: smoothedPoints.map(p => p.x),
      y: smoothedPoints.map(p => p.y),
      mode: 'lines',
      line: { width: 3, color: 'red' },
      name: 'Your Prediction (Smoothed)'
    }] : []),
    
    // Actual function (if visible)
    ...(actualFunction ? [{
      x: actualFunction.x,
      y: actualFunction.y,
      mode: 'lines',
      line: { width: 3, color: 'blue' },
      name: 'Actual Function'
    }] : [])
  ];

  // Define plot layout
  const layout = {
    autosize: true,
    margin: { l: 50, r: 30, t: 30, b: 50 },
    xaxis: {
      range: xRange,
      zeroline: false,
      gridcolor: '#e0e0e0',
      title: 'x',
      showgrid: false // Using our custom grid
    },
    yaxis: {
      range: yRange,
      zeroline: false,
      gridcolor: '#e0e0e0',
      title: 'y',
      showgrid: false // Using our custom grid
    },
    dragmode: isTestMode ? false : 'pan', // Disable drag in test mode for drawing
    hovermode: 'closest',
    showlegend: true,
    legend: {
      x: 0,
      y: 1,
      orientation: 'h'
    }
  };

  const config = {
    responsive: true,
    displayModeBar: true,
    scrollZoom: !isTestMode, // Disable scroll zoom in drawing mode
    modeBarButtonsToRemove: [
      'select2d',
      'lasso2d',
      'zoomIn2d',
      'zoomOut2d',
      'autoScale2d',
      'resetScale2d',
      'hoverClosestCartesian',
      'hoverCompareCartesian',
      'toggleSpikelines',
    ]
  };

  // Store the plot instance for coordinate conversion
  const handlePlotInitialized = useCallback((figure) => {
    if (figure && figure.el && figure.el._fullLayout) {
      setPlotInstance(figure);
      console.log("Plot instance initialized");
    }
  }, []);

  // Mouse capture overlay that sits on top of the plot
  // This is key to fixing the drawing functionality
  const renderMouseCapture = () => {
    if (!isTestMode) return null;
    
    return (
      <div 
        className="mouse-capture-overlay"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 500, // Above the plot but below instructions
          cursor: 'crosshair',
          // Transparent background
          backgroundColor: 'rgba(255, 255, 255, 0.01)', // Almost invisible but not totally transparent
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
    );
  };

  return (
    <div 
      ref={plotRef}
      style={{ position: 'relative', width: '100%', height: '100%' }}
    >
      <Plot
        data={data}
        layout={layout}
        config={config}
        style={{ width: '100%', height: '100%' }}
        useResizeHandler={true}
        onInitialized={handlePlotInitialized}
        onUpdate={handlePlotInitialized} // Update instance on any update
      />
      
      {/* Special overlay that captures mouse events in test mode */}
      {renderMouseCapture()}
      
      {isTestMode && (
        <div className="drawing-mode-instructions" style={{
          position: 'absolute',
          top: '10px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'rgba(255, 255, 255, 0.8)', // More opaque for better readability
          padding: '5px 10px',
          borderRadius: '5px',
          zIndex: 1000, // Above the overlay
          fontWeight: 'bold', // Make it more visible
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)' // Add shadow for visibility
        }}>
          Drawing Mode: Click and drag to draw your prediction
        </div>
      )}
    </div>
  );
};

export default CoordinateSystem;