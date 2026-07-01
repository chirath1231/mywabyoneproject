// One-time backfill: assign workspace_id to invoices created before
// workspace_id existed on wabyone_invoices. Only touches orgs that have
// exactly one workspace (unambiguous target); orgs with multiple
// workspaces are skipped and reported for manual review.
require("dotenv").config();
const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: false,
});

const ORG_ID = process.argv[2];

async function main() {
  if (!ORG_ID) {
    console.error("Usage: node backfill-invoice-workspace.js <org_id>");
    process.exit(1);
  }

  const workspaces = await pool.query(
    "SELECT id, name FROM wabyone_workspaces WHERE org_id = $1",
    [ORG_ID],
  );

  if (workspaces.rows.length !== 1) {
    console.error(
      `Org ${ORG_ID} has ${workspaces.rows.length} workspaces — refusing to backfill (ambiguous target).`,
    );
    process.exit(1);
  }

  const wsId = workspaces.rows[0].id;
  console.log(`Target workspace: ${workspaces.rows[0].name} (${wsId})`);

  const preview = await pool.query(
    `SELECT id, invoice_number, status, total FROM wabyone_invoices
     WHERE org_id = $1 AND workspace_id IS NULL ORDER BY created_at`,
    [ORG_ID],
  );
  console.log(`${preview.rows.length} invoice(s) will be updated:`);
  console.table(preview.rows);

  const result = await pool.query(
    `UPDATE wabyone_invoices SET workspace_id = $1
     WHERE org_id = $2 AND workspace_id IS NULL RETURNING id`,
    [wsId, ORG_ID],
  );
  console.log(`Updated ${result.rowCount} invoice(s).`);
}

main()
  .catch((err) => {
    console.error("Backfill failed:", err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
