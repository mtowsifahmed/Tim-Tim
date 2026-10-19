@echo off
REM Builds the Windows installer (needs Node.js and Rust). The installer appears under desktop\src-tauri\target\release\bundle
cd /d "%~dp0desktop"
if not exist node_modules ( call npm install )
call npm run build
pause
