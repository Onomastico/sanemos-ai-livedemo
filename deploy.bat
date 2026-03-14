@echo off
REM deploy.bat - One-command deployment to Google Cloud Run
REM Usage: deploy.bat
REM Requires: gcloud CLI authenticated, env vars set in .env.local or exported

REM Load from .env.local if exists
if exist .env.local (
    for /f "usebackq tokens=1,* delims==" %%A in (".env.local") do (
        set "%%A=%%B"
    )
)

if "%NEXT_PUBLIC_GEMINI_API_KEY%"=="" (
    echo Error: NEXT_PUBLIC_GEMINI_API_KEY not set. Export it or add to .env.local
    exit /b 1
)

echo Deploying Sanemos Live to Cloud Run...
gcloud builds submit --config cloudbuild.yaml --substitutions="_NEXT_PUBLIC_GEMINI_API_KEY=%NEXT_PUBLIC_GEMINI_API_KEY%,_NEXT_PUBLIC_ACCESS_CODE=%NEXT_PUBLIC_ACCESS_CODE%"

echo Deploy complete!
echo Run: gcloud run services describe sanemos-live --region=us-central1 --format="value(status.url)"
