#!/usr/bin/env bash
# Deploy पुण्यात काय? to Google Cloud Run (source build via Cloud Build + root Dockerfile).
# Prereqs: gcloud auth login; a project with billing enabled; GEMINI_API_KEY in the environment.
set -euo pipefail
PROJECT="${PROJECT:?set PROJECT to your GCP project id}"
REGION="${REGION:-asia-south1}"
SERVICE="${SERVICE:-punyat-kay}"

gcloud config set project "$PROJECT"
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com secretmanager.googleapis.com

# Store the Gemini key in Secret Manager (never in the image or env file).
if ! gcloud secrets describe gemini-api-key >/dev/null 2>&1; then
  printf '%s' "$GEMINI_API_KEY" | gcloud secrets create gemini-api-key --data-file=- --replication-policy=automatic
else
  printf '%s' "$GEMINI_API_KEY" | gcloud secrets versions add gemini-api-key --data-file=-
fi
NUM=$(gcloud projects describe "$PROJECT" --format='value(projectNumber)')
gcloud secrets add-iam-policy-binding gemini-api-key \
  --member="serviceAccount:${NUM}-compute@developer.gserviceaccount.com" --role=roles/secretmanager.secretAccessor >/dev/null

gcloud run deploy "$SERVICE" --source . --region "$REGION" --allow-unauthenticated \
  --memory 512Mi --min-instances 1 --max-instances 1 --cpu-boost \
  --set-env-vars GEMINI_MODEL=gemini-3.5-flash \
  --set-secrets GEMINI_API_KEY=gemini-api-key:latest
