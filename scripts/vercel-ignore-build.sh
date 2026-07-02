#!/bin/bash
# Vercel "Ignored Build Step" script.
# Exit 0 = cancel build (don't deploy)
# Exit 1 = proceed with build
#
# Vercel serverless routes read content JSON from the deployment's frozen
# filesystem — new content committed AFTER a deployment is invisible to
# visitors until the next build. That means content-only commits DO need
# a build to reach production; the original "ISR will revalidate" claim
# was wrong. But building on EVERY auto-ingest commit (2/day) is more
# than we need.
#
# Compromise:
#   - Build when anything OUTSIDE content/ changes (code, config, deps).
#   - Build when content/weekly-summary.json changes — that's the file
#     driving the homepage's featured summary. Auto-ingest updates it
#     ~once/day when there's genuinely new content, so this is our
#     natural cadence for freshness.
#   - Build when content/documents.json changes — the AARO scraper +
#     daily NARA/Congress ingest add new primary docs here, and the
#     /documents page is a headline surface.
#   - Skip only for narrower content changes (news.json, ingest-meta.json,
#     events.json, qa-reports/, etc.). Those still get updated in git
#     but visitors won't notice a 24-hour lag on news items.

CHANGED=$(git diff --name-only HEAD~1 HEAD 2>/dev/null || echo "")

if [ -z "$CHANGED" ]; then
  echo "Could not determine changed files — proceeding with build."
  exit 1
fi

# Any file outside content/ forces a build.
NON_CONTENT=$(echo "$CHANGED" | grep -v '^content/' || true)
if [ -n "$NON_CONTENT" ]; then
  echo "Non-content files changed — proceeding with build:"
  echo "$NON_CONTENT"
  exit 1
fi

# Within content/, some files are user-visible enough that we should
# rebuild when they change.
BUILD_TRIGGERING_CONTENT=$(echo "$CHANGED" | grep -E '^content/(weekly-summary|documents)\.json$' || true)
if [ -n "$BUILD_TRIGGERING_CONTENT" ]; then
  echo "Homepage/documents content changed — proceeding with build:"
  echo "$BUILD_TRIGGERING_CONTENT"
  exit 1
fi

echo "Only low-visibility content changed — skipping build:"
echo "$CHANGED"
exit 0
