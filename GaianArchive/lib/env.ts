export const env = {
  OPENAI_API_KEY: process.env.OPENAI_API_KEY ?? "",
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ?? "",
  STRIPE_PRICE_ID_PRO: process.env.STRIPE_PRICE_ID_PRO ?? "",
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD ?? "xxxxxxxxxx",
  VECTOR_STORE_ID: process.env.VECTOR_STORE_ID ?? "",
  OPENAI_MODEL: process.env.OPENAI_MODEL ?? ""
};

export function requireEnv(name: keyof typeof env) {
  const val = env[name];
  if (!val) throw new Error(`Missing required env: ${name}`);
  return val;
}


