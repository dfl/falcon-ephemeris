#!/bin/bash
# Deploy the Meridian Clock demo to Cloudflare Pages (pages.dev). Needs wrangler authenticated
# (CLOUDFLARE_API_TOKEN, as in ~/work/dsp/db303/web/deploy.sh).
set -e
cd "$(dirname "$0")/.."   # repo root

PROJECT="meridian-clock"

npm run bundle
node demo/build.mjs

# Create the Pages project once (ignore error if it already exists), then deploy the built dir.
wrangler pages project create "$PROJECT" --production-branch main 2>/dev/null || true
wrangler pages deploy demo/build --project-name "$PROJECT" --branch main --commit-dirty=true
