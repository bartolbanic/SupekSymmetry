import streamlit as st
import numpy as np
import sympy as sp
import pandas as pd
import matplotlib.pyplot as plt
from streamlit_drawable_canvas import st_canvas
from utils import evaluate_function, calculate_mse, sample_points

# Set page title and configuration
st.set_page_config(
    page_title="Mathematical Intuition Tester",
    page_icon="📊",
    layout="wide"
)

# Initialize session state for storing history
if 'history' not in st.session_state:
    st.session_state.history = []

if 'current_function' not in st.session_state:
    st.session_state.current_function = ""

if 'drawing_submitted' not in st.session_state:
    st.session_state.drawing_submitted = False

if 'current_canvas_data' not in st.session_state:
    st.session_state.current_canvas_data = None

if 'x_range' not in st.session_state:
    st.session_state.x_range = (-10, 10)
    
if 'y_range' not in st.session_state:
    st.session_state.y_range = (-10, 10)

# Main layout
st.title("Mathematical Function Prediction")

# Create sidebar for function input and history
with st.sidebar:
    st.header("Function Input")
    
    # Function input
    function_input = st.text_input(
        "Enter a mathematical function y(x):",
        placeholder="e.g., sin(x) or x^2 - 2*x + 1",
        help="Use standard Python syntax for functions with variable x"
    )
    
    # X and Y range inputs
    st.subheader("Coordinate System Range")
    col1, col2 = st.columns(2)
    with col1:
        x_min = st.number_input("X min", value=st.session_state.x_range[0])
    with col2:
        x_max = st.number_input("X max", value=st.session_state.x_range[1])
    
    col3, col4 = st.columns(2)
    with col3:
        y_min = st.number_input("Y min", value=st.session_state.y_range[0])
    with col4:
        y_max = st.number_input("Y max", value=st.session_state.y_range[1])
    
    # Update ranges in session state
    st.session_state.x_range = (x_min, x_max)
    st.session_state.y_range = (y_min, y_max)
    
    # Set function and reset drawing state when "Test Function" button is clicked
    if st.button("Test Function"):
        if function_input:
            try:
                # Test if function is valid
                x = sp.Symbol('x')
                expr = sp.sympify(function_input)
                # If we get here, function is valid
                st.session_state.current_function = function_input
                st.session_state.drawing_submitted = False
                st.session_state.current_canvas_data = None
                st.success("Function set! Now draw your prediction on the canvas.")
            except Exception as e:
                st.error(f"Invalid function: {str(e)}")
        else:
            st.warning("Please enter a function first.")
    
    # Display history
    st.header("History")
    
    if st.session_state.history:
        history_df = pd.DataFrame(st.session_state.history)
        st.dataframe(history_df[['Function', 'Score']], hide_index=True)
        
        if st.button("Clear History"):
            st.session_state.history = []
            st.rerun()
    else:
        st.info("Your prediction history will appear here.")

# Main content area
if not st.session_state.current_function:
    st.info("Enter a function in the sidebar and click 'Test Function' to start.")
