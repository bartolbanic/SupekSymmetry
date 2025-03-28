import * as math from "mathjs";

/**
 * Evaluate a mathematical function string for given x values
 * @param {string} functionStr - The function as a string, e.g., "sin(x) + x^2"
 * @param {Array<number>} xValues - Array of x values to evaluate the function at
 * @returns {Array<number>} - Array of y values
 */
export const evaluateFunction = (functionStr, xValues) => {
  if (
    !functionStr ||
    typeof functionStr !== "string" ||
    functionStr.trim() === ""
  ) {
    console.error("Invalid function string:", functionStr);
    throw new Error("Function string cannot be empty");
  }

  if (!xValues || !Array.isArray(xValues) || xValues.length === 0) {
    console.error("Invalid x values:", xValues);
    throw new Error("X values must be a non-empty array");
  }

  try {
    // Log for debugging
    console.log(
      `Evaluating function "${functionStr}" for ${xValues.length} x values`,
    );

    // Pre-process the function string to ensure it's properly formatted
    // Replace common math functions with their math.js equivalents if needed
    let processedFunctionStr = functionStr
      .replace(/\bsin\b/g, "sin")
      .replace(/\bcos\b/g, "cos")
      .replace(/\btan\b/g, "tan")
      .replace(/\basin\b/g, "asin")
      .replace(/\bacos\b/g, "acos")
      .replace(/\batan\b/g, "atan")
      .replace(/\bsqrt\b/g, "sqrt")
      .replace(/\babs\b/g, "abs")
      .replace(/\blog\b/g, "log")
      .replace(/\bexp\b/g, "exp")
      .replace(/\^/g, "**"); // Replace ^ with ** for exponentiation

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
          console.warn(
            `Validation failed at x=${testX}: ${pointError.message}`,
          );
        }
      }

      // If all test points failed, the function is likely invalid
      if (!validationSuccessful) {
        console.warn("Function validation failed at all test points");
        // Don't throw yet - the user might be in the middle of typing
      }
    } catch (validationError) {
      console.error("Function validation error:", validationError);
      // Don't throw yet - they might be in the middle of typing
    }

    // Compile the function for efficiency
    let compiledFunction;
    try {
      compiledFunction = math.compile(processedFunctionStr);
    } catch (compileError) {
      console.error("Error compiling function:", compileError);
      return xValues.map(() => null); // Return null for all values to avoid crashing
    }

    // Evaluate for each x value
    const results = xValues.map((x) => {
      try {
        if (typeof x !== "number" || isNaN(x)) {
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

    console.log(
      `Function evaluation complete, valid results: ${results.filter((r) => r !== null).length}/${results.length}`,
    );
    return results;
  } catch (err) {
    console.error("Error compiling function:", err);
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
    console.error("Invalid arrays for MSE calculation", { predicted, actual });
    throw new Error("Both arrays must be defined");
  }

  if (!Array.isArray(predicted) || !Array.isArray(actual)) {
    console.error("Expected arrays for MSE calculation", { predicted, actual });
    throw new Error("Both inputs must be arrays");
  }

  if (predicted.length !== actual.length) {
    console.error(
      `Arrays have different lengths: ${predicted.length} vs ${actual.length}`,
    );
    throw new Error("Arrays must have the same length");
  }

  console.log(`Calculating MSE between ${predicted.length} values`);

  // Filter out null, undefined, and non-numeric values
  const validPairs = predicted
    .map((p, i) => [p, actual[i]])
    .filter(
      ([p, a]) =>
        p !== null &&
        a !== null &&
        p !== undefined &&
        a !== undefined &&
        typeof p === "number" &&
        typeof a === "number" &&
        !isNaN(p) &&
        !isNaN(a) &&
        isFinite(p) &&
        isFinite(a),
    );

  console.log(`Valid pairs for MSE: ${validPairs.length}/${predicted.length}`);

  if (validPairs.length === 0) {
    console.warn("No valid pairs for MSE calculation");
    return 100; // Return a high error value instead of Infinity
  }

  const squaredDiffs = validPairs.map(([p, a]) => Math.pow(p - a, 2));
  const mse =
    squaredDiffs.reduce((sum, diff) => sum + diff, 0) / validPairs.length;

  console.log(`MSE calculated: ${mse}`);
  return mse;
};

export const calculateRMSE = (predicted, actual) => {
  const mse = calculateMSE(predicted, actual);
  return Math.sqrt(mse);
};

export const calculateMAE = (predicted, actual) => {
  if (!predicted || !actual) {
    console.error("Invalid arrays for MAE calculation", { predicted, actual });
    throw new Error("Both arrays must be defined");
  }

  if (!Array.isArray(predicted) || !Array.isArray(actual)) {
    console.error("Expected arrays for MAE calculation", { predicted, actual });
    throw new Error("Both inputs must be arrays");
  }

  if (predicted.length !== actual.length) {
    console.error(
      `Arrays have different lengths: ${predicted.length} vs ${actual.length}`,
    );
    throw new Error("Arrays must have the same length");
  }

  console.log(`Calculating MAE between ${predicted.length} values`);

  // Filter out null, undefined, and non-numeric values
  const validPairs = predicted
    .map((p, i) => [p, actual[i]])
    .filter(
      ([p, a]) =>
        p !== null &&
        a !== null &&
        p !== undefined &&
        a !== undefined &&
        typeof p === "number" &&
        typeof a === "number" &&
        !isNaN(p) &&
        !isNaN(a) &&
        isFinite(p) &&
        isFinite(a),
    );

  console.log(`Valid pairs for MAE: ${validPairs.length}/${predicted.length}`);

  if (validPairs.length === 0) {
    console.warn("No valid pairs for MAE calculation");
    return 100; // Return a high error value instead of Infinity
  }

  const absDiffs = validPairs.map(([p, a]) => Math.abs(p - a));
  const mae = absDiffs.reduce((sum, diff) => sum + diff, 0) / validPairs.length;

  console.log(`MAE calculated: ${mae}`);
  return mae;
};

export const calculateFunctionSimilarity = (predicted, actual) => {
  // Calculate MSE using the existing function
  const mse = calculateMSE(predicted, actual);

  // For a similarity metric, we need to transform the MSE
  // MSE ranges from 0 (perfect match) to potentially infinity

  // We'll use an exponential decay function to map MSE to a 0-100 scale
  // similarity = 100 * e^(-k * MSE)
  // where k is a scaling factor that determines how quickly similarity drops as MSE increases

  // Calculate the range of the actual values to adapt the scaling factor
  const validActual = actual.filter(
    (a) =>
      a !== null &&
      a !== undefined &&
      typeof a === "number" &&
      !isNaN(a) &&
      isFinite(a),
  );

  if (validActual.length === 0) {
    console.warn("No valid actual values for similarity calculation");
    return 0; // Return minimum similarity
  }

  const maxActual = Math.max(...validActual);
  const minActual = Math.min(...validActual);
  const range = Math.max(1, maxActual - minActual); // Ensure minimum range of 1

  // Dynamic scaling factor based on data range
  // This makes the metric adaptive to the scale of the data
  const k = 1 / (0.1 * range * range);

  // Calculate similarity score (0-100)
  const similarity = 100 * Math.exp(-k * mse);

  // Round to 2 decimal places for readability
  return Math.round(similarity * 100) / 100;
};

/**
 * Compute cubic spline coefficients for a set of points
 * @param {Array<{x: number, y: number}>} points - Array of points sorted by x
 * @returns {Object} - Cubic spline coefficients
 */
const computeSplineCoefficients = (points) => {
  const n = points.length;
  if (n < 3) return null; // Need at least 3 points for cubic spline

  const x = points.map(p => p.x);
  const y = points.map(p => p.y);
  
  // Calculate h (differences between consecutive x values)
  const h = [];
  for (let i = 0; i < n - 1; i++) {
    h.push(x[i + 1] - x[i]);
  }
  
  // Calculate alpha coefficients
  const alpha = [0]; // First alpha is 0
  for (let i = 1; i < n - 1; i++) {
    alpha.push(3 * ((y[i + 1] - y[i]) / h[i] - (y[i] - y[i - 1]) / h[i - 1]));
  }
  
  // Calculate coefficients for the tridiagonal system
  const l = [1];
  const mu = [0];
  const z = [0];
  
  for (let i = 1; i < n - 1; i++) {
    l.push(2 * (x[i + 1] - x[i - 1]) - h[i - 1] * mu[i - 1]);
    mu.push(h[i] / l[i]);
    z.push((alpha[i] - h[i - 1] * z[i - 1]) / l[i]);
  }
  
  // Add final values
  l.push(1);
  z.push(0);
  
  // Calculate the cubic spline coefficients
  const a = [...y]; // a coefficients are just the y values
  const b = [];
  const c = Array(n).fill(0);
  const d = [];
  
  // Work backwards to find all coefficients
  for (let j = n - 2; j >= 0; j--) {
    c[j] = z[j] - mu[j] * c[j + 1];
    b.push((a[j + 1] - a[j]) / h[j] - h[j] * (c[j + 1] + 2 * c[j]) / 3);
    d.push((c[j + 1] - c[j]) / (3 * h[j]));
  }
  
  // Reverse the arrays that were built backwards
  b.reverse();
  d.reverse();
  
  return { a, b, c, d, x };
};

/**
 * Ensure a set of points satisfies the vertical line test (each x has a unique y)
 * @param {Array<{x: number, y: number}>} points - Array of drawn points
 * @returns {Array<{x: number, y: number}>} - Points that satisfy the vertical line test
 */
export const enforceVerticalLineTest = (points) => {
  if (!points || points.length === 0) return [];
  
  console.log(`Enforcing vertical line test on ${points.length} points`);
  
  // Group points by x value (rounded to 2 decimal places for numerical stability)
  const pointsByX = {};
  
  points.forEach(point => {
    // Skip invalid points
    if (!point || typeof point.x !== 'number' || typeof point.y !== 'number' || 
        isNaN(point.x) || isNaN(point.y)) {
      return;
    }
    
    // Round x to 2 decimal places to group nearby points
    const roundedX = Math.round(point.x * 100) / 100;
    
    if (!pointsByX[roundedX]) {
      pointsByX[roundedX] = [];
    }
    
    pointsByX[roundedX].push(point);
  });
  
  // For each x, keep only one y (average of all y values at that x)
  const filteredPoints = [];
  Object.keys(pointsByX).forEach(x => {
    const xPoints = pointsByX[x];
    if (xPoints.length === 1) {
      // If there's only one point at this x, use it directly
      filteredPoints.push(xPoints[0]);
    } else {
      // If there are multiple points, use the average y value
      const avgY = xPoints.reduce((sum, p) => sum + p.y, 0) / xPoints.length;
      filteredPoints.push({ x: parseFloat(x), y: avgY });
    }
  });
  
  // Sort by x coordinate
  filteredPoints.sort((a, b) => a.x - b.x);
  
  console.log(`Reduced to ${filteredPoints.length} unique x points`);
  return filteredPoints;
};

/**
 * Smooth a set of points using cubic spline interpolation
 * @param {Array<{x: number, y: number}>} points - Array of drawn points
 * @returns {Array<{x: number, y: number}>} - Smoothed points
 */
export const smoothPoints = (points) => {
  if (!points || points.length < 3) {
    console.warn("Not enough points for smoothing, need at least 3 points");
    return points; // Return original points if not enough for smoothing
  }
  
  console.log(`Smoothing ${points.length} points with cubic spline`);
  
  // First enforce the vertical line test
  const functionPoints = enforceVerticalLineTest(points);
  
  if (functionPoints.length < 3) {
    console.warn("Not enough valid points for smoothing after enforcing vertical line test");
    return functionPoints;
  }
  
  // Calculate cubic spline coefficients
  const coeffs = computeSplineCoefficients(functionPoints);
  if (!coeffs) {
    console.warn("Could not compute spline coefficients");
    return functionPoints;
  }
  
  // Generate a denser set of points for smooth plotting
  const { a, b, c, d, x } = coeffs;
  const numSegments = x.length - 1;
  
  // Create 10 points per segment for smooth rendering
  const smoothedPoints = [];
  
  for (let i = 0; i < numSegments; i++) {
    const segmentPoints = 10;
    const dx = (x[i + 1] - x[i]) / segmentPoints;
    
    for (let j = 0; j <= segmentPoints; j++) {
      // Skip the last point except for the final segment
      if (j === segmentPoints && i < numSegments - 1) continue;
      
      const xi = x[i] + j * dx;
      const t = xi - x[i];
      
      // Cubic polynomial: a + b*t + c*t^2 + d*t^3
      const yi = a[i] + b[i] * t + c[i] * t * t + d[i] * t * t * t;
      
      smoothedPoints.push({ x: xi, y: yi });
    }
  }
  
  console.log(`Generated ${smoothedPoints.length} smoothed points`);
  return smoothedPoints;
};

/**
 * Interpolate drawn points to match x values
 * @param {Array<{x: number, y: number}>} points - Array of drawn points
 * @param {Array<number>} xValues - Array of x values to interpolate at
 * @param {boolean} useSmoothing - Whether to apply cubic spline smoothing
 * @returns {Array<number>} - Interpolated y values
 */
export const interpolatePoints = (points, xValues, useSmoothing = false) => {
  if (!points || points.length === 0) {
    console.warn("No points to interpolate");
    return xValues.map(() => null);
  }
  
  // Log for debugging
  console.log(
    `Interpolating between ${points.length} points for ${xValues.length} x values`,
  );
  
  // Filter out any invalid points
  const validPoints = points.filter(
    (p) =>
      p &&
      typeof p.x === "number" &&
      typeof p.y === "number" &&
      !isNaN(p.x) &&
      !isNaN(p.y),
  );
  
  if (validPoints.length === 0) {
    console.warn("No valid points to interpolate");
    return xValues.map(() => null);
  }
  
  // Enforce function format and smooth if requested
  let processedPoints;
  
  if (useSmoothing && validPoints.length >= 3) {
    // Apply the vertical line test and smoothing
    processedPoints = smoothPoints(validPoints);
  } else {
    // Just enforce the vertical line test
    processedPoints = enforceVerticalLineTest(validPoints);
    
    // If we have very few points after enforcing vertical line test, use original
    if (processedPoints.length < validPoints.length / 3) {
      console.warn("Too many points lost during vertical line test, using original points");
      processedPoints = validPoints;
    }
  }
  
  // Sort by x coordinate
  const sortedPoints = [...processedPoints].sort((a, b) => a.x - b.x);
  
  // If there's only one point, return that y for all x values
  if (sortedPoints.length === 1) {
    return xValues.map(() => sortedPoints[0].y);
  }
  
  return xValues.map((x) => {
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
        // Linear interpolation between the two closest points
        if (p1.x === p2.x) return p1.y; // Avoid division by zero
        return p1.y + ((p2.y - p1.y) * (x - p1.x)) / (p2.x - p1.x);
      }
    }
    
    // Fallback (should not reach here given the checks above)
    console.warn(`Interpolation fallback used for x=${x}`);
    return sortedPoints[sortedPoints.length - 1].y;
  });
};
