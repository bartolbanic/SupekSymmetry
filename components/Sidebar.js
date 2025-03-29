import React, { useState, useEffect, useRef } from 'react';
import styles from '../styles/Sidebar.module.css';
import { 
  calculateMSE, 
  calculateRMSE, 
  calculateMAE, 
  calculateFunctionSimilarity, 
  interpolatePoints, 
  evaluateFunction 
} from '../utils/mathFunctions';
import MathInputKeypad from './MathInputKeypad';

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
  const [tokens, setTokens] = useState(null);
  const [showKeypad, setShowKeypad] = useState(true); // Changed to true by default
  const functionInputRef = useRef(null);
  
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
    
    // Reset any previous errors first
    setErrorMessage('');
    
    try {
      // Quick validation with just a few test values
      const testValues = [-1, 0, 1];
      let validationPassed = false;
      
      try {
        const results = evaluateFunction(functionInput, testValues);
        
        // Consider validation successful if at least one valid result
        validationPassed = results.some(r => r !== null && !isNaN(r) && isFinite(r));
        
        if (!validationPassed) {
          setErrorMessage('Function produces invalid results. Please check your formula.');
          return;
        }
      } catch (evalError) {
        // Provide a concise, user-friendly error message
        const errorMsg = evalError.message.includes('Invalid function:') 
          ? evalError.message.replace('Invalid function:', 'Error:')
          : `Syntax error: ${evalError.message.split('.')[0]}`;
        
        setErrorMessage(errorMsg);
        return;
      }
      
      // If we reach here, the function is valid
      console.log('Function validated successfully:', functionInput);
      
      // Submit function and enter test mode immediately
      onFunctionSubmit(functionInput);
      setIsTestMode(true);
      
    } catch (err) {
      // Handle any unexpected errors
      console.error('Unexpected error in function submission:', err);
      setErrorMessage('Something went wrong. Please try a different function.');
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

  const [additionalMetrics, setAdditionalMetrics] = useState(null);

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
      
      // Interpolate user drawn points to match x values with smoothing applied
      const userValues = interpolatePoints(drawnPoints, xValues, true); // Use smoothing
      console.log(`Interpolated ${userValues.filter(v => v !== null).length}/${userValues.length} user values`);
      
      // Calculate various metrics
      let similarityResult, mse, rmse, mae;
      try {
        // Main metric: function similarity with token system (0-100 + tokens)
        similarityResult = calculateFunctionSimilarity(userValues, actualValues);
        console.log("Function similarity calculated:", similarityResult);
        
        // The result now contains both score and tokens
        const { score: similarityScore, tokens: earnedTokens } = similarityResult;
        
        // Calculate additional metrics for reference
        mse = calculateMSE(userValues, actualValues);
        rmse = calculateRMSE(userValues, actualValues);
        mae = calculateMAE(userValues, actualValues);
        
        console.log("Metrics - MSE:", mse, "RMSE:", rmse, "MAE:", mae);
        console.log("Earned tokens:", earnedTokens);
        
        if (isNaN(similarityScore) || !isFinite(similarityScore)) {
          throw new Error("Could not calculate a valid similarity score");
        }
        
        // Store additional metrics for display
        setAdditionalMetrics({
          mse: mse.toFixed(2),
          rmse: rmse.toFixed(2),
          mae: mae.toFixed(2)
        });
        
        // Set both score and tokens
        setScore(similarityScore);
        setTokens(earnedTokens);
        
      } catch (scoreError) {
        console.error("Score calculation error:", scoreError);
        setErrorMessage(`Error calculating score: ${scoreError.message}`);
        return;
      }
      
      // Add to history with tokens
      setHistory([
        ...history,
        {
          function: currentFunction,
          score: similarityScore.toFixed(2),
          tokens: earnedTokens,
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
    setTokens(null);
    setAdditionalMetrics(null);
    onResetDrawing();
    onShowActualFunction(false);
    setFunctionInput('');
    onFunctionSubmit('');
    setIsTestMode(false);
  };
  
  // Handle insertion of symbols from the math keypad
  const handleSymbolInsert = (symbolValue) => {
    // Get cursor position
    const cursorPos = functionInputRef.current?.selectionStart || functionInput.length;
    const beforeCursor = functionInput.substring(0, cursorPos);
    const afterCursor = functionInput.substring(cursorPos);
    
    // Insert the symbol at cursor position
    const newValue = beforeCursor + symbolValue + afterCursor;
    setFunctionInput(newValue);
    
    // Focus back on input after a short delay to allow React to update
    setTimeout(() => {
      if (functionInputRef.current) {
        functionInputRef.current.focus();
        // Place cursor after the inserted symbol
        const newCursorPos = cursorPos + symbolValue.length;
        functionInputRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 10);
  };

  return (
    <div className={styles.sidebar}>
      <h1 className={styles.title}>Function Prediction</h1>
      
      {!currentFunction ? (
        <>
          <section className={styles.section}>
            <h2>Function Input</h2>
            <div className={styles.inputGroup}>
              <div className={styles.inputWithKeypad}>
                <input
                  ref={functionInputRef}
                  type="text"
                  placeholder="e.g., sin(x) or x^2 - 2*x + 1"
                  value={functionInput}
                  onChange={(e) => setFunctionInput(e.target.value)}
                  className={styles.input}
                  onFocus={() => setShowKeypad(true)}
                />
                <button 
                  className={styles.toggleKeypadButton}
                  onClick={() => setShowKeypad(!showKeypad)}
                  title={showKeypad ? "Hide math symbols" : "Show math symbols"}
                >
                  {showKeypad ? "×" : "π"}
                </button>
              </div>

              {showKeypad && (
                <div className={styles.mathKeypadContainer}>
                  <MathInputKeypad onInsert={handleSymbolInsert} />
                </div>
              )}
              
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
              
              {/* New Token Display */}
              <div className={styles.tokenDisplay}>
                <span className={styles.tokenLabel}>Tokens Earned:</span>
                <div className={styles.tokenIcons}>
                  {/* Generate token icons based on earned tokens (0-5) */}
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span 
                      key={i} 
                      className={`${styles.tokenIcon} ${i < tokens ? styles.tokenEarned : styles.tokenEmpty}`}
                    >
                      ★
                    </span>
                  ))}
                </div>
              </div>
              
              {additionalMetrics && (
                <div className={styles.additionalMetrics}>
                  <h4>Additional Metrics</h4>
                  <div className={styles.metricsGrid}>
                    <div className={styles.metricItem}>
                      <span className={styles.metricLabel}>MSE:</span>
                      <span className={styles.metricValue}>{additionalMetrics.mse}</span>
                    </div>
                    <div className={styles.metricItem}>
                      <span className={styles.metricLabel}>RMSE:</span>
                      <span className={styles.metricValue}>{additionalMetrics.rmse}</span>
                    </div>
                    <div className={styles.metricItem}>
                      <span className={styles.metricLabel}>MAE:</span>
                      <span className={styles.metricValue}>{additionalMetrics.mae}</span>
                    </div>
                  </div>
                </div>
              )}
              
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
                <div className={styles.historyDetails}>
                  <span className={styles.historyScore}>{entry.score}%</span>
                  {entry.tokens && (
                    <span className={styles.historyTokens}>
                      {Array.from({ length: entry.tokens }).map((_, i) => (
                        <span key={i} className={styles.historyTokenIcon}>★</span>
                      ))}
                    </span>
                  )}
                </div>
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