ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS company_mission TEXT;

ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS core_values TEXT[];

ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS company_story TEXT;

COMMENT ON COLUMN organizations.company_mission IS
'What the company does and why they exist. Used for AI-generated messaging context.';

COMMENT ON COLUMN organizations.core_values IS
'Array of 2-5 core values/principles (e.g., Quality, Transparency, Innovation). Used to align messaging with company culture.';

COMMENT ON COLUMN organizations.company_story IS
'Optional origin story or journey. Provides additional context for personalized outreach.';
