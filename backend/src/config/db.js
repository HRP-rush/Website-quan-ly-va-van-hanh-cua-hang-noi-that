
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
let connectedPool;

function getPool() {
  // A SQL Server restart or a dropped TCP connection can leave the cached pool
  // unusable. Discard it only after the driver marks it unhealthy; healthy pools
  // can replace an individual broken connection themselves.
  if (connectedPool && !connectedPool.healthy) {
    const failedPool = connectedPool;
    connectedPool = null;
    poolPromise = null;
    failedPool.close().catch((err) => {
      console.error("Không thể đóng connection pool SQL lỗi:", err.message);
    });
  }

  if (!poolPromise) {
    const pool = new sql.ConnectionPool(dbConfig);
    const connecting = pool.connect()
      .then((readyPool) => {
        connectedPool = readyPool;
        readyPool.on("error", (err) => {
          console.error(
            `Lỗi connection pool SQL Server (${err.code || err.name}):`,
            err.message
          );

          if (!readyPool.healthy && connectedPool === readyPool) {
            connectedPool = null;
            if (poolPromise === connecting) poolPromise = null;
            readyPool.close().catch((closeError) => {
              console.error("Không thể đóng connection pool SQL lỗi:", closeError.message);
            });
          }
        });

        console.log("Đã kết nối SQL Server");
        return readyPool;
      })
      .catch((err) => {
        if (poolPromise === connecting) poolPromise = null;
        throw err;
      });

    poolPromise = connecting;
  }

  return poolPromise;
}

module.exports = { sql, getPool };
