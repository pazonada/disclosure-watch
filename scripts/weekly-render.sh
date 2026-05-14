#!/bin/bash
# Weekly Disclosure Watch render — runs both reel and carousel renders.
#
# Triggered by ~/Library/LaunchAgents/com.disclosurewatch.weekly-render.plist
# every Monday at 8 AM (or the next wake-up after that).
#
# Logs go to ./logs/weekly-YYYY-MM-DD.log inside this repo.

set -u

PROJECT_DIR="/Users/audubondougherty/dev/disclosurewatch"
LOG_DIR="$PROJECT_DIR/logs"
TS="$(date +%Y-%m-%d_%H%M%S)"
LOG_FILE="$LOG_DIR/weekly-$TS.log"

# Ensure standard paths are available when launchd invokes us with a stripped env.
export PATH="/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin"

mkdir -p "$LOG_DIR"
cd "$PROJECT_DIR" || exit 1

{
  echo "===================================================================="
  echo "Weekly render started at $(date)"
  echo "Working directory: $(pwd)"
  echo "Node: $(/usr/local/bin/node --version 2>/dev/null || echo 'not found')"
  echo "===================================================================="

  echo
  echo "--- Reel render ---"
  /usr/local/bin/npm run reel:render
  REEL_EXIT=$?
  echo "Reel exit: $REEL_EXIT"

  echo
  echo "--- Carousel render ---"
  /usr/local/bin/npm run carousel:render
  CAROUSEL_EXIT=$?
  echo "Carousel exit: $CAROUSEL_EXIT"

  echo
  echo "===================================================================="
  echo "Weekly render finished at $(date)"
  echo "Reel exit code: $REEL_EXIT"
  echo "Carousel exit code: $CAROUSEL_EXIT"
  echo "===================================================================="
} >> "$LOG_FILE" 2>&1

# Prune logs older than 60 days
find "$LOG_DIR" -name 'weekly-*.log' -type f -mtime +60 -delete 2>/dev/null
