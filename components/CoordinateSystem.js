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
  
  // Calculate grid density and step size based on range (zoom level)
  // This follows the approach used by Desmos and GeoGebra
  const calculateGridSettings = useCallback(() => {
    const xSpan = Math.abs(xRange[1] - xRange[0]);
    const ySpan = Math.abs(yRange[1] - yRange[0]);
    
    // Calculate ideal number of grid lines (10-15 lines looks good)
    const idealGridLineCount = 10;
    
    // Dynamic grid step calculation based on the span
    // Uses a base-10 log calculation to determine appropriate step size
    // This ensures round numbers that make sense for human reading
    const calculateStep = (span) => {
      if (span <= 0) return 1; // Avoid division by zero
      
      // Get the magnitude of the span (1, 10, 100, etc.)
      const magnitude = Math.pow(10, Math.floor(Math.log10(span)));
      
      // Calculate a raw step based on ideal grid line count
      const rawStep = span / idealGridLineCount;
      const normalizedStep = rawStep / magnitude;
      
      // Choose a nice round step based on the normalized step
      let niceStep;
      if (normalizedStep <= 0.1) niceStep = 0.1;
      else if (normalizedStep <= 0.2) niceStep = 0.2;
      else if (normalizedStep <= 0.5) niceStep = 0.5;
      else if (normalizedStep <= 1.0) niceStep = 1.0;
      else if (normalizedStep <= 2.0) niceStep = 2.0;
      else niceStep = 5.0;
      
      // Multiply by the magnitude to get the final step
      return niceStep * magnitude;
    };
    
    const xStep = calculateStep(xSpan);
    const yStep = calculateStep(ySpan);
    
    console.log(`Grid settings calculated: xStep=${xStep}, yStep=${yStep} for spans: x=${xSpan}, y=${ySpan}`);
    
    return { xStep, yStep };
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

  // Drawing event handlers with precise cursor positioning at center point
  const handleMouseDown = useCallback((e) => {
    console.log("Mouse down event triggered, isTestMode:", isTestMode);
    
    if (!isTestMode) return;
    
    e.preventDefault();
    
    // Get bounding rectangle of the overlay div (e.currentTarget)
    const rect = e.currentTarget.getBoundingClientRect();
    
    // Get the center of the cursor position
    // This fixes the alignment issue where drawing appeared offset from cursor
    const centerX = e.clientX;
    const centerY = e.clientY;
    
    // Convert screen coordinates to plot coordinates
    const { x, y } = screenToPlotCoordinates(centerX, centerY, rect);
    
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
    
    // Get the center of the cursor position
    // This ensures the line traces exactly where the cursor is, not offset
    const centerX = e.clientX;
    const centerY = e.clientY;
    
    // Convert screen coordinates to plot coordinates
    const { x, y } = screenToPlotCoordinates(centerX, centerY, rect);
    
    // Add point to drawing - sampling at a reasonable rate to prevent too many points
    // Only add point if it's different enough from the last point to avoid duplicate points
    setDrawnPoints(prev => {
      if (prev.length === 0) return [{ x, y }];
      
      const lastPoint = prev[prev.length - 1];
      // Only add point if the movement is significant enough
      // This also helps with smoothing the line
      const dx = Math.abs(x - lastPoint.x);
      const dy = Math.abs(y - lastPoint.y);
      const minDistance = 0.02; // Minimum distance to add a new point
      
      if (dx > minDistance || dy > minDistance) {
        return [...prev, { x, y }];
      }
      return prev;
    });
    
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

  // Generate grid lines with adaptive spacing based on zoom level
  const generateGridLines = useCallback(() => {
    const { xStep, yStep } = calculateGridSettings();
    
    const gridLines = [];
    
    // Calculate grid line boundaries with extra room for "infinite" appearance
    // Extend beyond visible range by 100x to make grid appear infinite
    const visibleXSpan = xRange[1] - xRange[0];
    const visibleYSpan = yRange[1] - yRange[0];
    
    const extendedXMin = xRange[0] - visibleXSpan * 100;
    const extendedXMax = xRange[1] + visibleXSpan * 100;
    const extendedYMin = yRange[0] - visibleYSpan * 100;
    const extendedYMax = yRange[1] + visibleYSpan * 100;
    
    // Calculate adaptive grid line widths based on zoom level
    // This ensures grid lines remain visible at any zoom level
    const zoomMultiplier = Math.min(visibleXSpan, visibleYSpan) / 10;
    const baseWidth = 0.5; 
    const gridLineWidth = Math.max(baseWidth, baseWidth / zoomMultiplier);
    
    // Add vertical grid lines (constant x)
    // Start from a round number below the extended min
    const startX = Math.floor(extendedXMin / xStep) * xStep;
    for (let x = startX; x <= extendedXMax; x += xStep) {
      // Skip the axis at x=0 as it will be added separately with bolder style
      if (Math.abs(x) < 0.001) continue; 
      
      // Determine if this is a major grid line (multiple of 5 or 10)
      const isMajorLine = Math.abs(x % (xStep * 5)) < 0.001;
      
      gridLines.push({
        x: [x, x],
        y: [extendedYMin, extendedYMax], // Extend beyond the visible area
        mode: 'lines',
        line: { 
          width: isMajorLine ? gridLineWidth * 1.5 : gridLineWidth, 
          color: isMajorLine ? '#c0c0c0' : '#e0e0e0' 
        },
        hoverinfo: 'none',
        showlegend: false
      });
    }
    
    // Add horizontal grid lines (constant y)
    // Start from a round number below the extended min
    const startY = Math.floor(extendedYMin / yStep) * yStep;
    for (let y = startY; y <= extendedYMax; y += yStep) {
      // Skip the axis at y=0 as it will be added separately with bolder style
      if (Math.abs(y) < 0.001) continue;
      
      // Determine if this is a major grid line (multiple of 5 or 10)
      const isMajorLine = Math.abs(y % (yStep * 5)) < 0.001;
      
      gridLines.push({
        x: [extendedXMin, extendedXMax], // Extend beyond the visible area
        y: [y, y],
        mode: 'lines',
        line: { 
          width: isMajorLine ? gridLineWidth * 1.5 : gridLineWidth, 
          color: isMajorLine ? '#c0c0c0' : '#e0e0e0' 
        },
        hoverinfo: 'none',
        showlegend: false
      });
    }
    
    return gridLines;
  }, [xRange, yRange, calculateGridSettings]);

  // Calculate extended ranges for "infinite" axes
  const visibleXSpan = xRange[1] - xRange[0];
  const visibleYSpan = yRange[1] - yRange[0];
  const extendedXMin = xRange[0] - visibleXSpan * 100;
  const extendedXMax = xRange[1] + visibleXSpan * 100;
  const extendedYMin = yRange[0] - visibleYSpan * 100;
  const extendedYMax = yRange[1] + visibleYSpan * 100;
  
  // Define plot data
  const data = [
    // Dynamic grid lines
    ...generateGridLines(),
    
    // Main axes (bolder) - extended well beyond visible area for "infinite" appearance
    // With adaptive line width based on zoom level to maintain visibility
    {
      x: [extendedXMin, extendedXMax], // Extended x-axis (y=0)
      y: [0, 0],
      mode: 'lines',
      line: { 
        width: Math.max(3, 3 / (Math.min(visibleXSpan, visibleYSpan) / 10)), 
        color: 'black' 
      }, // Bolder line for x-axis (y=0) that scales with zoom
      hoverinfo: 'none',
      showlegend: false
    },
    {
      x: [0, 0],
      y: [extendedYMin, extendedYMax], // Extended y-axis (x=0)
      mode: 'lines',
      line: { 
        width: Math.max(3, 3 / (Math.min(visibleXSpan, visibleYSpan) / 10)), 
        color: 'black' 
      }, // Bolder line for y-axis (x=0) that scales with zoom
      hoverinfo: 'none',
      showlegend: false
    },
    
    // User drawn function (raw points)
    ...(drawnPoints.length > 1 ? [{
      x: drawnPoints.map(p => p.x),
      y: drawnPoints.map(p => p.y),
      mode: 'lines',
      line: { 
        width: Math.max(2, 2 / (Math.min(visibleXSpan, visibleYSpan) / 10)), 
        color: 'rgba(255, 0, 0, 0.4)', 
        dash: 'dot' 
      },
      name: 'Raw Drawing',
      showlegend: smoothedPoints.length > 0 // Only show in legend if we have smoothed points
    }] : []),
    
    // Smoothed user prediction (if available)
    ...(smoothedPoints.length > 0 ? [{
      x: smoothedPoints.map(p => p.x),
      y: smoothedPoints.map(p => p.y),
      mode: 'lines',
      line: { 
        width: Math.max(4, 4 / (Math.min(visibleXSpan, visibleYSpan) / 10)), 
        color: 'red' 
      }, // Adaptive thickness based on zoom level
      name: 'Your Prediction (Smoothed)'
    }] : []),
    
    // Actual function (if visible)
    ...(actualFunction ? [{
      x: actualFunction.x,
      y: actualFunction.y,
      mode: 'lines',
      line: { 
        width: Math.max(3, 3 / (Math.min(visibleXSpan, visibleYSpan) / 10)), 
        color: 'blue' 
      }, // Adaptive thickness based on zoom level
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
          // Completely transparent but still captures all events
          // This ensures the overlay doesn't interfere with visibility
          backgroundColor: 'transparent',
          pointerEvents: 'all' // Important: Ensures all pointer events are captured
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