import * as math from 'mathjs';

/**
 * Evaluate a mathematical function string for given x values
 * @param {string} functionStr - The function as a string, e.g., "sin(x) + x^2"
 * @param {Array<number>} xValues - Array of x values to evaluate the function at
 * @returns {Array<number>} - Array of y values
 */
export const evaluateFunction = (functionStr, xValues) => {
  if (!functionStr || typeof functionStr !== 'string' || functionStr.trim() === '') {
    console.error('Invalid function string:', functionStr);
    throw new Error('Function string cannot be empty');
  }
  
  if (!xValues || !Array.isArray(xValues) || xValues.length === 0) {
    console.error('Invalid x values:', xValues);
    throw new Error('X values must be a non-empty array');
  }
  
  try {
    // Log for debugging
    console.log(`Evaluating function "${functionStr}" for ${xValues.length} x values`);
    
    // Pre-process the function string to ensure it's properly formatted
    // Replace common math functions with their math.js equivalents if needed
    let processedFunctionStr = functionStr
      .replace(/\bsin\b/g, 'sin')
      .replace(/\bcos\b/g, 'cos')
      .replace(/\btan\b/g, 'tan')
      .replace(/\basin\b/g, 'asin')
      .replace(/\bacos\b/g, 'acos')
      .replace(/\batan\b/g, 'atan')
      .replace(/\bsqrt\b/g, 'sqrt')
      .replace(/\babs\b/g, 'abs')
      .replace(/\blog\b/g, 'log')
      .replace(/\bexp\b/g, 'exp')
      .replace(/\^/g, '**'); // Replace ^ with ** for exponentiation
    
    console.log(`Processed function string: "${processedFunctionStr}"`);
    
    // Validate the function by evaluating it at a few test points before compiling
    // But don't throw an error during interactive typing, just log it
    try {
      // Test at three points
      const testPoints = [0, 1, -1];
      let validationSuccessful = false;
      
      for (const testX of testPoints) {
        try {
          const scope = { x: testX };
          const testResult = math.evaluate(processedFunctionStr, scope);
          
          // If we get at least one successful evaluation, consider it valid
          if (testResult !== undefined && !isNaN(testResult)) {
            validationSuccessful = true;
            break;
          }
        } catch (pointError) {
          // Just log individual point errors, but continue testing other points
          console.warn(`Validation failed at x=${testX}: ${pointError.message}`);
        }
      }
      
      // If all test points failed, the function is likely invalid
      if (!validationSuccessful) {
        console.warn('Function validation failed at all test points');
        // Don't throw yet - the user might be in the middle of typing
      }
    } catch (validationError) {
      console.error('Function validation error:', validationError);
      // Don't throw yet - they might be in the middle of typing
    }
    
    // Compile the function for efficiency
    let compiledFunction;
    try {
      compiledFunction = math.compile(processedFunctionStr);
    } catch (compileError) {
      console.error('Error compiling function:', compileError);
      return xValues.map(() => null); // Return null for all values to avoid crashing
    }
    
    // Evaluate for each x value
    const results = xValues.map(x => {
      try {
        if (typeof x !== 'number' || isNaN(x)) {
          console.warn(`Invalid x value: ${x}, using 0 instead`);
          x = 0;
        }
        
        const scope = { x: x };
        const result = compiledFunction.evaluate(scope);
        
        // Check if result is a valid number
        if (isNaN(result) || !isFinite(result)) {
          console.warn(`Invalid result for x=${x}: ${result}`);
          return null;
        }
        
        return result;
      } catch (err) {
        console.error(`Error evaluating at x=${x}:`, err);
        return null;
      }
    });
    
    console.log(`Function evaluation complete, valid results: ${results.filter(r => r !== null).length}/${results.length}`);
    return results;
    
  } catch (err) {
    console.error('Error compiling function:', err);
    throw new Error(`Invalid function: ${err.message}`);
  }
};

