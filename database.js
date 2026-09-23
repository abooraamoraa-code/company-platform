const { Pool } = require("pg");

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.warn(
    "[DATABASE] DATABASE_URL is not configured yet."
  );
}

const pool = new Pool({
  connectionString: databaseUrl || undefined,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
});

pool.on("error", (error) => {
  console.error("[DATABASE] Unexpected pool error:", error);
});

async function query(text, params = []) {
  const result = await pool.query(text, params);
  return result;
}

async function transaction(callback) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await callback(client);

    await client.query("COMMIT");

    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function healthCheck() {
  try {
    await pool.query("SELECT 1");

    return {
      connected: true
    };
  } catch (error) {
    return {
      connected: false,
      error: error.message
    };
  }
}

module.exports = {
  pool,
  query,
  transaction,
  healthCheck
};
