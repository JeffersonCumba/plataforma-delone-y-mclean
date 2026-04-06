import "server-only";

import mysql, { type Pool } from "mysql2/promise";

const DB_HOST = process.env.DB_HOST;
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD ?? "";
const DB_NAME = process.env.DB_NAME;

if (!DB_HOST) {
  throw new Error("Missing required env var: DB_HOST");
}

if (!DB_USER) {
  throw new Error("Missing required env var: DB_USER");
}

if (!DB_NAME) {
  throw new Error("Missing required env var: DB_NAME");
}

declare global {
  var __dbPool: Pool | undefined;
}

const pool =
  global.__dbPool ??
  mysql.createPool({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    namedPlaceholders: false,
  });

if (process.env.NODE_ENV !== "production") {
  global.__dbPool = pool;
}

export { pool };
