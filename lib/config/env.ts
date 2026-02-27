import { z } from "zod";

const envSchema = z.object({
  AI_GATEWAY_API_KEY: z.string().min(1, "AI_GATEWAY_API_KEY is required"),
  SKILL_ENGINE_MODEL: z.string().default("openai/gpt-5.2-chat"),
  SKILLS_ROOT_DIR: z.string().default("skills"),
  AGENT_ALLOWED_SCRIPTS: z
    .string()
    .default("score-features,validate-feature-set"),
  SKILLS_CACHE_TTL_MS: z.coerce.number().int().positive().default(30_000),
});

let cachedEnv: z.infer<typeof envSchema> | null = null;

export function getEnv() {
  if (cachedEnv) {
    return cachedEnv;
  }

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const message = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "env"}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid environment: ${message}`);
  }

  cachedEnv = parsed.data;
  return cachedEnv;
}
