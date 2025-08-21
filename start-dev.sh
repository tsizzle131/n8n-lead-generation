#!/bin/bash

echo "🚀 Starting Lead Generation UI Development Environment..."
echo ""

# Check if Python dependencies are available
echo "📦 Checking Python dependencies..."
if ! python3 -c "import openai" 2>/dev/null; then
    echo "⚠️  OpenAI Python package not found. Installing..."
    pip3 install openai
fi

# Start the Express API server in background
echo "🔧 Starting API server..."
node simple-server.js &
API_PID=$!

# Wait a moment for the API server to start
sleep 2

# Start the React development server
echo "⚛️  Starting React frontend..."
cd frontend && npm start &
REACT_PID=$!

echo ""
echo "✅ Development environment started!"
echo ""
echo "📱 Frontend: http://localhost:3000"
echo "🔗 API Server: http://localhost:8000"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Function to cleanup background processes
cleanup() {
    echo ""
    echo "🛑 Stopping servers..."
    kill $API_PID 2>/dev/null
    kill $REACT_PID 2>/dev/null
    exit 0
}

# Trap Ctrl+C and cleanup
trap cleanup SIGINT

# Wait for processes to complete
wait