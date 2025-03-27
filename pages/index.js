import { useState, useEffect } from 'react';
import Head from 'next/head';
import Sidebar from '../components/Sidebar';
import CoordinateSystem from '../components/CoordinateSystem';

export default function Home() {
  // State management
  const [currentFunction, setCurrentFunction] = useState('');
  const [xRange, setXRange] = useState([-10, 10]);
  const [yRange, setYRange] = useState([-10, 10]);
  const [isTestMode, setIsTestMode] = useState(false);
  const [showActualFunction, setShowActualFunction] = useState(false);
  const [drawnPoints, setDrawnPoints] = useState([]);
  const [history, setHistory] = useState([]);

  // Load history from localStorage when component mounts
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('functionPredictionHistory');
      if (savedHistory) {
        setHistory(JSON.parse(savedHistory));
      }
    } catch (err) {
      console.error('Error loading history from localStorage:', err);
    }
  }, []);

  // Save history to localStorage when it changes
  useEffect(() => {
    try {
      localStorage.setItem('functionPredictionHistory', JSON.stringify(history));
    } catch (err) {
      console.error('Error saving history to localStorage:', err);
    }
  }, [history]);

  // Function handlers
  const handleFunctionSubmit = (functionString) => {
    setCurrentFunction(functionString);
    setDrawnPoints([]);
    setShowActualFunction(false);
  };

  const handleRangeChange = (newXRange, newYRange) => {
    setXRange(newXRange);
    setYRange(newYRange);
  };

  const handleResetDrawing = () => {
    setDrawnPoints([]);
  };

  return (
    <>
      <Head>
        <title>Function Prediction Challenge</title>
        <meta name="description" content="Test your mathematical intuition by predicting function graphs" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="app-container">
        <div className="sidebar-container">
          <Sidebar 
            onFunctionSubmit={handleFunctionSubmit}
            onRangeChange={handleRangeChange}
            xRange={xRange}
            yRange={yRange}
            currentFunction={currentFunction}
            drawnPoints={drawnPoints}
            onResetDrawing={handleResetDrawing}
            isTestMode={isTestMode}
            setIsTestMode={setIsTestMode}
            onShowActualFunction={setShowActualFunction}
            history={history}
            setHistory={setHistory}
          />
        </div>
        
        <div className="main-content">
          <CoordinateSystem 
            xRange={xRange}
            yRange={yRange}
            functionString={currentFunction}
            onDrawingComplete={(points) => {
              // Additional processing if needed
            }}
            showActualFunction={showActualFunction}
            drawnPoints={drawnPoints}
            setDrawnPoints={setDrawnPoints}
            isTestMode={isTestMode}
          />
        </div>
      </div>
    </>
  );
}