/**
 * Calculate the Mean Squared Error between predicted and actual values
 * @param {Array<number>} predicted - Array of predicted y values
 * @param {Array<number>} actual - Array of actual y values
 * @returns {number} - The MSE value
 */
export const calculateMSE = (predicted, actual) => {
  if (!predicted || !actual) {
    console.error('Invalid arrays for MSE calculation', { predicted, actual });
    throw new Error('Both arrays must be defined');
  }
  
  if (!Array.isArray(predicted) || !Array.isArray(actual)) {
    console.error('Expected arrays for MSE calculation', { predicted, actual });
    throw new Error('Both inputs must be arrays');
  }

  if (predicted.length !== actual.length) {
    console.error(`Arrays have different lengths: ${predicted.length} vs ${actual.length}`);
    throw new Error('Arrays must have the same length');
  }
  
  console.log(`Calculating MSE between ${predicted.length} values`);
  
  // Filter out null, undefined, and non-numeric values
  const validPairs = predicted.map((p, i) => [p, actual[i]])
    .filter(([p, a]) => 
      p !== null && a !== null && 
      p !== undefined && a !== undefined &&
      typeof p === 'number' && typeof a === 'number' &&
      !isNaN(p) && !isNaN(a) &&
      isFinite(p) && isFinite(a)
    );
  
  console.log(`Valid pairs for MSE: ${validPairs.length}/${predicted.length}`);
  
  if (validPairs.length === 0) {
    console.warn('No valid pairs for MSE calculation');
    return 100; // Return a high error value instead of Infinity
  }
  
  const squaredDiffs = validPairs.map(([p, a]) => Math.pow(p - a, 2));
  const mse = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / validPairs.length;
  
  console.log(`MSE calculated: ${mse}`);
  return mse;
};

/**
 * Interpolate drawn points to match x values
 * @param {Array<{x: number, y: number}>} points - Array of drawn points
 * @param {Array<number>} xValues - Array of x values to interpolate at
 * @returns {Array<number>} - Interpolated y values
 */
export const interpolatePoints = (points, xValues) => {
  if (!points || points.length === 0) {
    console.warn("No points to interpolate");
    return xValues.map(() => null);
  }
  
  // Log for debugging
  console.log(`Interpolating between ${points.length} points for ${xValues.length} x values`);
  
  // Filter out any invalid points
  const validPoints = points.filter(p => 
    p && typeof p.x === 'number' && typeof p.y === 'number' && 
    !isNaN(p.x) && !isNaN(p.y)
  );
  
  if (validPoints.length === 0) {
    console.warn("No valid points to interpolate");
    return xValues.map(() => null);
  }
  
  // Sort by x coordinate
  const sortedPoints = [...validPoints].sort((a, b) => a.x - b.x);
  
  // If there's only one point, return that y for all x values
  if (sortedPoints.length === 1) {
    return xValues.map(() => sortedPoints[0].y);
  }
  
  return xValues.map(x => {
    // If x is less than the first point, use the first point's y
    if (x < sortedPoints[0].x) {
      return sortedPoints[0].y;
    }
    
    // If x is greater than the last point, use the last point's y
    if (x > sortedPoints[sortedPoints.length - 1].x) {
      return sortedPoints[sortedPoints.length - 1].y;
    }
    
    // Find the two points to interpolate between
    for (let i = 0; i < sortedPoints.length - 1; i++) {
      const p1 = sortedPoints[i];
      const p2 = sortedPoints[i + 1];
      
      if (x >= p1.x && x <= p2.x) {
        // Linear interpolation
        if (p1.x === p2.x) return p1.y; // Avoid division by zero
        return p1.y + (p2.y - p1.y) * (x - p1.x) / (p2.x - p1.x);
      }
    }
    
    // Fallback (should not reach here given the checks above)
    console.warn(`Interpolation fallback used for x=${x}`);
    return sortedPoints[sortedPoints.length - 1].y;
  });
};