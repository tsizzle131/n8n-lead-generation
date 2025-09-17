#!/bin/bash

# Open Terminal and run the start script from the correct directory
osascript -e 'tell application "Terminal"
    activate
    do script "cd \"/Users/tristanwaite/n8n test\" && echo \"🚀 Starting Lead Generation System...\" && ./start-dev.sh"
end tell'