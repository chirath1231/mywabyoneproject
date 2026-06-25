const fs = require("fs");
const path = require("path");
const { pool } = require("../config/db");

async function migrate() {
  const client = await pool.connect();
  try {
    const schemaPath = path.join(__dirname, "schema.sql");
    const schema = fs.readFileSync(schemaPath, "utf-8");

    console.log("Running WabyOne base schema...");
    await client.query(schema);
    console.log("Base schema applied.");

    // Run incremental migrations
    const migrationsDir = path.join(__dirname, "migrations");
    if (fs.existsSync(migrationsDir)) {
      const files = fs
        .readdirSync(migrationsDir)
        .filter((f) => f.endsWith(".sql"))
        .sort();
      for (const file of files) {
        console.log(`Running migration: ${file}`);
        const sql = fs.readFileSync(path.join(migrationsDir, file), "utf-8");
        await client.query(sql);
      }
    }

    console.log("Migration completed successfully!");
  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
