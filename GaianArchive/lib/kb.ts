// lib/kb.ts
import { promises as fs } from "fs";
import path from "path";
import { env } from "./env";

type KB = Record<string, unknown>;

const projectRoot = process.cwd();
const sourceKBPath = path.join(projectRoot, "data", "knowledgeBase.json");
const runtimeKBPath = path.join("/tmp", "knowledgeBase.json");

async function readJson(file: string): Promise<KB> {
  try {
    const raw = await fs.readFile(file, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function parseEnvJson(): KB {
  if (!env.KB_JSON) return {};
  try {
    const parsed = JSON.parse(env.KB_JSON);
    return typeof parsed === "object" && parsed ? parsed : {};
  } catch {
    return {};
  }
}

export async function readKB(): Promise<KB> {
  // Prefer runtime file if present (allows ephemeral writes during a container’s life)
  const runtime = await readJson(runtimeKBPath);
  if (Object.keys(runtime).length) return runtime;

  // Else fall back to project file + env override
  const base = await readJson(sourceKBPath);
  const fromEnv = parseEnvJson();
  return { ...base, ...fromEnv };
}

export async function writeKB(obj: KB): Promise<void> {
  // Writes to /tmp only (non-persistent in serverless). Replace with Vercel KV for persistence.
  await fs.writeFile(runtimeKBPath, JSON.stringify(obj, null, 2));
}
