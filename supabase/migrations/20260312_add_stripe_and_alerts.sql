-- Migration: Add Stripe subscription tracking and alert preferences
-- Run this in the Supabase SQL Editor (Dashboard → SQL → New query)

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Add Stripe columns to existing subscribers table
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE subscribers
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- Index for fast lookups when processing webhooks
CREATE INDEX IF NOT EXISTS idx_subscribers_stripe_customer
  ON subscribers (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_subscribers_stripe_subscription
  ON subscribers (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Create alert_preferences table
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS alert_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  subscriber_id UUID NOT NULL REFERENCES subscribers(id) ON DELETE CASCADE,
  trigger_documents BOOLEAN NOT NULL DEFAULT TRUE,
  trigger_hearings BOOLEAN NOT NULL DEFAULT TRUE,
  trigger_milestones BOOLEAN NOT NULL DEFAULT TRUE,
  trigger_news BOOLEAN NOT NULL DEFAULT FALSE,
  keywords TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Each subscriber gets exactly one preferences row
  CONSTRAINT unique_subscriber_prefs UNIQUE (subscriber_id)
);

-- Index for the dispatch query: find all paid+active subscribers with prefs
CREATE INDEX IF NOT EXISTS idx_alert_prefs_subscriber
  ON alert_preferences (subscriber_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Auto-update the updated_at timestamp
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_alert_prefs_updated_at ON alert_preferences;
CREATE TRIGGER set_alert_prefs_updated_at
  BEFORE UPDATE ON alert_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Row Level Security (RLS)
-- ─────────────────────────────────────────────────────────────────────────────
-- Since we use the service role key server-side, RLS won't block our API routes.
-- But we enable it as a safety net so no anonymous/public access is possible.

ALTER TABLE alert_preferences ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS by default, so no explicit policy needed for our API.
-- If you later add client-side Supabase auth, add policies here.
