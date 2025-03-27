export default function handler(req, res) {
  res.status(200).json({ 
    status: 'ok',
    message: 'Function Prediction App API is running',
    timestamp: new Date().toISOString()
  });
}