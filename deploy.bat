@echo off
REM Install Firebase CLI globally (run once): npm install -g firebase-tools
REM Then you can use firebase commands directly without npx

echo Building and deploying Text-to-Speech App...
echo.

ng build && firebase deploy

if errorlevel 0 (
    echo.
    echo SUCCESS! App deployed to: https://chibsspeechtotext.web.app
) else (
    echo.
    echo Build or deploy failed!
)

echo.
pause
