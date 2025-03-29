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
  isTestMode,
  onResetDrawing
}) => {
  const plotRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [actualFunction, setActualFunction] = useState(null);
  const [plotInstance, setPlotInstance] = useState(null);
  const [smoothedPoints, setSmoothedPoints] = useState([]);
  
  // Calculate grid density and step size based on range (zoom level)
  // This follows improved approach for adaptive gridlines with zoom levels
  const calculateGridSettings = useCallback(() => {
    const xSpan = Math.abs(xRange[1] - xRange[0]);
    const ySpan = Math.abs(yRange[1] - yRange[0]);
    
    // Advanced adaptive grid calculation based on zoom level
    const calculateZoomLevels = (span) => {
      if (span <= 0) return { smallStep: 1, mediumStep: 5, largeStep: 10 };
      
      // Get the order of magnitude (10^n) for the current span
      const magnitude = Math.pow(10, Math.floor(Math.log10(span)));
      
      // Create a hierarchy of grid steps based on the magnitude
      let smallStep, mediumStep, largeStep;
      
      // Very zoomed in (span < 1)
      if (span < 1) {
        // For very small spans, use fractional grid lines
        smallStep = magnitude / 10;
        mediumStep = magnitude / 2;
        largeStep = magnitude;
      }
      // Normal zoom (1 <= span < 50)
      else if (span < 50) {
        smallStep = magnitude / 5;
        mediumStep = magnitude;
        largeStep = magnitude * 5;
      }
      // Zoomed out (span >= 50)
      else {
        smallStep = magnitude / 2;
        mediumStep = magnitude;
        largeStep = magnitude * 5;
      }
      
      // Ensure minimum size for very small values
      smallStep = Math.max(smallStep, magnitude / 10);
      
      return { smallStep, mediumStep, largeStep };
    };
    
    const xZoomLevels = calculateZoomLevels(xSpan);
    const yZoomLevels = calculateZoomLevels(ySpan);
    
    console.log(`Grid settings calculated for spans: x=${xSpan.toFixed(2)}, y=${ySpan.toFixed(2)}`);
    console.log(`X grid: small=${xZoomLevels.smallStep}, medium=${xZoomLevels.mediumStep}, large=${xZoomLevels.largeStep}`);
    console.log(`Y grid: small=${yZoomLevels.smallStep}, medium=${yZoomLevels.mediumStep}, large=${yZoomLevels.largeStep}`);
    
    return { 
      x: xZoomLevels,
      y: yZoomLevels
    };
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

  // Use a ref to store the last point for more efficient updates
  const lastPointRef = useRef(null);
  
  // Optimize drawing performance with batched updates and adaptive sampling
  const handleMouseMove = useCallback((e) => {
    if (!isDrawing || !isTestMode) return;
    
    e.preventDefault();
    
    // Get bounding rectangle of the overlay div (e.currentTarget)
    const rect = e.currentTarget.getBoundingClientRect();
    
    // Get the center of the cursor position
    const centerX = e.clientX;
    const centerY = e.clientY;
    
    // Convert screen coordinates to plot coordinates
    const { x, y } = screenToPlotCoordinates(centerX, centerY, rect);
    
    // Add point to drawing with adaptive sampling based on speed
    // This makes drawing smoother and more responsive
    setDrawnPoints(prev => {
      if (prev.length === 0) {
        lastPointRef.current = { x, y };
        return [{ x, y }];
      }
      
      const lastPoint = lastPointRef.current || prev[prev.length - 1];
      
      // Calculate distance from last point
      const dx = Math.abs(x - lastPoint.x);
      const dy = Math.abs(y - lastPoint.y);
      const distance = Math.sqrt(dx*dx + dy*dy);
      
      // Adaptive sampling with variable minimum distance
      // - Faster movements (larger distance) get fewer points
      // - Slower, more detailed movements get more points
      const speedFactor = Math.min(1, distance * 2); // Scale based on drawing speed
      const minDistance = 0.01 + (speedFactor * 0.05); // Range from 0.01 to 0.06
      
      if (distance > minDistance) {
        // For long, fast strokes, interpolate extra points to avoid jagged lines
        const newPoints = [];
        
        // Interpolate additional points for large jumps to maintain smooth appearance
        if (distance > 0.2) {
          const steps = Math.min(10, Math.floor(distance / 0.1));
          
          for (let i = 1; i <= steps; i++) {
            const t = i / (steps + 1);
            newPoints.push({
              x: lastPoint.x + (x - lastPoint.x) * t,
              y: lastPoint.y + (y - lastPoint.y) * t
            });
          }
        }
        
        // Add the actual point
        newPoints.push({ x, y });
        lastPointRef.current = { x, y };
        
        return [...prev, ...newPoints];
      }
      
      return prev;
    });
    
    // Limit logging to avoid console spam
    if (Math.random() < 0.01) {
      console.log("Drawing in progress, points:", drawnPoints.length);
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
    const gridSettings = calculateGridSettings();
    const gridLines = [];
    
    // Calculate visible area with padding to avoid gaps during panning
    const visibleXSpan = xRange[1] - xRange[0];
    const visibleYSpan = yRange[1] - yRange[0];
    
    // Only extend as needed for current view to optimize rendering performance
    const extendMultiplier = 1.5; // Just enough extension to prevent gaps during panning
    const extendedXMin = xRange[0] - visibleXSpan * extendMultiplier;
    const extendedXMax = xRange[1] + visibleXSpan * extendMultiplier;
    const extendedYMin = yRange[0] - visibleYSpan * extendMultiplier;
    const extendedYMax = yRange[1] + visibleYSpan * extendMultiplier;
    
    // Calculate adaptive grid line widths
    const zoomMultiplier = Math.min(visibleXSpan, visibleYSpan) / 10;
    const baseWidth = 0.5; 
    const gridLineWidth = Math.max(baseWidth, baseWidth / zoomMultiplier);
    
    // Extract grid steps from the settings
    const { x: xLevels, y: yLevels } = gridSettings;
    
    // Generate X grid lines with zoom-dependent density
    // 1. Generate the small grid lines
    if (visibleXSpan < 20) { // Only show small grid lines when zoomed in enough
      const smallStepX = xLevels.smallStep;
      const startSmallX = Math.floor(extendedXMin / smallStepX) * smallStepX;
      for (let x = startSmallX; x <= extendedXMax; x += smallStepX) {
        // Skip the axis line and medium/large lines which will be drawn separately
        if (Math.abs(x) < 0.001 || Math.abs(x % xLevels.mediumStep) < 0.001) continue;
        
        gridLines.push({
          x: [x, x],
          y: [extendedYMin, extendedYMax],
          mode: 'lines',
          line: { width: gridLineWidth * 0.5, color: '#f0f0f0' },
          hoverinfo: 'none',
          showlegend: false
        });
      }
    }
    
    // 2. Generate the medium grid lines
    if (visibleXSpan < 100) { // Hide medium grid lines when very zoomed out
      const mediumStepX = xLevels.mediumStep;
      const startMediumX = Math.floor(extendedXMin / mediumStepX) * mediumStepX;
      for (let x = startMediumX; x <= extendedXMax; x += mediumStepX) {
        // Skip the axis line and large lines which will be drawn separately
        if (Math.abs(x) < 0.001 || Math.abs(x % xLevels.largeStep) < 0.001) continue;
        
        gridLines.push({
          x: [x, x],
          y: [extendedYMin, extendedYMax],
          mode: 'lines',
          line: { width: gridLineWidth, color: '#e0e0e0' },
          hoverinfo: 'none',
          showlegend: false
        });
      }
    }
    
    // 3. Generate the large grid lines (always visible regardless of zoom)
    const largeStepX = xLevels.largeStep;
    const startLargeX = Math.floor(extendedXMin / largeStepX) * largeStepX;
    for (let x = startLargeX; x <= extendedXMax; x += largeStepX) {
      // Skip the axis line which will be drawn separately
      if (Math.abs(x) < 0.001) continue;
      
      gridLines.push({
        x: [x, x],
        y: [extendedYMin, extendedYMax],
        mode: 'lines',
        line: { width: gridLineWidth * 1.5, color: '#c0c0c0' },
        hoverinfo: 'none',
        showlegend: false
      });
    }
    
    // Generate Y grid lines with zoom-dependent density
    // 1. Generate the small grid lines
    if (visibleYSpan < 20) { // Only show small grid lines when zoomed in enough
      const smallStepY = yLevels.smallStep;
      const startSmallY = Math.floor(extendedYMin / smallStepY) * smallStepY;
      for (let y = startSmallY; y <= extendedYMax; y += smallStepY) {
        // Skip the axis line and medium/large lines which will be drawn separately
        if (Math.abs(y) < 0.001 || Math.abs(y % yLevels.mediumStep) < 0.001) continue;
        
        gridLines.push({
          x: [extendedXMin, extendedXMax],
          y: [y, y],
          mode: 'lines',
          line: { width: gridLineWidth * 0.5, color: '#f0f0f0' },
          hoverinfo: 'none',
          showlegend: false
        });
      }
    }
    
    // 2. Generate the medium grid lines
    if (visibleYSpan < 100) { // Hide medium grid lines when very zoomed out
      const mediumStepY = yLevels.mediumStep;
      const startMediumY = Math.floor(extendedYMin / mediumStepY) * mediumStepY;
      for (let y = startMediumY; y <= extendedYMax; y += mediumStepY) {
        // Skip the axis line and large lines which will be drawn separately
        if (Math.abs(y) < 0.001 || Math.abs(y % yLevels.largeStep) < 0.001) continue;
        
        gridLines.push({
          x: [extendedXMin, extendedXMax],
          y: [y, y],
          mode: 'lines',
          line: { width: gridLineWidth, color: '#e0e0e0' },
          hoverinfo: 'none',
          showlegend: false
        });
      }
    }
    
    // 3. Generate the large grid lines (always visible regardless of zoom)
    const largeStepY = yLevels.largeStep;
    const startLargeY = Math.floor(extendedYMin / largeStepY) * largeStepY;
    for (let y = startLargeY; y <= extendedYMax; y += largeStepY) {
      // Skip the axis line which will be drawn separately
      if (Math.abs(y) < 0.001) continue;
      
      gridLines.push({
        x: [extendedXMin, extendedXMax],
        y: [y, y],
        mode: 'lines',
        line: { width: gridLineWidth * 1.5, color: '#c0c0c0' },
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

  // Define plot layout with adaptive tick spacing
  // Get grid settings inside the layout definition to ensure it's always current
  const gridSettings = calculateGridSettings();
  const xTickStep = gridSettings.x.mediumStep || 5; // Default to 5 if calculation fails
  const yTickStep = gridSettings.y.mediumStep || 5; // Default to 5 if calculation fails
  
  const layout = {
    autosize: true,
    margin: { l: 50, r: 30, t: 30, b: 50 },
    xaxis: {
      range: xRange,
      zeroline: false,
      gridcolor: '#e0e0e0',
      title: 'x',
      showgrid: false, // Using our custom grid
      // Dynamically adapt tick spacing based on zoom level
      dtick: xTickStep,
      tickmode: 'linear',
      ticklen: 5,
      tickwidth: 1,
      tickcolor: '#888'
    },
    yaxis: {
      range: yRange,
      zeroline: false,
      gridcolor: '#e0e0e0',
      title: 'y',
      showgrid: false, // Using our custom grid
      // Dynamically adapt tick spacing based on zoom level
      dtick: yTickStep,
      tickmode: 'linear',
      ticklen: 5,
      tickwidth: 1,
      tickcolor: '#888'
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

  // Handle keyboard shortcuts for better drawing experience
  useEffect(() => {
    if (!isTestMode) return;
    
    // Add keyboard event handlers for common drawing actions
    const handleKeyDown = (e) => {
      if (!isTestMode) return;
      
      // ESC key - Clear drawing
      if (e.key === "Escape") {
        if (onResetDrawing) {
          onResetDrawing();
          console.log("Drawing cleared with ESC key");
        }
      }
      
      // Enter key - Submit prediction when in test mode
      if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
        // This assumes a submitPrediction function is passed in via props
        if (onDrawingComplete && drawnPoints.length > 0) {
          console.log("Prediction submitted with Enter key");
          // We'll just focus on completing the drawing, not auto-submitting
          // as that would require coordination with the sidebar
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isTestMode, onResetDrawing, onDrawingComplete, drawnPoints]);

  // Mouse and touch capture overlay that sits on top of the plot
  // This is key to fixing the drawing functionality for all input devices
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
          backgroundColor: 'transparent',
          pointerEvents: 'all', // Important: Ensures all pointer events are captured
          touchAction: 'none' // Prevents default touch actions for better drawing
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={(e) => {
          e.preventDefault();
          const touch = e.touches[0];
          handleMouseDown({
            preventDefault: () => {},
            currentTarget: e.currentTarget,
            clientX: touch.clientX,
            clientY: touch.clientY
          });
        }}
        onTouchMove={(e) => {
          e.preventDefault();
          const touch = e.touches[0];
          handleMouseMove({
            preventDefault: () => {},
            currentTarget: e.currentTarget,
            clientX: touch.clientX,
            clientY: touch.clientY
          });
        }}
        onTouchEnd={(e) => {
          e.preventDefault();
          handleMouseUp();
        }}
        tabIndex={0} // Make div focusable for keyboard events
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