else:
    st.subheader(f"Current Function: Hidden until you submit your prediction")
    
    # Create a column layout for better space utilization
    col1, col2 = st.columns([2, 1])
    
    with col1:
        # Create the drawable canvas for the user to draw their prediction
        st.subheader("Draw your prediction")
        
        # Calculate canvas dimensions
        canvas_width = 600
        canvas_height = 400
        
        # Calculate coordinate system scales
        x_min, x_max = st.session_state.x_range
        y_min, y_max = st.session_state.y_range
        
        # Create the canvas with coordinate grid background
        fig, ax = plt.subplots(figsize=(canvas_width/100, canvas_height/100))
        ax.grid(True)
        ax.axhline(y=0, color='k', linestyle='-', alpha=0.3)
        ax.axvline(x=0, color='k', linestyle='-', alpha=0.3)
        ax.set_xlim(x_min, x_max)
        ax.set_ylim(y_min, y_max)
        ax.set_xlabel('x')
        ax.set_ylabel('y')
        
        # Save the figure to use as background
        fig.tight_layout()
        plt.close(fig)
        
        # Create the canvas
        canvas_result = st_canvas(
            fill_color="rgba(255, 165, 0, 0.3)",
            stroke_width=3,
            stroke_color="#ff0000",
            background_color="#ffffff",
            background_image=fig,
            update_streamlit=True,
            width=canvas_width,
            height=canvas_height,
            drawing_mode="freedraw",
            key="canvas",
        )
        
        # Store the canvas data in session state
        if canvas_result.json_data is not None:
            st.session_state.current_canvas_data = canvas_result.json_data
        
        # Add a submit button
        if st.button("Submit Prediction"):
            if st.session_state.current_canvas_data and any(len(obj["points"]) > 0 for obj in st.session_state.current_canvas_data["objects"] if "points" in obj):
                st.session_state.drawing_submitted = True
                st.rerun()
            else:
                st.error("Please draw your prediction before submitting.")
    
    # If prediction has been submitted, show the comparison
    if st.session_state.drawing_submitted and st.session_state.current_canvas_data:
        with col2:
            st.subheader("Results")
            
            # Get drawn points from the canvas
            drawn_points = []
            for obj in st.session_state.current_canvas_data["objects"]:
                if "points" in obj:
                    for point in obj["points"]:
                        # Convert from canvas coordinates to function coordinates
                        canvas_x, canvas_y = point["x"], point["y"]
                        x_min, x_max = st.session_state.x_range
                        y_min, y_max = st.session_state.y_range
                        
                        # Map canvas coordinates to function space
                        x_coord = x_min + (canvas_x / canvas_width) * (x_max - x_min)
                        # Invert y-axis (canvas y grows downward, function y grows upward)
                        y_coord = y_max - (canvas_y / canvas_height) * (y_max - y_min)
                        
                        drawn_points.append((x_coord, y_coord))
            
            # Sort drawn points by x-coordinate for consistent comparison
            drawn_points.sort(key=lambda p: p[0])
            
            # Sample points from the actual function
            x = sp.Symbol('x')
            x_values = np.linspace(x_min, x_max, 100)
            
            try:
                # Try to evaluate the function
                y_values = evaluate_function(st.session_state.current_function, x_values)
                
                # Generate sample points from the user's drawing
                user_samples = sample_points(drawn_points, x_values)
                
                # Calculate MSE
                mse = calculate_mse(user_samples, y_values)
                score = max(0, 100 * (1 - min(1, mse / 100)))  # Scale to a 0-100 score
                
                # Display score
                st.metric("Accuracy Score", f"{score:.2f}%")
                
                # Add to history
                st.session_state.history.append({
                    "Function": st.session_state.current_function,
                    "Score": f"{score:.2f}%",
                    "MSE": mse
                })
                
                # Display actual function
                st.subheader("Actual Function")
                st.latex(f"y = {sp.latex(sp.sympify(st.session_state.current_function))}")
                
                # Create visualization of both the actual function and the user's drawing
                fig, ax = plt.subplots(figsize=(5, 4))
                
                # Plot the actual function
                ax.plot(x_values, y_values, 'b-', label='Actual Function')
                
                # Plot the user's drawn points
                x_drawn, y_drawn = zip(*drawn_points) if drawn_points else ([], [])
                ax.plot(x_drawn, y_drawn, 'r-', label='Your Prediction', alpha=0.7)
                
                ax.grid(True)
                ax.axhline(y=0, color='k', linestyle='-', alpha=0.3)
                ax.axvline(x=0, color='k', linestyle='-', alpha=0.3)
                ax.set_xlim(x_min, x_max)
                ax.set_ylim(y_min, y_max)
                ax.set_xlabel('x')
                ax.set_ylabel('y')
                ax.legend()
                
                st.pyplot(fig)
                
                # Add button to try another function
                if st.button("Try Another Function"):
                    st.session_state.current_function = ""
                    st.session_state.drawing_submitted = False
                    st.session_state.current_canvas_data = None
                    st.rerun()
                
            except Exception as e:
                st.error(f"Error evaluating function: {str(e)}")
                # Reset submission state
                st.session_state.drawing_submitted = False
