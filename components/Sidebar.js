import React, { useState, useEffect } from 'react';
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
  const [functionPreview, setFunctionPreview] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [xMin, setXMin] = useState(xRange[0]);
  const [xMax, setXMax] = useState(xRange[1]);
  const [yMin, setYMin] = useState(yRange[0]);
  const [yMax, setYMax] = useState(yRange[1]);
  const [score, setScore] = useState(null);
  
  // Preview function as it's typed
  useEffect(() => {
    try {
      if (functionInput.trim()) {
        // Only validate if there's at least 1 character
        if (functionInput.length > 0) {
          // Test if function is valid using a small array of values
          const testXValues = [0, 1, -1];
          try {
            evaluateFunction(functionInput, testXValues);
            setFunctionPreview(functionInput);
            setErrorMessage('');
          } catch (err) {
            console.log('Function validation error:', err);
            setFunctionPreview('');
            // Extract the most useful part of the error message
            const errorMsg = err.message.includes('Invalid function:') 
              ? err.message 
              : `Invalid function: ${err.message}`;
            setErrorMessage(errorMsg);
          }
        } else {
          setFunctionPreview('');
          setErrorMessage('');
        }
      } else {
        setFunctionPreview('');
        setErrorMessage('');
      }
    } catch (err) {
      console.error('Unexpected error in function preview:', err);
      setFunctionPreview('');
      setErrorMessage(`Error: ${err.message}`);
    }
  }, [functionInput]);

  const handleFunctionSubmit = () => {
    if (!functionInput.trim()) {
      setErrorMessage('Please enter a function.');
      return;
    }

    try {
      // Test if function is valid with multiple test values
      const testValues = [-1, 0, 1];
      try {
        // First validate the function with test values
        const results = evaluateFunction(functionInput, testValues);
        
        // Check if we got valid results
        const validResults = results.filter(r => r !== null && !isNaN(r) && isFinite(r));
        if (validResults.length === 0) {
          setErrorMessage('Function produces invalid results for all test values.');
          return;
        }
        
        // If we get here, function is valid
        setErrorMessage('');
        onFunctionSubmit(functionInput);
        setIsTestMode(true);
        console.log('Function submitted successfully:', functionInput);
      } catch (evalError) {
        console.error('Function evaluation error:', evalError);
        // Provide a more user-friendly error message
        const errorMsg = evalError.message.includes('Invalid function:') 
          ? evalError.message 
          : `Invalid function: ${evalError.message}`;
        setErrorMessage(errorMsg);
      }
    } catch (err) {
      console.error('Unexpected error in function submission:', err);
      setErrorMessage(`Error: ${err.message}`);
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
      // Generate evenly spaced x values for evaluation
      const numPoints = 100;
      const xStep = (xRange[1] - xRange[0]) / numPoints;
      const xValues = Array.from({ length: numPoints + 1 }, (_, i) => xRange[0] + i * xStep);
      
      console.log("Evaluating actual function:", currentFunction);
      
      // Safely evaluate the actual function with more robust error handling
      let actualValues;
      try {
        actualValues = evaluateFunction(currentFunction, xValues);
        
        // Count valid results
        const validCount = actualValues.filter(v => v !== null && !isNaN(v) && isFinite(v)).length;
        console.log(`Function evaluation produced ${validCount}/${actualValues.length} valid points`);
        
        if (validCount === 0) {
          throw new Error("Function could not be evaluated for any x values in the range");
        }
      } catch (funcError) {
        console.error("Function evaluation error:", funcError);
        setErrorMessage(`Error evaluating function: ${funcError.message}`);
        return;
      }
      
      // Interpolate user drawn points to match x values
      const userValues = interpolatePoints(drawnPoints, xValues);
      console.log(`Interpolated ${userValues.filter(v => v !== null).length}/${userValues.length} user values`);
      
      // Calculate MSE with error handling
      let mse;
      try {
        mse = calculateMSE(userValues, actualValues);
        console.log("MSE calculated:", mse);
        
        if (isNaN(mse) || !isFinite(mse)) {
          throw new Error("Could not calculate a valid score");
        }
      } catch (mseError) {
        console.error("MSE calculation error:", mseError);
        setErrorMessage(`Error calculating score: ${mseError.message}`);
        return;
      }
      
      // Scale to a 0-100 score, higher is better (with safety checks)
      const calculatedScore = Math.max(0, 100 * (1 - Math.min(1, mse / 100)));
      console.log("Final score calculated:", calculatedScore);
      
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
      
      // Show actual function and exit test mode
      console.log("Showing actual function");
      onShowActualFunction(true);
      setIsTestMode(false);
    } catch (err) {
      console.error("Unexpected error in score calculation:", err);
      setErrorMessage(`Error: ${err.message}`);
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
              {functionPreview && (
                <div className={styles.functionPreview}>
                  <span>Current function: </span>
                  <span className={styles.previewText}>{functionPreview}</span>
                </div>
              )}
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