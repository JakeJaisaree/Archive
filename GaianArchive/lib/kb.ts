// lib/kb.ts
import OpenAI from "openai";
import { requireEnv } from "./env";

type KBFile = {
  id: string;
  filename?: string;
  bytes?: number;
  created_at?: number;
  status?: string;
};

type KBInfo = {
  storeId: string;
  fileCount: number;
  completedCount: number;
  latestCreatedAt?: number;
  files: KBFile[];
};

const MAX_PREVIEW_BYTES = 60_000;

function client() {
  return new OpenAI({ apiKey: requireEnv("OPENAI_API_KEY") });
}

/** Paginate vector store files safely (limit ≤ 100 per page). */
async function listAllVectorFiles(vsId: string, max: number = 1000) {
  const cli = client();
  let after: string | undefined;
  const out: any[] = [];

  while (out.length < max) {
    const resp = await cli.vectorStores.files.list(vsId, {
      limit: 100,
      ...(after ? { after } : {})
    });

    const batch = resp.data ?? [];
    out.push(...batch);

    if (!resp.has_more || batch.length === 0) break;
    after = batch[batch.length - 1]?.id;
    if (!after) break;
  }
  return out;
}

/** High-level info + file list from your vector store (KB catalog). */
export async function readKBInfo(): Promise<KBInfo> {
  const vsId = requireEnv("VECTOR_STORE_ID");
  const openai = client();

  const store = await openai.vectorStores.retrieve(vsId);
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
      status: (f as any).status
    }))
  };
}

/** Small text preview from a few files (optional UI helper). */
export async function readKBPreview(maxBytes: number = MAX_PREVIEW_BYTES): Promise<string> {
  const vsId = requireEnv("VECTOR_STORE_ID");
  const openai = client();

  const filesResp = await openai.vectorStores.files.list(vsId, { limit: 10 });
  const files = filesResp.data ?? [];
  if (!files.length) return "";

  let acc = "";
  for (const f of files) {
    try {
      const content = await openai.files.content(f.id);
      const buf = Buffer.from(await content.arrayBuffer());
      acc += `\n\n=== ${((f as any).filename ?? f.id)} ===\n`;
      acc += buf.toString("utf8");
      if (acc.length >= maxBytes) break;
    } catch {
      // skip non-text or restricted files
    }
  }
  if (acc.length > maxBytes) acc = acc.slice(0, maxBytes) + "\n... [truncated]";
  return acc.trim();
}

/** Upsert plain text into the vector store as a new file. */
export async function upsertKBText(filename: string, text: string): Promise<{ fileId: string }> {
  const vsId = requireEnv("VECTOR_STORE_ID");
  const openai = client();

  const file = await openai.files.create({
    file: await OpenAI.toFile(Buffer.from(text), filename),
    purpose: "assistants"
  });

  await openai.vectorStores.files.create(vsId, { file_id: file.id });
  return { fileId: file.id };
}

/** Remove a file from the vector store. */
export async function deleteKBFile(fileId: string): Promise<void> {
  const vsId = requireEnv("VECTOR_STORE_ID");
  const openai = client();
  await openai.vectorStores.files.del(vsId, fileId);
}

/** Back-compat shims (no local disk persistence). */
export async function writeKB(_: Record<string, unknown>): Promise<void> {
  // no-op: KB is in vector store now
}

export async function readKB(): Promise<Record<string, unknown>> {
  const info = await readKBInfo();
  return {
    _source: "vector_store",
    storeId: info.storeId,
    fileCount: info.fileCount,
    completedCount: info.completedCount,
    latestCreatedAt: info.latestCreatedAt,
    files: info.files
  };
}

