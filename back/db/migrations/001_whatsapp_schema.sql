-- Migration: Multi-tenant WhatsApp (Green API) support — POOL MODEL

CREATE TABLE IF NOT EXISTS whatsapp_instances (
  id                 SERIAL PRIMARY KEY,
  org_id             UUID,
  name               VARCHAR(255),
  id_instance        BIGINT UNIQUE NOT NULL,
  api_token_instance TEXT NOT NULL,
  api_url            TEXT,
  media_url          TEXT,
  webhook_token      VARCHAR(64),
  phone_number       VARCHAR(32),
  status             VARCHAR(32) NOT NULL DEFAULT 'available',
  system_prompt      TEXT DEFAULT 'You are a helpful customer support assistant. Be concise and friendly.',
  ai_enabled         BOOLEAN NOT NULL DEFAULT true,
  last_qr_code       TEXT,
  last_error         TEXT,
  assigned_at        TIMESTAMP,
  created_at         TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE whatsapp_instances ADD COLUMN IF NOT EXISTS api_url TEXT;
ALTER TABLE whatsapp_instances ADD COLUMN IF NOT EXISTS media_url TEXT;

-- Fix org_id type from INTEGER to UUID if it was created with the wrong type
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'whatsapp_instances'
      AND column_name = 'org_id'
      AND data_type = 'integer'
  ) THEN
    ALTER TABLE whatsapp_instances ALTER COLUMN org_id TYPE UUID USING NULL::UUID;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_org ON whatsapp_instances(org_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_available
  ON whatsapp_instances(status) WHERE org_id IS NULL;

CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id            SERIAL PRIMARY KEY,
  instance_id   INTEGER NOT NULL REFERENCES whatsapp_instances(id) ON DELETE CASCADE,
  org_id        UUID NOT NULL,
  chat_id       VARCHAR(64) NOT NULL,
  direction     VARCHAR(8)  NOT NULL,
  body          TEXT,
  message_type  VARCHAR(32) DEFAULT 'text',
  id_message    VARCHAR(64),
  ai_generated  BOOLEAN NOT NULL DEFAULT false,
  raw_payload   JSONB,
  created_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'whatsapp_messages'
      AND column_name = 'org_id'
      AND data_type = 'integer'
  ) THEN
    ALTER TABLE whatsapp_messages ALTER COLUMN org_id TYPE UUID USING NULL::UUID;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_chat ON whatsapp_messages(instance_id, chat_id, created_at);
