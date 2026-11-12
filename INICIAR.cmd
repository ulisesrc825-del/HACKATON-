@echo off
cd /d "%~dp0"
set "UPTEX_NODE=node"
where node >nul 2>nul
if errorlevel 1 (
  if exist "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" (
    set "UPTEX_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
  ) else (
    echo Instala Node.js 22.12 o posterior para iniciar Inventario UPTex.
    pause
    exit /b 1
  )
)
if not exist "node_modules\mysql2\package.json" (
  echo Primero instala las dependencias con npm ci.
  pause
  exit /b 1
)
"%UPTEX_NODE%" server/dev.js
pause
