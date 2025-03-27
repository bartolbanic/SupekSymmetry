import * as math from 'mathjs';

/**
 * Evaluate a mathematical function string for given x values
 * @param {string} functionStr - The function as a string, e.g., "sin(x) + x^2"
 * @param {Array<number>} xValues - Array of x values to evaluate the function at
 * @returns {Array<number>} - Array of y values
 */
export const evaluateFunction = (functionStr, xValues) => {
  try {
    // Compile the function for efficiency
    const compiledFunction = math.compile(functionStr);
    
    // Evaluate for each x value
    return xValues.map(x => {
      try {
        const result = compiledFunction.evaluate({ x });
        // Check if result is a valid number
        return isNaN(result) ? null : result;
      } catch (err) {
        console.error(`Error evaluating at x=${x}:`, err);
        return null;
      }
    });
  } catch (err) {
    console.error('Error compiling function:', err);
    return xValues.map(() => null);
  }
};

/**
 * Calculate the Mean Squared Error between predicted and actual values
 * @param {Array<number>} predicted - Array of predicted y values
 * @param {Array<number>} actual - Array of actual y values
 * @returns {number} - The MSE value
 */
export const calculateMSE = (predicted, actual) => {
  if (predicted.length !== actual.length) {
    throw new Error('Arrays must have the same length');
  }
  
  // Filter out null values
  const validPairs = predicted.map((p, i) => [p, actual[i]])
    .filter(([p, a]) => p !== null && a !== null);
  
  if (validPairs.length === 0) {
    return Infinity;
  }
  
  const squaredDiffs = validPairs.map(([p, a]) => Math.pow(p - a, 2));
  return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / validPairs.length;
};

/**
 * Interpolate drawn points to match x values
 * @param {Array<{x: number, y: number}>} points - Array of drawn points
 * @param {Array<number>} xValues - Array of x values to interpolate at
 * @returns {Array<number>} - Interpolated y values
 */
export const interpolatePoints = (points, xValues) => {
  if (points.length === 0) {
    return xValues.map(() => null);
  }
  
  // Sort by x coordinate
  const sortedPoints = [...points].sort((a, b) => a.x - b.x);
  
  return xValues.map(x => {
    // If x is less than the first point or greater than the last, return null
    if (x < sortedPoints[0].x || x > sortedPoints[sortedPoints.length - 1].x) {
      return null;
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
    
    // If we get here, x is equal to the last point
    return sortedPoints[sortedPoints.length - 1].y;
  });
};