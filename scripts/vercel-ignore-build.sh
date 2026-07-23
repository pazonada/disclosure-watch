#!/bin/bash
# Vercel "Ignored Build Step" script.
# Exit 0 = cancel build (don't deploy)
# Exit 1 = proceed with build
#
# Content JSON is fetched from GitHub raw at request time (see lib/content.ts)
# with a 5-minute Next.js fetch cache. That means content commits DO NOT need
# a rebuild — new content is live within 5 min of hitting `main`. Only code,
# config, or dependency changes require a rebuild.
#
# So: skip builds for anything under content/. Build everything else.
#
# Prior lesson: skipping by individual filename inside content/ bit us twice
# (site stuck at stale deployment because a "trigger" file didn't change).
# The refactor to request-time GitHub raw fetches removes that failure mode
# entirely — the whole content/ tree is safe to skip because it isn't bundled.

CHANGED=$(git diff --name-only HEAD~1 HEAD 2>/dev/null || echo "")

if [ -z "$CHANGED" ]; then
  echo "Could not determine changed files — proceeding with build."
  exit 1
fi

NON_CONTENT=$(echo "$CHANGED" | grep -v -E '^content/' || true)
if [ -n "$NON_CONTENT" ]; then
  echo "Non-content files changed — proceeding with build:"
  echo "$NON_CONTENT"
  exit 1
fi

echo "Only content/ files changed — skipping build (content is fetched at request time):"
echo "$CHANGED"
exit 0
