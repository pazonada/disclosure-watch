-- Migration: Add email verification codes for Insider alert preferences access
-- Run this in the Supabase SQL Editor (Dashboard > SQL > New query)

CREATE TABLE IF NOT EXISTS email_verification_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  session_token TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verified_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  session_expires_at TIMESTAMPTZ
);

-- Fast lookup when verifying a code
CREATE INDEX IF NOT EXISTS idx_verification_email_code
  ON email_verification_codes (email, code)
  WHERE verified_at IS NULL;

-- Fast lookup when checking session cookie
CREATE INDEX IF NOT EXISTS idx_verification_session_token
  ON email_verification_codes (session_token)
  WHERE session_token IS NOT NULL;

ALTER TABLE email_verification_codes ENABLE ROW LEVEL SECURITY;
