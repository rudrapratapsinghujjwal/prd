@echo off
echo Starting PRD Manager Local Server...
echo.
echo Please open the following URL in your browser: http://localhost:8000
echo.
echo Press Ctrl+C to stop the server.
echo.

python -m http.server 8000 2>NUL || python3 -m http.server 8000 2>NUL || (
    echo Python not found. Trying Node.js http-server...
    npx http-server -p 8000 2>NUL
) || (
    echo.
    echo Error: Could not start a local server.
    echo Please ensure you have Python installed (python.org) or Node.js (nodejs.org).
    echo Alternatively, use the "Live Server" extension in VS Code.
    pause
)
