import dotenv from "dotenv";
import { z } from "zod";

// Load local .env into process.env before validation
dotenv.config();

const EnvSchema = z.object({
  PORT: z.coerce.number().default(4000),
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  CLIENT_ORIGIN: z.string().default("http://localhost:3000"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

export type Env = z.infer<typeof EnvSchema>;

// Fail fast on missing or invalid configuration values
function validateEnv(): Env {
  const result = EnvSchema.safeParse(process.env);
  if (!result.success) {
    console.error("Fatal: Environment validation failed:");
    for (const issue of result.error.issues) {
      console.error(`  - [${issue.path.join(".")}] ${issue.message}`);
    }
    process.exit(1);
  }
  return result.data;
}

export const env = validateEnv();
