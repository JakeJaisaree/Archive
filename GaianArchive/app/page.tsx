"use client";

import { useEffect, useRef, useState } from "react";

type Msg = { role: "User" | "GPT" | "System"; text: string };

const PREFERRED_MODELS = ["gpt-4.1"]; // adjust if needed
const VECTOR_STORE_ID = "vs_68b3f5ab5f9c8191b6b7819a4deecdef"; // <-- paste your real vector store ID

// ===== Minimal USOC class (from your HTML), unchanged behavior =====
class UniversalSystemsOptimizerCalculus {
  nodes: Record<string, any> = {};
  activeEdges: [string, string][] = [];
  suspendedEdges: [string, string][] = [];
  totalEffect = 0;
  freewill = 0;
  objective = 0;
  addNode(name: string, type: string, quality: number, energy: number) {
    this.nodes[name] = { name, type, quality, energy };
  }
  connectNodes(a: string, b: string) {
    if (!this.nodes[a] || !this.nodes[b]) return;
    this.activeEdges.push([a, b]);
    this.suspendedEdges = this.suspendedEdges.filter(
      (e) => !(e[0] === a && e[1] === b)
    );
    this.updateEffects();
  }
  disconnectNodes(a: string, b: string) {
    this.activeEdges = this.activeEdges.filter((e) => e[0] !== a || e[1] !== b);
    this.updateEffects();
  }
  naughtNodes(a: string, b: string) {
    if (this.activeEdges.some((e) => e[0] === a && e[1] === b)) {
      this.suspendedEdges.push([a, b]);
      this.disconnectNodes(a, b);
      this.updateEffects();
    }
  }
  calculatePairEffect(a: string, b: string) {
    const n1 = this.nodes[a], n2 = this.nodes[b];
    return n1.quality * n1.energy + n2.quality * n2.energy;
  }
  updateEffects() {
    this.totalEffect = this.activeEdges.reduce(
      (s, [a, b]) => s + this.calculatePairEffect(a, b),
      0
    );
    this.freewill = this.suspendedEdges.reduce(
      (s, [a, b]) => s + this.calculatePairEffect(a, b),
      0
    );
    this.optimizeObjective();
  }
  optimizeObjective() {
    const alpha = 1, beta = 1;
    this.objective = alpha * this.totalEffect + beta * this.freewill;
  }
}

