-- Create password resets table if it doesn't exist
CREATE TABLE IF NOT EXISTS wabyone_password_resets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES wabyone_users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    otp_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT false,
    attempts INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_resets_email ON wabyone_password_resets(email);
CREATE INDEX IF NOT EXISTS idx_password_resets_email_used ON wabyone_password_resets(email, used, expires_at);
