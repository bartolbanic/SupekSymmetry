import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { evaluateFunction } from '../utils/mathFunctions';

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

  // Generate actual function data
  useEffect(() => {
    if (functionString && showActualFunction) {
      const numPoints = 1000;
      const xStep = (xRange[1] - xRange[0]) / numPoints;
      const xValues = Array.from({ length: numPoints + 1 }, (_, i) => xRange[0] + i * xStep);
      const yValues = evaluateFunction(functionString, xValues);
      
      setActualFunction({ x: xValues, y: yValues });
    } else {
      setActualFunction(null);
    }
  }, [functionString, showActualFunction, xRange]);

  // Event handlers for drawing
  const handleMouseDown = (e) => {
    if (!isTestMode) return;
    
    const plotEl = plotRef.current;
    if (!plotEl) return;
    
    setIsDrawing(true);
    
    // Get plot coordinates from event
    const plotData = plotEl.getElementsByClassName('nsewdrag')[0];
    if (!plotData) return;
    
    const rect = plotData.getBoundingClientRect();
    const xPlotRatio = (xRange[1] - xRange[0]) / rect.width;
    const yPlotRatio = (yRange[1] - yRange[0]) / rect.height;
    
    const x = xRange[0] + (e.clientX - rect.left) * xPlotRatio;
    const y = yRange[1] - (e.clientY - rect.top) * yPlotRatio;
    
    setDrawnPoints([{ x, y }]);
  };

  const handleMouseMove = (e) => {
    if (!isDrawing || !isTestMode) return;
    
    const plotEl = plotRef.current;
    if (!plotEl) return;
    
    // Get plot coordinates from event
    const plotData = plotEl.getElementsByClassName('nsewdrag')[0];
    if (!plotData) return;
    
    const rect = plotData.getBoundingClientRect();
    const xPlotRatio = (xRange[1] - xRange[0]) / rect.width;
    const yPlotRatio = (yRange[1] - yRange[0]) / rect.height;
    
    const x = xRange[0] + (e.clientX - rect.left) * xPlotRatio;
    const y = yRange[1] - (e.clientY - rect.top) * yPlotRatio;
    
    setDrawnPoints(prev => [...prev, { x, y }]);
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  // Define plot data
  const data = [
    // Grid (always present)
    {
      x: [xRange[0], xRange[1]],
      y: [0, 0],
      mode: 'lines',
      line: { width: 1, color: 'black' },
      hoverinfo: 'none',
      showlegend: false
    },
    {
      x: [0, 0],
      y: [yRange[0], yRange[1]],
      mode: 'lines',
      line: { width: 1, color: 'black' },
      hoverinfo: 'none',
      showlegend: false
    },
    // User drawn function (if points exist)
    ...(drawnPoints.length > 0 ? [{
      x: drawnPoints.map(p => p.x),
      y: drawnPoints.map(p => p.y),
      mode: 'lines',
      line: { width: 3, color: 'red' },
      name: 'Your Prediction'
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
      title: 'x'
    },
    yaxis: {
      range: yRange,
      zeroline: false,
      gridcolor: '#e0e0e0',
      title: 'y'
    },
    dragmode: isTestMode ? false : 'pan',
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

  return (
    <div 
      ref={plotRef}
      style={{ position: 'relative', width: '100%', height: '100%' }}
      onMouseDown={isTestMode ? handleMouseDown : undefined}
      onMouseMove={isTestMode ? handleMouseMove : undefined}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <Plot
        data={data}
        layout={layout}
        config={config}
        style={{ width: '100%', height: '100%' }}
        useResizeHandler={true}
      />
    </div>
  );
};

export default CoordinateSystem;