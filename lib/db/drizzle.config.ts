import path from "path";
import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: path.join(__dirname, "../../.env") });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

const dbUrl = new URL(process.env.DATABASE_URL);

export default defineConfig({
  schema: "./src/schema/index.ts",
  dialect: "postgresql",
  schemaFilter: ["resource_balance"],
  dbCredentials: {
    host: dbUrl.hostname,
    port: Number(dbUrl.port || 5432),
    user: decodeURIComponent(dbUrl.username),
    password: decodeURIComponent(dbUrl.password),
    database: dbUrl.pathname.replace(/^\//, "") || "postgres",
    ssl: { rejectUnauthorized: false },
  },
});
