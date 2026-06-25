-- WabyOne ERP Database Schema
-- All tables prefixed with wabyone_ to avoid conflicts

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- USERS & ORGANIZATIONS
-- =============================================

CREATE TABLE IF NOT EXISTS wabyone_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(30),
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wabyone_organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    logo_url TEXT,
    description TEXT,
    address TEXT,
    phone VARCHAR(30),
    email VARCHAR(255),
    website VARCHAR(255),
    currency VARCHAR(10) DEFAULT 'USD',
    tax_rate DECIMAL(5,2) DEFAULT 0.00,
    theme_config JSONB DEFAULT '{}',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wabyone_org_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES wabyone_users(id) ON DELETE CASCADE,
    org_id UUID NOT NULL REFERENCES wabyone_organizations(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member',
    permissions JSONB DEFAULT '[]',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, org_id)
);

-- =============================================
-- PRODUCTS & SERVICES
-- =============================================

CREATE TABLE IF NOT EXISTS wabyone_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES wabyone_organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(20) DEFAULT 'product',
    color VARCHAR(7),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wabyone_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES wabyone_organizations(id) ON DELETE CASCADE,
    category_id UUID REFERENCES wabyone_categories(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    sku VARCHAR(100),
    barcode VARCHAR(100),
    price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    cost_price DECIMAL(12,2) DEFAULT 0.00,
    quantity INTEGER DEFAULT 0,
    reserved_quantity INTEGER DEFAULT 0,
    min_stock INTEGER DEFAULT 0,
    unit VARCHAR(50) DEFAULT 'pcs',
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    status VARCHAR(10) NOT NULL DEFAULT 'active',
    custom_fields JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wabyone_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES wabyone_organizations(id) ON DELETE CASCADE,
    category_id UUID REFERENCES wabyone_categories(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    duration_minutes INTEGER,
    is_active BOOLEAN DEFAULT true,
    custom_fields JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- CUSTOMERS
-- =============================================

CREATE TABLE IF NOT EXISTS wabyone_customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES wabyone_organizations(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(30),
    whatsapp VARCHAR(30),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    postal_code VARCHAR(20),
    notes TEXT,
    tags JSONB DEFAULT '[]',
    custom_fields JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- INVOICES & ORDERS
-- =============================================

CREATE TABLE IF NOT EXISTS wabyone_invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES wabyone_organizations(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES wabyone_customers(id) ON DELETE SET NULL,
    invoice_number VARCHAR(50) NOT NULL,
    status VARCHAR(30) DEFAULT 'draft',
    issue_date DATE DEFAULT CURRENT_DATE,
    due_date DATE,
    subtotal DECIMAL(12,2) DEFAULT 0.00,
    tax_amount DECIMAL(12,2) DEFAULT 0.00,
    discount_amount DECIMAL(12,2) DEFAULT 0.00,
    total DECIMAL(12,2) DEFAULT 0.00,
    notes TEXT,
    payment_method VARCHAR(50),
    paid_at TIMESTAMP WITH TIME ZONE,
    custom_fields JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wabyone_invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES wabyone_invoices(id) ON DELETE CASCADE,
    product_id UUID REFERENCES wabyone_products(id) ON DELETE SET NULL,
    service_id UUID REFERENCES wabyone_services(id) ON DELETE SET NULL,
    description VARCHAR(500) NOT NULL,
    quantity DECIMAL(10,2) DEFAULT 1,
    unit_price DECIMAL(12,2) NOT NULL,
    discount DECIMAL(5,2) DEFAULT 0.00,
    total DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- CUSTOM FIELDS DEFINITION
-- =============================================

CREATE TABLE IF NOT EXISTS wabyone_custom_fields (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES wabyone_organizations(id) ON DELETE CASCADE,
    entity_type VARCHAR(50) NOT NULL,
    field_name VARCHAR(100) NOT NULL,
    field_label VARCHAR(255) NOT NULL,
    field_type VARCHAR(50) DEFAULT 'text',
    options JSONB DEFAULT '[]',
    is_required BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- NOTIFICATIONS
-- =============================================

CREATE TABLE IF NOT EXISTS wabyone_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES wabyone_organizations(id) ON DELETE CASCADE,
    type VARCHAR(30) NOT NULL,
    recipient VARCHAR(255) NOT NULL,
    subject VARCHAR(500),
    body TEXT,
    status VARCHAR(30) DEFAULT 'pending',
    channel VARCHAR(20) DEFAULT 'email',
    metadata JSONB DEFAULT '{}',
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- ACTIVITY LOG
-- =============================================

CREATE TABLE IF NOT EXISTS wabyone_activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES wabyone_organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES wabyone_users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- Add to your schema or run as migration
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


-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_wabyone_products_org ON wabyone_products(org_id);
CREATE INDEX IF NOT EXISTS idx_wabyone_services_org ON wabyone_services(org_id);
CREATE INDEX IF NOT EXISTS idx_wabyone_customers_org ON wabyone_customers(org_id);
CREATE INDEX IF NOT EXISTS idx_wabyone_invoices_org ON wabyone_invoices(org_id);
CREATE INDEX IF NOT EXISTS idx_wabyone_invoices_customer ON wabyone_invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_wabyone_invoice_items_invoice ON wabyone_invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_wabyone_notifications_org ON wabyone_notifications(org_id);
CREATE INDEX IF NOT EXISTS idx_wabyone_activity_log_org ON wabyone_activity_log(org_id);
CREATE INDEX IF NOT EXISTS idx_wabyone_org_members_user ON wabyone_org_members(user_id);
CREATE INDEX IF NOT EXISTS idx_wabyone_org_members_org ON wabyone_org_members(org_id);
CREATE INDEX IF NOT EXISTS idx_wabyone_custom_fields_org ON wabyone_custom_fields(org_id);
CREATE INDEX IF NOT EXISTS idx_wabyone_categories_org ON wabyone_categories(org_id);

-- ─────────────────────────────────────────────────────────────
-- Migration: add warranty to wabyone_products
-- Run once against your database
-- ─────────────────────────────────────────────────────────────

ALTER TABLE wabyone_products
  ADD COLUMN IF NOT EXISTS warranty_value   INTEGER       DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS warranty_unit    VARCHAR(10)   DEFAULT NULL
    CHECK (warranty_unit IN ('months', 'years'));

-- warranty_value : the number  (e.g. 2)
-- warranty_unit  : 'months' or 'years'
-- Both NULL means no warranty offered.

COMMENT ON COLUMN wabyone_products.warranty_value IS 'Numeric warranty duration (e.g. 2)';
COMMENT ON COLUMN wabyone_products.warranty_unit  IS 'Unit for warranty_value: months | years';

-- ─────────────────────────────────────────────────────────────
-- Migration: add reserved_quantity to wabyone_products
-- Run once against your database
-- ─────────────────────────────────────────────────────────────

ALTER TABLE wabyone_products
  ADD COLUMN IF NOT EXISTS reserved_quantity INTEGER DEFAULT 0;

COMMENT ON COLUMN wabyone_products.reserved_quantity IS 'Units reserved by sent/paid invoices; available = quantity - reserved_quantity';