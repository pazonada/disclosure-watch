#!/bin/bash
# Vercel "Ignored Build Step" script.
# Exit 0 = cancel build (don't deploy)
# Exit 1 = proceed with build
#
# We skip builds when the only changes are to content JSON files,
# because pages use ISR (revalidate: 3600) to pick up new content
# without needing a full redeploy.

# Get list of changed files between this commit and its parent
CHANGED=$(git diff --name-only HEAD~1 HEAD 2>/dev/null || echo "")

if [ -z "$CHANGED" ]; then
  # Couldn't determine changes — build to be safe
  echo "Could not determine changed files — proceeding with build."
  exit 1
fi

# Check if ANY non-content file changed
NON_CONTENT=$(echo "$CHANGED" | grep -v '^content/' || true)

if [ -z "$NON_CONTENT" ]; then
  echo "Only content/ files changed — skipping build (ISR will revalidate)."
  echo "Changed files:"
  echo "$CHANGED"
  exit 0
fi

echo "Non-content files changed — proceeding with build:"
echo "$NON_CONTENT"
exit 1
