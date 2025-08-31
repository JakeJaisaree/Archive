type Env = {
  OPENAI_API_KEY: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_PRICE_ID_PRO: string;
  ADMIN_PASSWORD: string;
  VECTOR_STORE_ID: string;
  OPENAI_MODEL: string;
};

const val = (k: keyof Env, fallback?: string): string => {
  const v = process.env[k as string];
  if (typeof v === "string" && v.trim() !== "") return v;
  if (fallback !== undefined) return fallback;
  throw new Error(`Missing required env var: ${k}`);
};

export const env: Env = {
  OPENAI_API_KEY: val("OPENAI_API_KEY"),
  STRIPE_SECRET_KEY: val("STRIPE_SECRET_KEY"),
  STRIPE_PRICE_ID_PRO: val("STRIPE_PRICE_ID_PRO"),
  ADMIN_PASSWORD: val("ADMIN_PASSWORD"),
  VECTOR_STORE_ID: val("VECTOR_STORE_ID"),
  OPENAI_MODEL: val("OPENAI_MODEL", "gpt-5"),
};

export const requireEnv = <K extends keyof Env>(k: K) => env[k];
