// Prisma 7 configuration file
// Connection string moved here from schema.prisma per Prisma 7 requirements
import { config } from "dotenv";
import { defineConfig, env } from "prisma/config";

// Load .env.local explicitly (Next.js convention)
config({ path: ".env.local" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
