#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting Lead Generation Development Environment${NC}"
echo ""

# Check for command line arguments
INCLUDE_FASTAPI=false
if [ "$1" == "--with-fastapi" ] || [ "$1" == "-f" ]; then
    INCLUDE_FASTAPI=true
    echo -e "${BLUE}Including FastAPI server on port 8000${NC}"
    echo ""
fi

# Function to check if port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Function to kill process on port
kill_port() {
    local port=$1
    local pid=$(lsof -Pi :$port -sTCP:LISTEN -t 2>/dev/null)
    if [ ! -z "$pid" ]; then
        echo -e "${YELLOW}  Killing existing process on port $port (PID: $pid)${NC}"
        kill $pid 2>/dev/null
        sleep 2
    fi
}

# Check Node.js
echo -e "${BLUE}📦 Checking Node.js...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    exit 1
fi

# Check Python
echo -e "${BLUE}📦 Checking Python...${NC}"
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python 3 is not installed${NC}"
    exit 1
fi

# Check and handle FastAPI port (8000) if requested
if [ "$INCLUDE_FASTAPI" = true ]; then
    echo -e "${BLUE}🔍 Checking FastAPI port 8000...${NC}"
    if check_port 8000; then
        echo -e "${YELLOW}  Port 8000 is already in use${NC}"
        read -p "  Kill existing process and restart? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            kill_port 8000
        else
            echo -e "${YELLOW}  Keeping existing FastAPI on port 8000${NC}"
            SKIP_FASTAPI=true
        fi
    fi
fi

# Check and handle backend port (5001)
echo -e "${BLUE}🔍 Checking Express backend port 5001...${NC}"
if check_port 5001; then
    echo -e "${YELLOW}  Port 5001 is already in use${NC}"
    read -p "  Kill existing process and restart? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        kill_port 5001
    else
        echo -e "${YELLOW}  Keeping existing backend on port 5001${NC}"
        SKIP_BACKEND=true
    fi
fi

# Check and handle frontend port (3000)
echo -e "${BLUE}🔍 Checking frontend port 3000...${NC}"
if check_port 3000; then
    echo -e "${YELLOW}  Port 3000 is already in use${NC}"
    read -p "  Kill existing process and restart? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        kill_port 3000
    else
        echo -e "${YELLOW}  Keeping existing frontend on port 3000${NC}"
        SKIP_FRONTEND=true
    fi
fi

# Start FastAPI if requested and not skipped
if [ "$INCLUDE_FASTAPI" = true ] && [ -z "$SKIP_FASTAPI" ]; then
    echo ""
    echo -e "${GREEN}🐍 Starting FastAPI backend on port 8000...${NC}"
    cd api
    python3 main.py &
    FASTAPI_PID=$!
    cd ..

    # Wait for FastAPI to start
    sleep 3

    if check_port 8000; then
        echo -e "${GREEN}  ✅ FastAPI started successfully (PID: $FASTAPI_PID)${NC}"
    else
        echo -e "${RED}  ❌ FastAPI failed to start${NC}"
        echo -e "${YELLOW}  Check if FastAPI and uvicorn are installed${NC}"
        echo -e "${YELLOW}  Run: pip3 install --user --break-system-packages fastapi uvicorn${NC}"
    fi
elif [ "$INCLUDE_FASTAPI" = true ]; then
    echo -e "${GREEN}  ✅ FastAPI already running on port 8000${NC}"
fi

# Start Express backend if not skipped
if [ -z "$SKIP_BACKEND" ]; then
    echo ""
    echo -e "${GREEN}🔧 Starting Express backend on port 5001...${NC}"
    node simple-server.js &
    BACKEND_PID=$!

    # Wait for backend to start
    sleep 3

    if check_port 5001; then
        echo -e "${GREEN}  ✅ Express backend started successfully (PID: $BACKEND_PID)${NC}"
    else
        echo -e "${RED}  ❌ Express backend failed to start${NC}"
        echo -e "${YELLOW}  Check if all dependencies are installed${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}  ✅ Express backend already running on port 5001${NC}"
fi

# Start frontend if not skipped
if [ -z "$SKIP_FRONTEND" ]; then
    echo ""
    echo -e "${GREEN}⚛️  Starting React frontend on port 3000...${NC}"
    cd frontend
    npm start &
    FRONTEND_PID=$!
    cd ..

    echo -e "${YELLOW}  Frontend is starting (this may take a moment)...${NC}"
else
    echo -e "${GREEN}  ✅ Frontend already running on port 3000${NC}"
fi

# Function to cleanup background processes
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 Shutting down servers...${NC}"

    if [ ! -z "$FASTAPI_PID" ]; then
        kill $FASTAPI_PID 2>/dev/null
        echo -e "${GREEN}  ✅ FastAPI stopped${NC}"
    fi

    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null
        echo -e "${GREEN}  ✅ Express backend stopped${NC}"
    fi

    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null
        echo -e "${GREEN}  ✅ Frontend stopped${NC}"
    fi

    exit 0
}

# Trap Ctrl+C and cleanup
trap cleanup SIGINT

# Final status
echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}🎉 Development Environment Ready!${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo ""
echo -e "  Frontend:        ${BLUE}http://localhost:3000${NC}"
echo -e "  Express Backend: ${BLUE}http://localhost:5001${NC}"
if [ "$INCLUDE_FASTAPI" = true ]; then
    echo -e "  FastAPI Backend: ${BLUE}http://localhost:8000${NC}"
fi
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all servers${NC}"
echo ""
echo -e "${YELLOW}Usage:${NC}"
echo -e "  ${BLUE}./start-dev.sh${NC}              - Start frontend and Express backend"
echo -e "  ${BLUE}./start-dev.sh --with-fastapi${NC} - Include FastAPI server on port 8000"
echo -e "  ${BLUE}./start-dev.sh -f${NC}            - Short form for --with-fastapi"
echo ""

# Keep script running and monitor processes
while true; do
    # Check if processes are still running (if we started them)
    if [ ! -z "$BACKEND_PID" ] && ! kill -0 $BACKEND_PID 2>/dev/null; then
        echo -e "${RED}Backend process crashed. Restarting...${NC}"
        node simple-server.js &
        BACKEND_PID=$!
    fi

    sleep 5
done