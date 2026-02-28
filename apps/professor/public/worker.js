/**
 * Cloudflare Worker: MCP wrapper -> n8n webhook proxy
 *
 * Exposes MCP JSON-RPC endpoint at:
 *   POST /mcp
 *
 * Supports auth via either:
 *   - x-api-key: <WRAPPER_API_KEY>
 *   - Authorization: Bearer <WRAPPER_API_KEY>
 *
 * Env (Secrets):
 *   - N8N_WEBHOOK_URL
 *   - WRAPPER_API_KEY
 *
 * Public endpoint (NO auth):
 *   - GET /embed.js
 *     Usage:
 *       <script
 *         src="https://mcp-n8n.johnson-tecace.workers.dev/embed.js?v=20260129"
 *         data-group-id="cK71K7F1FPCVAKJCMEls"
 *         data-force-new="0"
 *         defer
 *       ></script>
 *
 * Optional overrides:
 *   - data-widget-base="https://ax-pro.tecace.com/chatkit"
 */

const MCP_PATH = "/mcp";

/** -------------------------
 *  Shared helpers
 *  ------------------------- */
function corsHeaders(origin = "*") {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "content-type,authorization,x-api-key",
    "Access-Control-Max-Age": "86400",
  };
}

function jsonResponse(obj, init = {}) {
  const headers = {
    "content-type": "application/json; charset=utf-8",
    ...corsHeaders("*"),
    ...(init.headers || {}),
  };
  return new Response(JSON.stringify(obj), { ...init, headers });
}

function textResponse(text, init = {}) {
  const headers = {
    "content-type": "text/plain; charset=utf-8",
    ...corsHeaders("*"),
    ...(init.headers || {}),
  };
  return new Response(text, { ...init, headers });
}

function extractApiKey(req) {
  const x = req.headers.get("x-api-key");
  if (x && x.trim()) return x.trim();

  const auth = req.headers.get("authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (m && m[1] && m[1].trim()) return m[1].trim();

  return "";
}

function unauthorized() {
  return textResponse("Unauthorized", { status: 401 });
}

function badRequest(msg = "Bad Request") {
  return textResponse(msg, { status: 400 });
}

function nowIso() {
  return new Date().toISOString();
}

function genId(prefix) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
}

/** -------------------------
 *  MCP Tool definitions
 *  ------------------------- */
function getTools() {
  return [
    {
      name: "n8n_sendMessage",
      description: "Send a message to the n8n chatbot webhook and return its JSON reply.",
      inputSchema: {
        type: "object",
        properties: {
          chatInput: { type: "string", description: "User message" },
          topK: { type: "integer", default: 5 },
          groupId: { type: "string", description: "Chatbot groupId (optional)" },
          sessionId: { type: "string", description: "Optional. If omitted, server generates one." },
          chatId: { type: "string", description: "Optional. If omitted, server generates one." },
          userId: { type: "string", description: "Optional user id" },
          action: { type: "string", description: "Action name", default: "sendMessage" },
        },
        required: ["chatInput"],
      },
    },
  ];
}

function buildN8nPayload(args) {
  if (!args || typeof args !== "object") throw new Error("Invalid tool arguments: expected object");

  const chatInput = typeof args.chatInput === "string" ? args.chatInput : "";
  if (!chatInput.trim()) throw new Error("chatInput is required");

  return {
    sessionId:
      typeof args.sessionId === "string" && args.sessionId.trim()
        ? args.sessionId.trim()
        : genId("session"),
    chatId:
      typeof args.chatId === "string" && args.chatId.trim()
        ? args.chatId.trim()
        : genId("chat"),
    userId:
      typeof args.userId === "string" && args.userId.trim()
        ? args.userId.trim()
        : "anonymous",
    action:
      typeof args.action === "string" && args.action.trim()
        ? args.action.trim()
        : "sendMessage",
    chatInput,
    groupId: typeof args.groupId === "string" && args.groupId.trim() ? args.groupId.trim() : "",
    topK: Number.isFinite(args.topK) ? Number(args.topK) : 5,
    _meta: { ts: nowIso(), source: "mcp-worker" },
  };
}

