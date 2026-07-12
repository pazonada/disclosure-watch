#!/bin/bash
# Vercel "Ignored Build Step" script.
# Exit 0 = cancel build (don't deploy)
# Exit 1 = proceed with build
#
# Vercel serverless routes read content JSON from the deployment's frozen
# filesystem — new content committed after a deployment is invisible to
# visitors until the next build. That means every content commit that
# changes user-facing data needs a build to reach production.
#
# The ONLY files we skip builds for are internal metadata that doesn't
# render anywhere on the site: content/ingest-meta.json (tracks when
# ingest last ran + counts). Everything else — news.json, documents.json,
# events.json, weekly-summary.json, milestones.json, qa-reports/*, and
# anything outside content/ — is user-visible and warrants a build.
#
# Previous versions tried to be clever and skip builds for news.json,
# events.json, etc. That kept the site stuck at a stale deployment for
# ~6 days at a time whenever no "trigger" file changed. Not worth the
# tiny build-minute savings.

CHANGED=$(git diff --name-only HEAD~1 HEAD 2>/dev/null || echo "")

if [ -z "$CHANGED" ]; then
  echo "Could not determine changed files — proceeding with build."
  exit 1
fi

# Every file that isn't purely internal metadata triggers a build.
USER_VISIBLE=$(echo "$CHANGED" | grep -v -E '^content/ingest-meta\.json$' || true)
if [ -n "$USER_VISIBLE" ]; then
  echo "User-visible files changed — proceeding with build:"
  echo "$USER_VISIBLE"
  exit 1
fi

echo "Only internal metadata changed — skipping build:"
echo "$CHANGED"
exit 0
