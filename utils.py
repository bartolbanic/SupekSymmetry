import numpy as np
import sympy as sp
from scipy.interpolate import interp1d

def evaluate_function(function_str, x_values):
    """
    Evaluate a mathematical function string for given x values.
    
    Args:
        function_str (str): The function as a string, e.g., "sin(x) + x^2"
        x_values (np.ndarray): Array of x values to evaluate the function at
    
    Returns:
        np.ndarray: Array of y values
    """
    x = sp.Symbol('x')
    # Replace ^ with ** for Python-compatible power notation
    function_str = function_str.replace('^', '**')
    
    # Parse the function using sympy
    expr = sp.sympify(function_str)
    
    # Convert the sympy expression to a numpy-compatible function
    f = sp.lambdify(x, expr, 'numpy')
    
    # Evaluate the function for each x value
    return f(x_values)

def calculate_mse(predicted, actual):
    """
    Calculate the Mean Squared Error between predicted and actual values.
    
    Args:
        predicted (np.ndarray): Array of predicted y values
        actual (np.ndarray): Array of actual y values
    
    Returns:
        float: The MSE value
    """
    return np.mean((predicted - actual) ** 2)

def sample_points(points, x_samples):
    """
    Sample y values from drawn points at the given x coordinates using interpolation.
    
    Args:
        points (list): List of (x, y) coordinate tuples from user drawing
        x_samples (np.ndarray): Array of x coordinates to sample at
    
    Returns:
        np.ndarray: Array of interpolated y values
    """
    if not points:
        return np.zeros_like(x_samples)
    
    # Extract x and y arrays from the points
    x_drawn = np.array([p[0] for p in points])
    y_drawn = np.array([p[1] for p in points])
    
    # Remove duplicate x values (keep the last occurrence)
    unique_indices = []
    seen_x = set()
    for i in range(len(x_drawn) - 1, -1, -1):
        if x_drawn[i] not in seen_x:
            unique_indices.append(i)
            seen_x.add(x_drawn[i])
    
    unique_indices.reverse()
    x_unique = x_drawn[unique_indices]
    y_unique = y_drawn[unique_indices]
    
    # Sort by x coordinate
    sort_idx = np.argsort(x_unique)
    x_unique = x_unique[sort_idx]
    y_unique = y_unique[sort_idx]
    
    # Check if we have enough points for interpolation
    if len(x_unique) < 2:
        # Not enough points for interpolation, return zeros
        return np.zeros_like(x_samples)
    
    # Create interpolation function
    f = interp1d(x_unique, y_unique, kind='linear', bounds_error=False, fill_value=(y_unique[0], y_unique[-1]))
    
    # Sample y values at the requested x coordinates
    y_samples = f(x_samples)
    
    return y_samples