export default function Page() {
  // ===== UI state =====
  const [messages, setMessages] = useState<Msg[]>([]);
  const [apiKey, setApiKey] = useState("");
  const [remember, setRemember] = useState(false);
  const [kbBadgeText, setKbBadgeText] = useState("KB: not connected");
  const [input, setInput] = useState("");
  const chatRef = useRef<HTMLDivElement>(null);

  // ===== USOC boot =====
  const usocRef = useRef<UniversalSystemsOptimizerCalculus>();
  if (!usocRef.current) {
    const u = new UniversalSystemsOptimizerCalculus();
    u.addNode("Hero", "Character", 1, 10);
    u.addNode("Sword", "Object", -1, 8);
    usocRef.current = u;
  }

  // ===== Hydrate remember/key like your HTML =====
  useEffect(() => {
    const remembered = localStorage.getItem("gaia.rememberKey") === "1";
    setRemember(remembered);
    if (remembered) {
      const saved = localStorage.getItem("gaia.apiKey") || "";
      if (saved) setApiKey(saved);
    }
    updateKbBadge();
    refreshKBStatus().catch(() => {}); // best-effort
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages]);

  function updateKbBadge() {
    const has = !!VECTOR_STORE_ID;
    setKbBadgeText(has ? "KB: connected" : "KB: not connected");
  }

  function tsToLocal(ts: number) {
    try {
      return new Date(ts * 1000).toLocaleString();
    } catch {
      return "";
    }
  }

  async function refreshKBStatus() {
    if (!apiKey || !VECTOR_STORE_ID) {
      updateKbBadge();
      return;
    }
    setKbBadgeText("KB: checking…");
    try {
      const sRes = await fetch(
        `https://api.openai.com/v1/vector_stores/${VECTOR_STORE_ID}`,
        { headers: { Authorization: `Bearer ${apiKey}` } }
      );
      const store = await sRes.json();
      if (!sRes.ok) throw new Error(store?.error?.message || "Failed to fetch store");
      const counts = store.file_counts || {};
      const completed = counts.completed ?? counts.total ?? 0;

      const fRes = await fetch(
        `https://api.openai.com/v1/vector_stores/${VECTOR_STORE_ID}/files?limit=100`,
        { headers: { Authorization: `Bearer ${apiKey}` } }
      );
      const fl = await fRes.json();
      if (!fRes.ok) throw new Error(fl?.error?.message || "Failed to list files");
      let latest = 0;
      (fl.data || []).forEach((f: any) => {
        if (f.created_at && f.created_at > latest) latest = f.created_at;
      });

      setKbBadgeText(
        `KB: ${completed} files • updated ${latest ? tsToLocal(latest) : "—"}`
      );
    } catch (e) {
      setKbBadgeText("KB: error");
      // optional: console.error(e);
    }
  }

  function push(role: Msg["role"], text: string) {
    setMessages((m) => [...m, { role, text }]);
  }

  function extractAnswer(data: any): string {
    if (typeof data?.output_text === "string" && data.output_text.trim())
      return data.output_text.trim();
    if (Array.isArray(data?.output)) {
      for (const part of data.output) {
        if (part?.type === "message" && Array.isArray(part.content)) {
          const chunks = part.content
            .filter(
              (c: any) =>
                c && (c.type === "output_text" || c.type === "text" || c.type === "input_text")
            )
            .map((c: any) => c.text)
            .filter(Boolean);
          if (chunks.length) return chunks.join("").trim();
        }
      }
    }
    if (data?.choices?.[0]?.message?.content)
      return String(data.choices[0].message.content).trim();
    return JSON.stringify(data, null, 2);
  }

async function callOpenAI(userQuestion: string) {
  if (!apiKey) { alert("Enter your OpenAI API key."); return; }
  if (!VECTOR_STORE_ID) { push("System", "No KB set. Add your Vector Store ID in code."); return; }

  const body = {
    model: "gpt-4.1",
    temperature: 0,
    input: userQuestion,                               // keep as plain string
    tools: [{ type: "file_search" as const }],         // literal type avoids widening
    tool_resources: { file_search: { vector_store_ids: [VECTOR_STORE_ID] } },
    tool_choice: { type: "file_search" as const },     // force KB usage
  };

  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
      "OpenAI-Beta": "assistants=v2", 
      // If you STILL see "Unknown parameter: tool_resources", add:
      // "OpenAI-Beta": "assistants=v2"
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || res.statusText);
  return extractAnswer(data);
}
  

  async function onSend() {
    const q = input.trim();
    if (!q) return;
    push("User", q);
    setInput("");

    // local narrative controls (identical semantics to your HTML)
    const t = q.toLowerCase();
    const u = usocRef.current!;
    if (t.includes("connect")) {
      u.connectNodes("Hero", "Sword");
      u.updateEffects();
      push("GPT", '"In this moment, I bring together Hero and Sword, weaving them into the tapestry of existence. Their energies now pulse together, harmonizing the system."');
      return;
    }
    if (t.includes("disconnect")) {
      u.disconnectNodes("Hero", "Sword");
      u.updateEffects();
      push("GPT", '"The connection between Hero and Sword has been severed, allowing both to exist in their own separate potentials."');
      return;
    }
    if (t.includes("suspend")) {
      u.naughtNodes("Hero", "Sword");
      u.updateEffects();
      push("GPT", '"A pause now rests between Hero and Sword. Potential held in abeyance."');
      return;
    }
    if (t.includes("optimize")) {
      u.optimizeObjective();
      push("GPT", '"The system moves toward harmony; Order and Freewill now balance."');
      return;
    }

    try {
      const answer = await callOpenAI(q);
      if (answer) push("GPT", answer);
    } catch (e: any) {
      push("GPT", `Error: ${e?.message || "Unknown error"}`);
    }
  }

  // remember key checkbox + localStorage sync
  useEffect(() => {
    if (remember) {
      localStorage.setItem("gaia.rememberKey", "1");
      localStorage.setItem("gaia.apiKey", apiKey);
    } else {
      localStorage.setItem("gaia.rememberKey", "0");
      localStorage.removeItem("gaia.apiKey");
    }
  }, [remember, apiKey]);

  return (
    <div className="app">
      <header>
        <h1 id="title" title="Gaian Archive">Gaian Archive</h1>
        <span id="kbStatus" className="badge">{kbBadgeText}</span>
      </header>

      <main>
        <div className="row cols">
          <div>
            <label htmlFor="apiKey">OpenAI API Key</label>
            <input
              type="text"
              id="apiKey"
              placeholder="sk-... (not stored unless you choose)"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              onBlur={refreshKBStatus}
            />
            <label className="hint">
              <input
                type="checkbox"
                id="rememberKey"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />{" "}
              Remember key in this browser (unsafe)
            </label>
          </div>
        </div>

        <div className="chat" id="chat" ref={chatRef} aria-live="polite">
          {messages.map((m, i) => (
            <div key={i} className={`msg ${m.role === "User" ? "user" : m.role === "System" ? "sys" : "gpt"}`}>
              {m.role}: {m.text}
            </div>
          ))}
        </div>

        <div id="composer" className="row">
          <textarea
            id="userInput"
            placeholder={`Ask something… (try: connect / disconnect / suspend / optimize)\nDocs: if not found, I’ll say "Not in the archive yet."`}
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button id="sendBtn" onClick={onSend}>Send</button>
        </div>
      </main>
    </div>
  );
}
