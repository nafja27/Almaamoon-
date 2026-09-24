@echo off
REM Almaamoon Adventure - Windows launcher (needed for the microphone)
cd /d "%~dp0"
start "" "http://localhost:8765/index.html"
python -m http.server 8765 || py -m http.server 8765
pause
