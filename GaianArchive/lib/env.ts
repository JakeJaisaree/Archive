// lib/env.ts
export const env = {
  OPENAI_API_KEY: process.env.OPENAI_API_KEY ?? "",
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ?? "",
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD ?? "xxxxxxxxxx",
  VECTOR_STORE_ID: process.env.VECTOR_STORE_ID ?? ""
};

export function requireEnv(name: keyof typeof env) {
  const val = env[name];
  if (!val) throw new Error(`Missing required env: ${name}`);
  return val;
}

