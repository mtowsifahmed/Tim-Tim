@echo off
REM Kill any stale background instances holding the WebView2 lock
taskkill /F /IM Tim-Tim.exe 2>nul
taskkill /F /IM timtim-desktop.exe 2>nul
REM Launch Tim-Tim native desktop app
start "" "%~dp0Tim-Tim.exe"
