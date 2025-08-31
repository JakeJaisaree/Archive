"use client";

import { useEffect, useState } from "react";

type Msg = { role: "User" | "GPT" | "System"; text: string };

export default function Page() {
  // chat
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");

  // kb badge
  const [kbCount, setKbCount] = useState<number | null>(null);

  // admin
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [kbKey, setKbKey] = useState("");
  const [kbValue, setKbValue] = useState("");

  function addMessage(role: Msg["role"], text: string) {
    setMessages((m) => [...m, { role, text }]);
  }

  async function refreshKB() {
    try {
      const res = await fetch("/api/knowledge");
      const data = await res.json();
      setKbCount(data.count);
    } catch {
      setKbCount(-1);
    }
  }

  async function sendChat() {
    const q = input.trim();
    if (!q) return;
    addMessage("User", q);
    setInput("");
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: q }),
      });
      const data = await res.json();
      addMessage("GPT", data.response || "Not in the archive yet.");
    } catch {
      addMessage("System", "Error talking to the server.");
    }
  }

  async function subscribe() {
    try {
      const res = await fetch("/api/checkout", { method: "POST" });
      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch {
      addMessage("System", "Subscription error.");
    }
  }

  async function manage() {
    try {
      const res = await fetch("/api/portal", { method: "POST" });
      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch {
      addMessage("System", "Customer portal error.");
    }
  }

  async function upsertKB() {
    const password = adminPassword.trim();
    const key = kbKey.trim();
    let value: unknown = kbValue.trim();

    if (!password || !key) {
      alert("Missing fields.");
      return;
    }
    try {
      try {
        value = JSON.parse(String(value));
      } catch {
        // keep as string
      }
      const res = await fetch("/api/knowledge/upsert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, key, value }),
      });
      const data = await res.json();
      if (data.ok) {
        alert("Saved!");
        refreshKB();
      } else {
        alert(data.error || "Save failed.");
      }
    } catch {
      alert("Save failed.");
    }
  }

  // init
  useEffect(() => {
    refreshKB();
  }, []);

  // send on Ctrl/Cmd+Enter
  function onTextareaKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      sendChat();
    }
  }

  return (
    <div className="app">
      <header>
        <h1>Gaian Archive</h1>
        <span className="badge" id="kbBadge">
          {kbCount === null
            ? "KB: —"
            : kbCount < 0
            ? "KB: error"
            : `KB: ${kbCount} entr${kbCount === 1 ? "y" : "ies"}`}
        </span>
      </header>

      <main>
        <div className="actions">
          <button className="btn" onClick={subscribe}>
            Subscribe
          </button>
          <button className="btn" onClick={manage}>
            Manage
          </button>
          <button
            className="btn secondary"
            onClick={() => setAdminOpen((v) => !v)}
          >
            Admin
          </button>
        </div>

        <div className="chat" aria-live="polite">
          {messages.map((m, i) => (
            <div key={i} className={`msg ${m.role.toLowerCase()}`}>
              {m.role}: {m.text}
            </div>
          ))}
        </div>

        <div id="composer">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onTextareaKey}
            placeholder="Ask something… (If not found, you’ll see: “Not in the archive yet.”)"
          />
          <button className="btn" onClick={sendChat}>
            Send
          </button>
        </div>
      </main>

      {adminOpen && (
        <section id="adminPanel">
          <h2>Admin — Upsert Knowledge</h2>
          <div className="admin-grid">
            <input
              id="adminPassword"
              type="password"
              placeholder="Admin password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
            />
            <input
              id="kbKey"
              placeholder="Key (e.g., 'example_key')"
              value={kbKey}
              onChange={(e) => setKbKey(e.target.value)}
            />
            <textarea
              id="kbValue"
              rows={4}
              placeholder="Value (text or JSON)"
              value={kbValue}
              onChange={(e) => setKbValue(e.target.value)}
            />
            <div className="admin-actions">
              <button className="btn" onClick={upsertKB}>
                Save
              </button>
              <span className="hint">
                This writes to the server-side knowledgeBase.json.
              </span>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
