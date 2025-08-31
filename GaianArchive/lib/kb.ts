// lib/kb.ts
import OpenAI from "openai";
import { env, requireEnv } from "./env";

type KBInfo = {
  storeId: string;
  fileCount: number;
  completedCount: number;
  latestCreatedAt?: number;
  files: Array<{
    id: string;
    filename?: string;
    bytes?: number;
    created_at?: number;
    status?: string;
  }>;
};

const MAX_PREVIEW_BYTES = 60_000; // ~60 KB, just enough to show context in UI

function client() {
  return new OpenAI({ apiKey: requireEnv("OPENAI_API_KEY") });
}

const files = await listAllVectorFiles(vsId, 1000);

  let latest = 0;
  for (const f of files) {
    const ts = (f as any).created_at;
    if (typeof ts === "number" && ts > latest) latest = ts;
  }

  const counts = (store as any).file_counts ?? {};
  return {
    storeId: vsId,
    fileCount: counts.total ?? files.length ?? 0,
    completedCount: counts.completed ?? 0,
    latestCreatedAt: latest || undefined,
    files: files.map((f) => ({
      id: f.id,
      filename: (f as any).filename,
      bytes: (f as any).bytes,
      created_at: (f as any).created_at,
      status: (f as any).status,
    })),
  };
}

/**
 * Read high-level info + file list from your vector store.
 * This is the "knowledge base" catalog for the UI.
 */
export async function readKBInfo(): Promise<KBInfo> {
  const vsId = requireEnv("VECTOR_STORE_ID");
  const openai = client();


const store = await openai.vectorStores.retrieve(vsId);
  
/**
 * Download a small text preview from the first few files in the vector store.
 * NOTE: This is only for showing a snippet in your UI; retrieval for answers
 * should be done via the Responses API with { tools: [{type:'file_search', vector_store_ids:[...]}] }.
 */
export async function readKBPreview(maxBytes: number = MAX_PREVIEW_BYTES): Promise<string> {
  const vsId = requireEnv("VECTOR_STORE_ID");
  const openai = client();

  const filesResp = await openai.vectorStores.files.list(vsId, { limit: 10});
  const files = filesResp.data ?? [];
  if (!files.length) return "";

  let acc = "";
  for (const f of files) {
    try {
      const contentStream = await openai.files.content(f.id);
      const buf = Buffer.from(await contentStream.arrayBuffer());
      acc += `\n\n=== ${((f as any).filename ?? f.id)} ===\n`;
      acc += buf.toString("utf8");
      if (acc.length >= maxBytes) break;
    } catch {
      // skip non-text or restricted files without failing the whole preview
    }
  }

  if (acc.length > maxBytes) acc = acc.slice(0, maxBytes) + "\n... [truncated]";
  return acc.trim();
}

/**
 * Upsert text into the vector store as a new file (admin action).
 * For larger files, consider streaming upload from a readable stream.
 */
export async function upsertKBText(filename: string, text: string): Promise<{ fileId: string }> {
  const vsId = requireEnv("VECTOR_STORE_ID");
  const openai = client();

  // 1) create a file in OpenAI
  const file = await openai.files.create({
    file: new Blob([text], { type: "text/plain" }) as any,
    purpose: "assistants", // vector stores live under 'assistants' purpose
    // @ts-ignore filename is supported in Node via File/Blob polyfills in SDK
    filename,
  });

  // 2) attach it to your vector store
  await openai.vectorStores.files.create(vsId, { file_id: file.id });

  return { fileId: file.id };
}

/**
 * Remove a file from the vector store (admin action).
 */
export async function deleteKBFile(fileId: string): Promise<void> {
  const vsId = requireEnv("VECTOR_STORE_ID");
  const openai = client();
  await openai.vectorStores.files.del(vsId, fileId);
}

/**
 * Legacy no-op: kept only to satisfy existing imports.
 * Writes shouldn't touch local disk anymore.
 */
export async function writeKB(_: Record<string, unknown>): Promise<void> {
  // no-op: we store knowledge in the vector store now
}

/**
 * Back-compat shim: some code may call readKB() expecting a JSON object.
 * We now return a small object summarizing the vector store.
 */
export async function readKB(): Promise<Record<string, unknown>> {
  const info = await readKBInfo();
  return {
    _source: "vector_store",
    storeId: info.storeId,
    fileCount: info.fileCount,
    completedCount: info.completedCount,
    latestCreatedAt: info.latestCreatedAt,
    files: info.files,
  };
}


