-- Migration: Enable RLS on subscribers and digests tables
-- Fixes Supabase Security Advisor errors: tables without RLS in public schema
-- are accessible to anyone via the anon key + REST API.
--
-- Run this in the Supabase SQL Editor (Dashboard → SQL → New query)
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Enable RLS on subscribers table
ALTER TABLE subscribers ENABLE ROW LEVEL SECURITY;

-- 2. Enable RLS on digests table
ALTER TABLE digests ENABLE ROW LEVEL SECURITY;

-- With RLS enabled and NO policies defined, all access via anon/authenticated
-- roles is blocked by default. Our API routes use the service role key, which
-- bypasses RLS, so they continue to work unchanged.