async function callN8n(env, payload) {
  const url = (env.N8N_WEBHOOK_URL || "").trim();
  if (!url) throw new Error("N8N_WEBHOOK_URL is not set");

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/plain, */*",
    },
    body: JSON.stringify(payload),
  });

  const text = await resp.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (!resp.ok) {
    const msg =
      typeof data === "object" && data && (data.error || data.message)
        ? String(data.error || data.message)
        : `n8n error: HTTP ${resp.status}`;
    const err = new Error(msg);
    err.status = resp.status;
    err.data = data;
    throw err;
  }

  return data;
}

/** -------------------------
 *  MCP JSON-RPC helpers
 *  ------------------------- */
function rpcError(id, code, message, data) {
  const err = { code, message };
  if (data !== undefined) err.data = data;
  return { jsonrpc: "2.0", id: id ?? null, error: err };
}

function rpcResult(id, result) {
  return { jsonrpc: "2.0", id: id ?? null, result };
}

async function handleMcpRpc(req, env) {
  let body;
  try {
    body = await req.json();
  } catch {
    return jsonResponse(rpcError(null, -32700, "Parse error"));
  }

  const id = body?.id ?? null;
  const method = body?.method;

  if (body?.jsonrpc !== "2.0" || typeof method !== "string") {
    return jsonResponse(rpcError(id, -32600, "Invalid Request"));
  }

  if (method === "tools/list") {
    return jsonResponse(rpcResult(id, { tools: getTools() }));
  }

  if (method === "tools/call") {
    const params = body?.params || {};
    const toolName = params?.name;
    const args = params?.arguments;

    if (toolName !== "n8n_sendMessage") {
      return jsonResponse(rpcError(id, -32601, `Unknown tool: ${String(toolName)}`));
    }

    try {
      const payload = buildN8nPayload(args);
      const data = await callN8n(env, payload);
      return jsonResponse(
        rpcResult(id, {
          content: [{ type: "text", text: JSON.stringify(data) }],
          data,
        })
      );
    } catch (e) {
      return jsonResponse(
        rpcError(id, -32000, e?.message || "Tool call failed", {
          status: e?.status,
          detail: e?.data,
        })
      );
    }
  }

  if (method === "initialize") {
    return jsonResponse(
      rpcResult(id, {
        protocolVersion: "2024-11-05",
        serverInfo: { name: "n8n-mcp-wrapper", version: "1.0.0" },
        capabilities: { tools: {} },
      })
    );
  }

  return jsonResponse(rpcError(id, -32601, `Method not found: ${method}`));
}

/** -------------------------
 *  Public /embed.js generator
 *  ------------------------- */
function buildEmbedJs() {
  const DEFAULT_WIDGET_BASE_URL = "https://ax-pro.tecace.com/chatkit";
  const DEFAULT_GROUP_ID = "default";
  const DEFAULT_FORCE_NEW = false;

  return `
(() => {
  const DEFAULT_WIDGET_BASE_URL = ${JSON.stringify(DEFAULT_WIDGET_BASE_URL)};
  const DEFAULT_GROUP_ID = ${JSON.stringify(DEFAULT_GROUP_ID)};
  const DEFAULT_FORCE_NEW = ${JSON.stringify(DEFAULT_FORCE_NEW)};

  function findSelfScript() {
    return (
      document.currentScript ||
      document.querySelector('script[src*="/embed.js"]') ||
      document.querySelector('script[src*="embed.js"]')
    );
  }

  function readBool(v, fallback) {
    const s = String(v ?? "").trim().toLowerCase();
    if (!s) return fallback;
    return s === "1" || s === "true" || s === "yes" || s === "y";
  }

  function clampStr(v, maxLen) {
    const s = String(v ?? "").trim();
    if (!s) return "";
    return s.length > maxLen ? s.slice(0, maxLen) : s;
  }

  function buildIframeUrl(widgetBase, groupId, forceNew) {
    const params = new URLSearchParams();
    if (groupId) params.set("groupId", groupId);
    if (forceNew) params.set("forceNew", "1");

    let url = widgetBase;
    const qs = params.toString();
    if (qs) url += (url.includes("?") ? "&" : "?") + qs;
    return url;
  }

  const script = findSelfScript();
  const widgetBase =
    clampStr(script?.getAttribute("data-widget-base"), 2048) ||
    DEFAULT_WIDGET_BASE_URL;

  const groupId =
    clampStr(script?.getAttribute("data-group-id"), 256) ||
    DEFAULT_GROUP_ID;

  const forceNew = readBool(script?.getAttribute("data-force-new"), DEFAULT_FORCE_NEW);

  // Initial iframe URL
  let iframeUrl = buildIframeUrl(widgetBase, groupId, forceNew);

  // Styles (pill + subtle animation)
  const style = document.createElement("style");
  style.textContent = \`
    :root {
      --ck-z: 2147483000;
      --ck-shadow: 0 14px 40px rgba(0,0,0,.18);
      --ck-border: rgba(17, 24, 39, .14);
      --ck-pill-bg: #6b7280;
      --ck-pill-text: #ffffff;
      --ck-pill-shadow: 0 10px 22px rgba(0,0,0,.16);
      --ck-accent-1: #6d28d9;
      --ck-accent-2: #2563eb;
    }

    .ck-btn {
      position: fixed;
      right: 22px;
      bottom: 22px;
      z-index: var(--ck-z);
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding: 12px 16px;
      border-radius: 999px;
      border: 0;
      background: var(--ck-pill-bg);
      color: var(--ck-pill-text);
      cursor: pointer;
      font: 600 14px/1 system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
      box-shadow: var(--ck-pill-shadow);
      transform: translateY(0);
      transition: transform .18s ease, box-shadow .18s ease, filter .18s ease;
      user-select: none;
      -webkit-tap-highlight-color: transparent;
    }
    .ck-btn:hover {
      transform: translateY(-2px);
      filter: brightness(1.02);
      box-shadow: 0 14px 28px rgba(0,0,0,.20);
    }

    .ck-iconWrap {
      width: 34px;
      height: 34px;
      border-radius: 14px;
      display: grid;
      place-items: center;
      background: linear-gradient(135deg, var(--ck-accent-1), var(--ck-accent-2));
      box-shadow: 0 10px 18px rgba(37,99,235,.22);
      position: relative;
      overflow: hidden;
      flex: 0 0 auto;
    }
    .ck-iconWrap::after {
      content: "";
      position: absolute;
      inset: -60%;
      background: radial-gradient(circle, rgba(255,255,255,.55), transparent 55%);
      transform: translate(-50%, -50%);
      opacity: .55;
      animation: ck-loop 3.2s ease-in-out infinite;
    }
    @keyframes ck-loop {
      0%   { transform: translate(-50%, -50%); opacity: .18; }
      40%  { transform: translate(10%, 5%);    opacity: .55; }
      75%  { transform: translate(55%, 55%);   opacity: .22; }
      100% { transform: translate(-50%, -50%); opacity: .18; }
    }

    .ck-wrap {
      position: fixed;
      right: 22px;
      bottom: 78px;
      z-index: var(--ck-z);
      width: 420px;
      height: 640px;
      border: 1px solid var(--ck-border);
      border-radius: 18px;
      overflow: hidden;
      box-shadow: var(--ck-shadow);
      background: #fff;
      opacity: 0;
      transform: translateY(10px) scale(.98);
      pointer-events: none;
      transition: opacity .20s ease, transform .20s ease;
    }
    .ck-wrap.ck-open {
      opacity: 1;
      transform: translateY(0) scale(1);
      pointer-events: auto;
    }

    .ck-iframe {
      width: 100%;
      height: 100%;
      border: 0;
      display: block;
      background: #fff;
    }

    .ck-close {
      position: absolute;
      top: 12px;
      right: 56px; /* Shift left so it doesn't overlap ChatKit header icons */
      z-index: calc(var(--ck-z) + 1);
      border: 0;
      background: rgba(17,24,39,.55);
      color: white;
      width: 32px;
      height: 32px;
      border-radius: 999px;
      cursor: pointer;
      display: grid;
      place-items: center;
      opacity: 0;
      transition: opacity .15s ease;
    }
    .ck-wrap.ck-open .ck-close { opacity: 1; }

    @media (max-width: 520px) {
      .ck-wrap {
        right: 12px;
        left: 12px;
        width: auto;
        height: min(72vh, 680px);
        bottom: 78px;
      }
      .ck-btn { right: 12px; bottom: 12px; }
    }

    @media (prefers-reduced-motion: reduce) {
      .ck-btn, .ck-wrap { transition: none; }
      .ck-iconWrap::after { animation: none; }
    }
  \`.trim();
  document.head.appendChild(style);

  // Button
  const btn = document.createElement("button");
  btn.className = "ck-btn";
  btn.type = "button";
  btn.setAttribute("aria-label", "Chat with AI");

  const iconWrap = document.createElement("span");
  iconWrap.className = "ck-iconWrap";
  iconWrap.innerHTML = \`
    <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M14.5 0a.5.5 0 0 1 .49.402l.108.539A2.5 2.5 0 0 0 17.06 2.9l.54.109a.5.5 0 0 1 0 .98l-.54.108A2.5 2.5 0 0 0 15.1 6.06l-.109.54a.5.5 0 0 1-.98 0l-.108-.54A2.5 2.5 0 0 0 11.94 4.1l-.54-.109a.5.5 0 0 1 0-.98l.54-.108A2.5 2.5 0 0 0 13.9.94L14.01.4A.5.5 0 0 1 14.5 0ZM7.5 3a.5.5 0 0 1 .482.368L8.43 5.01a6.5 6.5 0 0 0 4.56 4.561l1.642.448a.5.5 0 0 1 0 .964l-1.641.448a6.5 6.5 0 0 0-4.561 4.56l-.448 1.642a.5.5 0 0 1-.964 0L6.57 15.99a6.5 6.5 0 0 0-4.56-4.561l-1.642-.448a.5.5 0 0 1 0-.964L2.01 9.57A6.5 6.5 0 0 0 6.57 5.01l.448-1.642A.5.5 0 0 1 7.5 3Z" fill="white"></path>
    </svg>
  \`;

  const label = document.createElement("span");
  label.textContent = "Chat with AI";

  btn.appendChild(iconWrap);
  btn.appendChild(label);
  document.body.appendChild(btn);

  // Widget wrapper
  const wrap = document.createElement("div");
  wrap.className = "ck-wrap";

  // Iframe
  const iframe = document.createElement("iframe");
  iframe.className = "ck-iframe";
  iframe.src = iframeUrl;
  iframe.setAttribute("title", "Chat");
  iframe.setAttribute("allow", "clipboard-read; clipboard-write");
  iframe.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
  wrap.appendChild(iframe);

  document.body.appendChild(wrap);

  function open() { wrap.classList.add("ck-open"); }
  function close() { wrap.classList.remove("ck-open"); }
  function toggle() { wrap.classList.toggle("ck-open"); }

  btn.addEventListener("click", toggle);

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });

  // Close the widget when clicking anywhere outside the chat wrapper and trigger button
  document.addEventListener("click", (e) => {
    if (!wrap.classList.contains("ck-open")) return;
    const target = e.target;
    if (!(target instanceof Element)) return;
    if (wrap.contains(target) || btn.contains(target)) return;
    close();
  });

  // Auto-recovery:
  // If the embedded page fails due to an expired/invalid session, it often resolves by forcing a new session.
  // We can't reliably detect 401 inside the iframe (cross-origin), so we do a safe heuristic:
  // - If iframe errors out, or doesn't finish loading within a timeout, retry once with forceNew=1.
  let retried = false;
  const LOAD_TIMEOUT_MS = 15000;
  let loadTimer = null;

  function clearLoadTimer() {
    if (loadTimer) { clearTimeout(loadTimer); loadTimer = null; }
  }

  function scheduleTimeoutRetry() {
    clearLoadTimer();
    loadTimer = setTimeout(() => {
      if (retried) return;
      retried = true;
      iframeUrl = buildIframeUrl(widgetBase, groupId, true);
      iframe.src = iframeUrl;
    }, LOAD_TIMEOUT_MS);
  }

  iframe.addEventListener("load", () => {
    clearLoadTimer();
  });

  iframe.addEventListener("error", () => {
    if (retried) return;
    retried = true;
    clearLoadTimer();
    iframeUrl = buildIframeUrl(widgetBase, groupId, true);
    iframe.src = iframeUrl;
  });

  // Start the heuristic timer immediately
  scheduleTimeoutRetry();
})();
`.trim();
}

/** -------------------------
 *  Worker entry
 *  ------------------------- */
export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders("*") });
    }

    const url = new URL(request.url);

    // Public embed script (NO auth)
    if (request.method === "GET" && url.pathname === "/embed.js") {
      const js = buildEmbedJs();
      return new Response(js, {
        status: 200,
        headers: {
          "content-type": "application/javascript; charset=utf-8",
          "cache-control": "public, max-age=60",
          ...corsHeaders("*"),
        },
      });
    }

    // Basic health page (public)
    if (request.method === "GET" && (url.pathname === "/" || url.pathname === "")) {
      return textResponse("ok");
    }

    // Auth for everything else (including POST /mcp)
    const expected = (env.WRAPPER_API_KEY || "").trim();
    if (!expected) {
      return textResponse("Server misconfigured: WRAPPER_API_KEY missing", { status: 500 });
    }
    const got = extractApiKey(request);
    if (got !== expected) {
      return unauthorized();
    }

    // MCP endpoint
    if (url.pathname === MCP_PATH) {
      if (request.method !== "POST") return badRequest("Use POST /mcp");
      return await handleMcpRpc(request, env);
    }

    return textResponse("Not Found", { status: 404 });
  },
};