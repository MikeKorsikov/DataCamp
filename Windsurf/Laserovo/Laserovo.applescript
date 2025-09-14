try
    -- Check if server is already running
    do shell script "lsof -i :5001 > /dev/null 2>&1 || exit 1"
    display notification "Server is already running" with title "Laserovo"
    do shell script "open -a 'Google Chrome' 'http://localhost:5001'"
on error
    -- Start the server if not running
    display notification "Starting Laserovo server..." with title "Laserovo"
    do shell script "cd /Users/mykolakorsikov/DataCamp/Windsurf/Laserovo && nohup python3 server.py > /dev/null 2>&1 &"
    delay 3 -- Give the server more time to start
    do shell script "open -a 'Google Chrome' 'http://localhost:5001'"
end try
