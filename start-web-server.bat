@echo off
setlocal

set "ROOT_DIR=%~dp0"
set "WEB_DIR=%ROOT_DIR%project-web"
set "PORT=%~1"
if "%PORT%"=="" set "PORT=8080"

if not exist "%WEB_DIR%\index.html" (
  echo [ERROR] Cannot find project-web folder: "%WEB_DIR%"
  exit /b 1
)

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js not found. Install Node.js and retry.
  exit /b 1
)

pushd "%WEB_DIR%"
if errorlevel 1 (
  echo [ERROR] Failed to enter web directory.
  exit /b 1
)

echo [1/2] Generating games manifest...
powershell -ExecutionPolicy Bypass -File ".\scripts\generate-manifest.ps1"
if errorlevel 1 (
  echo [ERROR] Manifest generation failed.
  popd
  exit /b 1
)

echo [2/2] Starting server: http://localhost:%PORT%/index.html
node ".\scripts\static-server.js" "%WEB_DIR%" "%PORT%"

popd
endlocal
