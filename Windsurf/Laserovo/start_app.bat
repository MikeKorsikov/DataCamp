@echo off
setlocal
cd /d %~dp0

set "PYTHON_CMD="
where py >nul 2>nul
if %ERRORLEVEL%==0 (
  set "PYTHON_CMD=py -3"
) else (
  where python >nul 2>nul
  if %ERRORLEVEL%==0 (
    set "PYTHON_CMD=python"
  )
)

if not defined PYTHON_CMD (
  echo Python not found. Install from https://www.python.org/downloads/ and re-run.
  pause
  exit /b 1
)

REM Create venv if missing
if not exist .venv (
  %PYTHON_CMD% -m venv .venv
)

call .venv\Scripts\activate
%PYTHON_CMD% -m pip install --quiet flask

start "Laserovo Server" cmd /c %PYTHON_CMD% server.py
timeout /t 2 >nul
start "Laserovo App" http://127.0.0.1:5000/

endlocal

