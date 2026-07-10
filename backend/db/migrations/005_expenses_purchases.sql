-- Expenses, Suppliers & Purchases
-- Expense categories reuse the existing generic wabyone_categories table
-- (type='expense'), same as Products/Services do.

CREATE TABLE IF NOT EXISTS wabyone_expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES wabyone_organizations(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES wabyone_workspaces(id) ON DELETE CASCADE,
    category_id UUID REFERENCES wabyone_categories(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    expense_date DATE DEFAULT CURRENT_DATE,
    payment_method VARCHAR(50) DEFAULT 'cash',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wabyone_suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES wabyone_organizations(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES wabyone_workspaces(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    phone VARCHAR(30),
    email VARCHAR(255),
    address TEXT,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wabyone_purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES wabyone_organizations(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES wabyone_workspaces(id) ON DELETE CASCADE,
    supplier_id UUID REFERENCES wabyone_suppliers(id) ON DELETE SET NULL,
    purchase_number VARCHAR(50) NOT NULL,
    bill_number VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    purchase_date DATE DEFAULT CURRENT_DATE,
    payment_method VARCHAR(50) DEFAULT 'cash',
    subtotal DECIMAL(12,2) DEFAULT 0.00,
    vat_percent DECIMAL(5,2) DEFAULT 0.00,
    vat_amount DECIMAL(12,2) DEFAULT 0.00,
    discount DECIMAL(12,2) DEFAULT 0.00,
    shipping_charge DECIMAL(12,2) DEFAULT 0.00,
    total DECIMAL(12,2) DEFAULT 0.00,
    amount_paid DECIMAL(12,2) DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wabyone_purchase_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_id UUID NOT NULL REFERENCES wabyone_purchases(id) ON DELETE CASCADE,
    product_id UUID REFERENCES wabyone_products(id) ON DELETE SET NULL,
    description VARCHAR(500) NOT NULL,
    quantity DECIMAL(10,2) DEFAULT 1,
    cost_rate DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    new_sell_rate DECIMAL(12,2),
    total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wabyone_expenses_org        ON wabyone_expenses(org_id);
CREATE INDEX IF NOT EXISTS idx_wabyone_expenses_ws         ON wabyone_expenses(workspace_id);
CREATE INDEX IF NOT EXISTS idx_wabyone_expenses_category   ON wabyone_expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_wabyone_suppliers_org       ON wabyone_suppliers(org_id);
CREATE INDEX IF NOT EXISTS idx_wabyone_suppliers_ws        ON wabyone_suppliers(workspace_id);
CREATE INDEX IF NOT EXISTS idx_wabyone_purchases_org       ON wabyone_purchases(org_id);
CREATE INDEX IF NOT EXISTS idx_wabyone_purchases_ws        ON wabyone_purchases(workspace_id);
CREATE INDEX IF NOT EXISTS idx_wabyone_purchases_supplier  ON wabyone_purchases(supplier_id);
CREATE INDEX IF NOT EXISTS idx_wabyone_purchase_items_pid  ON wabyone_purchase_items(purchase_id);
