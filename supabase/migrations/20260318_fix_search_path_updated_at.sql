-- Migration: Fix mutable search_path on update_updated_at_column function
-- Fixes Supabase Security Advisor warning: "Function Search Path Mutable"
--
-- Run this in the Supabase SQL Editor (Dashboard → SQL → New query)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;
