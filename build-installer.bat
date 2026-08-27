@echo off
title Billing Software - EXE Installer Builder
echo ========================================================
echo   Building Billing Software Standalone Windows EXE
echo ========================================================
echo.
echo Step 1: Installing electron packaging dependencies...
call npm install --save-dev electron electron-builder concurrently wait-on cross-env
echo.
echo Step 2: Building Next.js Frontend...
cd frontend
call npm run build
cd ..
echo.
echo Step 3: Packaging Desktop Executable (.exe)...
call npx electron-builder --win nsis portable
echo.
echo ========================================================
echo SUCCESS! Your EXE file is ready in the 'dist_exe' directory!
echo Look for 'Billing Setup 1.0.0.exe' or 'Billing 1.0.0.exe'
echo ========================================================
pause
