#!/bin/bash

# Get the directory where this script is located
BASEDIR=$(dirname "$0")
cd "$BASEDIR"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check for Python 3
if ! command_exists python3; then
    echo "Python 3 is not installed. Please install it from https://www.python.org/downloads/"
    echo "Press any key to exit..."
    read -n 1 -s
    exit 1
fi

# Create virtual environment if it doesn't exist
if [ ! -d ".venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv .venv
fi

# Activate virtual environment
echo "Activating virtual environment..."
source .venv/bin/activate

# Install requirements if not already installed
if ! pip show flask >/dev/null 2>&1; then
    echo "Installing required packages..."
    pip install flask
fi

# Start the Flask server in a new Terminal window
echo "Starting Laserovo server..."
osascript <<END
    tell application "Terminal"
        do script "cd '$PWD' && source .venv/bin/activate && python3 server.py"
        activate
    end tell
END

# Wait for server to start
sleep 3

# Open the app in default browser
open "http://127.0.0.1:5001/"

echo "Laserovo is now running in your default web browser."
echo "To stop the server, close the Terminal window where it's running."
