-- Migration: Add icebreaker storage column
-- This allows storing generated icebreakers permanently in the database

ALTER TABLE raw_contacts 
ADD COLUMN IF NOT EXISTS mutiline_icebreaker TEXT;

-- Add comment for documentation
COMMENT ON COLUMN raw_contacts.mutiline_icebreaker IS 'AI-generated personalized icebreaker for outreach emails';