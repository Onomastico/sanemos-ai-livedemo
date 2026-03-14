#!/bin/bash
# deploy.sh - One-command deployment to Google Cloud Run
# Usage: ./deploy.sh
# Requires: gcloud CLI authenticated, env vars set in .env.local or exported

set -e

# Load from .env.local if exists
if [ -f .env.local ]; then
  export $(grep -v '^#' .env.local | xargs)
fi

if [ -z "$NEXT_PUBLIC_GEMINI_API_KEY" ]; then
  echo "Error: NEXT_PUBLIC_GEMINI_API_KEY not set. Export it or add to .env.local"
  exit 1
fi

echo "Deploying Sanemos Live to Cloud Run..."
gcloud builds submit --config cloudbuild.yaml \
  --substitutions="_NEXT_PUBLIC_GEMINI_API_KEY=${NEXT_PUBLIC_GEMINI_API_KEY},_NEXT_PUBLIC_ACCESS_CODE=${NEXT_PUBLIC_ACCESS_CODE:-}"

echo "Deploy complete!"
echo "Run: gcloud run services describe sanemos-live --region=us-central1 --format='value(status.url)'"
