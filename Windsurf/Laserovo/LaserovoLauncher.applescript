-- Set the path to your project directory
set projectPath to "/Users/mykolakorsikov/DataCamp/Windsurf/Laserovo"

try
    -- Check if server is already running
    do shell script "lsof -i :5001 > /dev/null 2>&1 || exit 1"
    display notification "Laserovo is already running" with title "Laserovo"
    do shell script "open -a 'Google Chrome' 'http://localhost:5001/'"
on error
    -- Start the server if not running
    display notification "Starting Laserovo server..." with title "Laserovo"
    
    -- Start the server in a new Terminal window
    tell application "Terminal"
        activate
        do script "cd " & quoted form of projectPath & " && source .venv/bin/activate && python3 server.py"
    end tell
    
    -- Wait for server to start
    delay 3
    
    -- Open in Chrome
    do shell script "open -a 'Google Chrome' 'http://localhost:5001/'"
    
    display notification "Laserovo is now running" with title "Laserovo"
end try
