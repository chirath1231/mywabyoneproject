-- Add industry & onboarding fields to organizations
ALTER TABLE wabyone_organizations
  ADD COLUMN IF NOT EXISTS industry VARCHAR(50),
  ADD COLUMN IF NOT EXISTS sub_industry VARCHAR(100),
  ADD COLUMN IF NOT EXISTS business_size VARCHAR(20),
  ADD COLUMN IF NOT EXISTS primary_goal VARCHAR(50),
  ADD COLUMN IF NOT EXISTS team_size INTEGER,
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS tour_completed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS preset_applied VARCHAR(50),
  ADD COLUMN IF NOT EXISTS preset_applied_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS terminology JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS dashboard_config JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS feature_flags JSONB DEFAULT '{}';

-- Add per-user onboarding tracking
ALTER TABLE wabyone_users
  ADD COLUMN IF NOT EXISTS tour_completed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS tour_skipped BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_orgs_industry ON wabyone_organizations(industry);
