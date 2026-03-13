-- Add frequency column to alert_preferences
-- Values: 'realtime' (immediate alerts) or 'daily' (batched once per day)
ALTER TABLE alert_preferences
  ADD COLUMN IF NOT EXISTS frequency TEXT NOT NULL DEFAULT 'realtime'
  CHECK (frequency IN ('realtime', 'daily'));
