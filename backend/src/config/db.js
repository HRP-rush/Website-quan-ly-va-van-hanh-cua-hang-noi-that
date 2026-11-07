
const sql = require("mssql");
const fs = require("node:fs");
const path = require("node:path");

const envTrongBackend = path.resolve(__dirname, "..", "..", ".env");
const envTrongSrc = path.resolve(__dirname, "..", ".env");
require("dotenv").config({
  path: fs.existsSync(envTrongBackend) ? envTrongBackend : envTrongSrc
});

const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  port: Number(process.env.DB_PORT || 1433),
  database: process.env.DB_NAME,

  options: {
    encrypt: process.env.DB_ENCRYPT === "true",
    trustServerCertificate:
      process.env.DB_TRUST_CERT === "true"
  },

  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  },

  connectionTimeout: 15000,
  requestTimeout: 15000
};

let poolPromise;

function getPool() {
  if (!poolPromise) {
    poolPromise = new sql.ConnectionPool(dbConfig)
      .connect()
      .then((pool) => {
        console.log("Đã kết nối SQL Server");
        return pool;
      })
      .catch((err) => {
        poolPromise = null;
        throw err;
      });
  }

  return poolPromise;
}

module.exports = { sql, getPool };
