const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl:  false ,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on("error", (err) => {
  console.error("Unexpected error on idle client", err);
});

// Test connection on startup
pool.query("SELECT 1", (err) => {
  if (err) {
    console.error("Database connection failed:", err.message);
  } else {
    console.log("Database connection successful");
  }
});

const query = (text, params) => {
  console.log("Executing query:", text.substring(0, 100), "...");
  return pool.query(text, params).catch((err) => {
    console.error("Query error:", err.message);
    throw err;
  });
};

module.exports = { pool, query };
