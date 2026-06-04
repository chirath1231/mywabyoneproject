-- Plan tier on org (free/business/enterprise)
ALTER TABLE wabyone_organizations
  ADD COLUMN IF NOT EXISTS plan_tier VARCHAR(20) DEFAULT 'free';

-- Workspaces: each represents a separate industry context within an org
CREATE TABLE IF NOT EXISTS wabyone_workspaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES wabyone_organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    industry VARCHAR(50),
    icon VARCHAR(20),
    theme_config JSONB DEFAULT '{}',
    terminology JSONB DEFAULT '{}',
    dashboard_config JSONB DEFAULT '{}',
    feature_flags JSONB DEFAULT '{}',
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workspaces_org ON wabyone_workspaces(org_id);

-- Per-user current workspace
ALTER TABLE wabyone_org_members
  ADD COLUMN IF NOT EXISTS current_workspace_id UUID REFERENCES wabyone_workspaces(id) ON DELETE SET NULL;

-- Add workspace_id to all data tables (nullable so existing rows keep working)
ALTER TABLE wabyone_categories     ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES wabyone_workspaces(id) ON DELETE CASCADE;
ALTER TABLE wabyone_products       ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES wabyone_workspaces(id) ON DELETE CASCADE;
ALTER TABLE wabyone_services       ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES wabyone_workspaces(id) ON DELETE CASCADE;
ALTER TABLE wabyone_customers      ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES wabyone_workspaces(id) ON DELETE CASCADE;
ALTER TABLE wabyone_invoices       ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES wabyone_workspaces(id) ON DELETE CASCADE;
ALTER TABLE wabyone_custom_fields  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES wabyone_workspaces(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_categories_ws    ON wabyone_categories(workspace_id);
CREATE INDEX IF NOT EXISTS idx_products_ws      ON wabyone_products(workspace_id);
CREATE INDEX IF NOT EXISTS idx_services_ws      ON wabyone_services(workspace_id);
CREATE INDEX IF NOT EXISTS idx_customers_ws     ON wabyone_customers(workspace_id);
CREATE INDEX IF NOT EXISTS idx_invoices_ws      ON wabyone_invoices(workspace_id);
CREATE INDEX IF NOT EXISTS idx_custom_fields_ws ON wabyone_custom_fields(workspace_id);

-- Backfill: create a default workspace per org for any orgs that don't have one,
-- then assign all existing rows to that workspace.
DO $$
DECLARE
    org_record RECORD;
    new_ws_id UUID;
BEGIN
    FOR org_record IN
        SELECT o.id, o.name, o.industry, o.theme_config, o.terminology,
               o.dashboard_config, o.feature_flags
        FROM wabyone_organizations o
        WHERE NOT EXISTS (SELECT 1 FROM wabyone_workspaces w WHERE w.org_id = o.id)
    LOOP
        INSERT INTO wabyone_workspaces
          (org_id, name, industry, theme_config, terminology, dashboard_config, feature_flags, is_default)
        VALUES
          (org_record.id,
           COALESCE(org_record.name, 'Main Workspace'),
           COALESCE(org_record.industry, 'general'),
           COALESCE(org_record.theme_config, '{}'::jsonb),
           COALESCE(org_record.terminology, '{}'::jsonb),
           COALESCE(org_record.dashboard_config, '{}'::jsonb),
           COALESCE(org_record.feature_flags, '{}'::jsonb),
           true)
        RETURNING id INTO new_ws_id;

        -- Assign all existing data to default workspace
        UPDATE wabyone_categories    SET workspace_id = new_ws_id WHERE org_id = org_record.id AND workspace_id IS NULL;
        UPDATE wabyone_products      SET workspace_id = new_ws_id WHERE org_id = org_record.id AND workspace_id IS NULL;
        UPDATE wabyone_services      SET workspace_id = new_ws_id WHERE org_id = org_record.id AND workspace_id IS NULL;
        UPDATE wabyone_customers     SET workspace_id = new_ws_id WHERE org_id = org_record.id AND workspace_id IS NULL;
        UPDATE wabyone_invoices      SET workspace_id = new_ws_id WHERE org_id = org_record.id AND workspace_id IS NULL;
        UPDATE wabyone_custom_fields SET workspace_id = new_ws_id WHERE org_id = org_record.id AND workspace_id IS NULL;

        -- Set every member of this org to this workspace
        UPDATE wabyone_org_members SET current_workspace_id = new_ws_id
          WHERE org_id = org_record.id AND current_workspace_id IS NULL;
    END LOOP;
END $$;
