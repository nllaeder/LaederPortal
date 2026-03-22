## `/doc/schema.sql`


-- LaederPortal Database Schema
-- Supabase / PostgreSQL
-- Last updated: March 2026

-- ============================================================
-- EXTENSIONS
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- UTILITY FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- TABLES
-- ============================================================

-- CLIENTS
-- Synced from Wave Accounting customers.
-- google_folder_id and portal_enabled are managed locally only.
-- Never overwrite these columns during Wave sync.

CREATE TABLE clients (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  wave_id           TEXT        UNIQUE NOT NULL,
  name              TEXT,
  first_name        TEXT,
  last_name         TEXT,
  email             TEXT,
  phone             TEXT,
  mobile            TEXT,
  website           TEXT,
  address_line1     TEXT,
  address_line2     TEXT,
  city              TEXT,
  province          TEXT,
  country           TEXT,
  postal_code       TEXT,
  currency_code     TEXT,
  internal_notes    TEXT,
  is_archived       BOOLEAN     NOT NULL DEFAULT false,
  google_folder_id  TEXT,
  portal_enabled    BOOLEAN     NOT NULL DEFAULT false,
  wave_created_at   TIMESTAMPTZ,
  wave_modified_at  TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_clients_wave_id ON clients (wave_id);
CREATE INDEX idx_clients_email   ON clients (email);

CREATE TRIGGER clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ESTIMATES
-- Synced from Wave Accounting estimates (AREstimate type).
-- Note: Wave's AREstimate has no status field.
-- wave_client_id is the Wave customer ID string, not a Supabase UUID.
-- google_folder_id is set by folder provisioning, never by Wave sync.

CREATE TABLE estimates (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  wave_id           TEXT          UNIQUE NOT NULL,
  wave_client_id    TEXT,
  estimate_number   TEXT,
  title             TEXT,
  estimate_date     DATE,
  due_date          DATE,
  amount_due        NUMERIC(12,2),
  amount_paid       NUMERIC(12,2),
  subtotal          NUMERIC(12,2),
  tax_total         NUMERIC(12,2),
  total             NUMERIC(12,2),
  currency_code     TEXT,
  memo              TEXT,
  footer            TEXT,
  last_sent_at      TIMESTAMPTZ,
  last_viewed_at    TIMESTAMPTZ,
  wave_created_at   TIMESTAMPTZ,
  wave_modified_at  TIMESTAMPTZ,
  google_folder_id  TEXT,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX idx_estimates_wave_id        ON estimates (wave_id);
CREATE INDEX idx_estimates_wave_client_id ON estimates (wave_client_id);

CREATE TRIGGER estimates_updated_at
  BEFORE UPDATE ON estimates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- INVOICES
-- Synced from Wave Accounting invoices.
-- Invoice type DOES have a status field (unlike estimates).
-- wave_client_id is the Wave customer ID string, not a Supabase UUID.
-- google_folder_id is set by folder provisioning, never by Wave sync.

CREATE TABLE invoices (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  wave_id           TEXT          UNIQUE NOT NULL,
  wave_client_id    TEXT,
  invoice_number    TEXT,
  title             TEXT,
  status            TEXT          CHECK (status IN (
                                    'DRAFT', 'SENT', 'VIEWED',
                                    'PAID', 'PARTIAL', 'OVERDUE', 'UNPAID'
                                  )),
  invoice_date      DATE,
  due_date          DATE,
  amount_due        NUMERIC(12,2),
  amount_paid       NUMERIC(12,2),
  subtotal          NUMERIC(12,2),
  tax_total         NUMERIC(12,2),
  total             NUMERIC(12,2),
  currency_code     TEXT,
  memo              TEXT,
  footer            TEXT,
  last_sent_at      TIMESTAMPTZ,
  last_viewed_at    TIMESTAMPTZ,
  wave_created_at   TIMESTAMPTZ,
  wave_modified_at  TIMESTAMPTZ,
  google_folder_id  TEXT,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX idx_invoices_wave_id        ON invoices (wave_id);
CREATE INDEX idx_invoices_wave_client_id ON invoices (wave_client_id);

CREATE TRIGGER invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE clients   ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices  ENABLE ROW LEVEL SECURITY;

-- CLIENTS POLICIES

-- Service role has full access (used by sync and provisioning)
CREATE POLICY "clients_service_role_all" ON clients
  FOR ALL
  USING (auth.role() = 'service_role');

-- Authenticated clients can read their own row (matched by email)
CREATE POLICY "clients_select_own" ON clients
  FOR SELECT
  TO authenticated
  USING (email = auth.jwt() ->> 'email');

-- Admin can read all rows
-- Admin role is set in Supabase user metadata: { "role": "admin" }
CREATE POLICY "clients_admin_select_all" ON clients
  FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- ESTIMATES POLICIES

CREATE POLICY "estimates_service_role_all" ON estimates
  FOR ALL
  USING (auth.role() = 'service_role');

-- Clients can read estimates belonging to their Wave customer record
CREATE POLICY "estimates_select_own" ON estimates
  FOR SELECT
  TO authenticated
  USING (
    wave_client_id IN (
      SELECT wave_id FROM clients
      WHERE email = auth.jwt() ->> 'email'
    )
  );

CREATE POLICY "estimates_admin_select_all" ON estimates
  FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- INVOICES POLICIES

CREATE POLICY "invoices_service_role_all" ON invoices
  FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "invoices_select_own" ON invoices
  FOR SELECT
  TO authenticated
  USING (
    wave_client_id IN (
      SELECT wave_id FROM clients
      WHERE email = auth.jwt() ->> 'email'
    )
  );

CREATE POLICY "invoices_admin_select_all" ON invoices
  FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- ============================================================
-- UPSERT REFERENCE
-- ============================================================
-- Use these patterns in the Wave sync layer.
-- Never include google_folder_id or portal_enabled in the
-- DO UPDATE SET clause.

-- Clients upsert:
-- INSERT INTO clients (wave_id, name, first_name, ...)
-- VALUES (...)
-- ON CONFLICT (wave_id) DO UPDATE SET
--   name = EXCLUDED.name,
--   first_name = EXCLUDED.first_name,
--   ...
--   wave_modified_at = EXCLUDED.wave_modified_at
--   -- google_folder_id NOT included
--   -- portal_enabled NOT included

-- Estimates upsert:
-- INSERT INTO estimates (wave_id, wave_client_id, estimate_number, ...)
-- VALUES (...)
-- ON CONFLICT (wave_id) DO UPDATE SET
--   wave_client_id = EXCLUDED.wave_client_id,
--   estimate_number = EXCLUDED.estimate_number,
--   ...
--   wave_modified_at = EXCLUDED.wave_modified_at
--   -- google_folder_id NOT included

-- Invoices upsert: same pattern as estimates, include status.