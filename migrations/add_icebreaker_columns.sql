-- Add icebreaker columns to gmaps_businesses table
-- These fields store AI-generated personalized outreach content

ALTER TABLE public.gmaps_businesses
ADD COLUMN IF NOT EXISTS icebreaker TEXT,
ADD COLUMN IF NOT EXISTS subject_line VARCHAR(255),
ADD COLUMN IF NOT EXISTS icebreaker_generated_at TIMESTAMPTZ;

-- Create index for querying businesses with icebreakers
CREATE INDEX IF NOT EXISTS idx_gmaps_businesses_icebreaker
ON public.gmaps_businesses(icebreaker_generated_at)
WHERE icebreaker IS NOT NULL;

-- Add comment to explain the columns
COMMENT ON COLUMN public.gmaps_businesses.icebreaker IS 'AI-generated personalized icebreaker message for outreach';
COMMENT ON COLUMN public.gmaps_businesses.subject_line IS 'AI-generated email subject line optimized for open rates';
COMMENT ON COLUMN public.gmaps_businesses.icebreaker_generated_at IS 'Timestamp when the icebreaker was generated';
