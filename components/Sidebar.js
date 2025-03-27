import React, { useState } from 'react';
import styles from '../styles/Sidebar.module.css';
import { calculateMSE, interpolatePoints, evaluateFunction } from '../utils/mathFunctions';

const Sidebar = ({ 
  onFunctionSubmit, 
  onRangeChange, 
  xRange,
  yRange,
  currentFunction,
  drawnPoints,
  onResetDrawing,
  isTestMode,
  setIsTestMode,
  onShowActualFunction,
  history,
  setHistory
}) => {
  const [functionInput, setFunctionInput] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [xMin, setXMin] = useState(xRange[0]);
  const [xMax, setXMax] = useState(xRange[1]);
  const [yMin, setYMin] = useState(yRange[0]);
  const [yMax, setYMax] = useState(yRange[1]);
  const [score, setScore] = useState(null);

  const handleFunctionSubmit = () => {
    if (!functionInput.trim()) {
      setErrorMessage('Please enter a function.');
      return;
    }

    try {
      // Test if function is valid
      const testX = 0;
      evaluateFunction(functionInput, [testX]);
      
      // If we get here, function is valid
      setErrorMessage('');
      onFunctionSubmit(functionInput);
      setIsTestMode(true);
    } catch (err) {
      setErrorMessage(`Invalid function: ${err.message}`);
    }
  };

  const handleRangeChange = () => {
    // Validate ranges
    if (xMin >= xMax) {
      setErrorMessage('X min must be less than X max');
      return;
    }
    
    if (yMin >= yMax) {
      setErrorMessage('Y min must be less than Y max');
      return;
    }
    
    setErrorMessage('');
    onRangeChange([xMin, xMax], [yMin, yMax]);
  };

  const handleSubmitPrediction = () => {
    if (drawnPoints.length < 2) {
      setErrorMessage('Please draw your prediction first.');
      return;
    }

    setErrorMessage('');
    
    // Calculate score
    try {
      const numPoints = 100;
      const xStep = (xRange[1] - xRange[0]) / numPoints;
      const xValues = Array.from({ length: numPoints + 1 }, (_, i) => xRange[0] + i * xStep);
      
      const actualValues = evaluateFunction(currentFunction, xValues);
      const userValues = interpolatePoints(drawnPoints, xValues);
      
      const mse = calculateMSE(userValues, actualValues);
      // Scale to a 0-100 score, higher is better
      const calculatedScore = Math.max(0, 100 * (1 - Math.min(1, mse / 100)));
      
      setScore(calculatedScore);
      
      // Add to history
      setHistory([
        ...history,
        {
          function: currentFunction,
          score: calculatedScore.toFixed(2),
          timestamp: new Date().toISOString()
        }
      ]);
      
      // Show actual function
      onShowActualFunction(true);
      setIsTestMode(false);
    } catch (err) {
      setErrorMessage(`Error calculating score: ${err.message}`);
    }
  };

  const handleTryAgain = () => {
    setScore(null);
    onResetDrawing();
    onShowActualFunction(false);
    setFunctionInput('');
    onFunctionSubmit('');
    setIsTestMode(false);
  };

  return (
    <div className={styles.sidebar}>
      <h1 className={styles.title}>Function Prediction</h1>
      
      {!currentFunction ? (
        <>
          <section className={styles.section}>
            <h2>Function Input</h2>
            <div className={styles.inputGroup}>
              <input
                type="text"
                placeholder="e.g., sin(x) or x^2 - 2*x + 1"
                value={functionInput}
                onChange={(e) => setFunctionInput(e.target.value)}
                className={styles.input}
              />
              <button onClick={handleFunctionSubmit} className={styles.button}>
                Test Function
              </button>
            </div>
          </section>
          
          <section className={styles.section}>
            <h2>Coordinate Range</h2>
            <div className={styles.rangeContainer}>
              <div className={styles.rangeGroup}>
                <label>X Range:</label>
                <div className={styles.rangeInputs}>
                  <input
                    type="number"
                    value={xMin}
                    onChange={(e) => setXMin(parseFloat(e.target.value))}
                    className={styles.rangeInput}
                    step="1"
                  />
                  <span className={styles.rangeSeparator}>to</span>
                  <input
                    type="number"
                    value={xMax}
                    onChange={(e) => setXMax(parseFloat(e.target.value))}
                    className={styles.rangeInput}
                    step="1"
                  />
                </div>
              </div>
              
              <div className={styles.rangeGroup}>
                <label>Y Range:</label>
                <div className={styles.rangeInputs}>
                  <input
                    type="number"
                    value={yMin}
                    onChange={(e) => setYMin(parseFloat(e.target.value))}
                    className={styles.rangeInput}
                    step="1"
                  />
                  <span className={styles.rangeSeparator}>to</span>
                  <input
                    type="number"
                    value={yMax}
                    onChange={(e) => setYMax(parseFloat(e.target.value))}
                    className={styles.rangeInput}
                    step="1"
                  />
                </div>
              </div>
              
              <button onClick={handleRangeChange} className={styles.button}>
                Update Range
              </button>
            </div>
          </section>
        </>
      ) : (
        <section className={styles.section}>
          <h2>Draw Your Prediction</h2>
          <p className={styles.instructions}>
            Draw your prediction of the function directly on the coordinate system.
          </p>
          
          {isTestMode ? (
            <>
              <p className={styles.functionHidden}>
                Function is hidden until you submit your prediction.
              </p>
              <div className={styles.buttonGroup}>
                <button onClick={handleSubmitPrediction} className={styles.buttonPrimary}>
                  Submit Prediction
                </button>
                <button onClick={onResetDrawing} className={styles.buttonSecondary}>
                  Clear Drawing
                </button>
              </div>
            </>
          ) : score !== null ? (
            <div className={styles.resultSection}>
              <h3>Your Result</h3>
              <div className={styles.scoreDisplay}>
                <span className={styles.scoreLabel}>Accuracy Score:</span>
                <span className={styles.scoreValue}>{score.toFixed(2)}%</span>
              </div>
              <div className={styles.actualFunction}>
                <p>The actual function was:</p>
                <pre className={styles.functionDisplay}>{currentFunction}</pre>
              </div>
              <button onClick={handleTryAgain} className={styles.buttonPrimary}>
                Try Another Function
              </button>
            </div>
          ) : null}
        </section>
      )}
      
      {errorMessage && (
        <div className={styles.errorMessage}>
          {errorMessage}
        </div>
      )}
      
      <section className={styles.section}>
        <h2>History</h2>
        {history.length > 0 ? (
          <div className={styles.historyList}>
            {history.map((entry, index) => (
              <div key={index} className={styles.historyItem}>
                <div className={styles.historyFunction}>{entry.function}</div>
                <div className={styles.historyScore}>{entry.score}%</div>
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.emptyHistory}>
            Your prediction history will appear here.
          </p>
        )}
        
        {history.length > 0 && (
          <button 
            onClick={() => setHistory([])} 
            className={styles.buttonSmall}
          >
            Clear History
          </button>
        )}
      </section>
    </div>
  );
};

export default Sidebar;