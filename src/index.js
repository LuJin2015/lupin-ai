const MODEL = "@cf/qwen/qwen3.8-27b";
const SYSTEM_PROMPT = "You are Lupin AI, a helpful, friendly, clear AI assistant. Be honest when uncertain and never claim actions you did not perform.";
const ALLOWED_ORIGIN = "https://lujin2015.github.io";
function json(data, status = 200, origin = "") {
  const headers = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "Vary": "Origin" };
  if (origin === ALLOWED_ORIGIN) {
    headers["Access-Control-Allow-Origin"] = ALLOWED_ORIGIN;
    headers["Access-Control-Allow-Methods"] = "POST, OPTIONS";
    headers["Access-Control-Allow-Headers"] = "Content-Type";
  }
  return new Response(JSON.stringify(data), { status, headers });
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== "/api/chat") return env.ASSETS.fetch(request);
    const origin = request.headers.get("Origin") || "";
    if (request.method === "OPTIONS") {
      if (origin !== ALLOWED_ORIGIN) return new Response(null, { status: 403 });
      return new Response(null, { status: 204, headers: {
        "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Max-Age": "86400",
        "Vary": "Origin"
      }});
    }
    if (origin && origin !== ALLOWED_ORIGIN) return json({ error: "This website is not allowed to use the Lupin AI API." }, 403);
    if (request.method !== "POST") return json({ error: "Use POST for chat requests." }, 405, origin);
    if (!env.AI) return json({ error: "Workers AI binding is missing. Check wrangler.toml." }, 503, origin);
    let body;
    try { body = await request.json(); } catch { return json({ error: "Request body must be valid JSON." }, 400, origin); }
    if (!Array.isArray(body.messages)) return json({ error: "messages must be an array." }, 400, origin);
    const messages = body.messages.slice(-20).map(m => ({ role: m?.role === "assistant" ? "assistant" : "user", content: String(m?.content ?? "").slice(0, 6000) }));
    if (!messages.some(m => m.role === "user" && m.content.trim())) return json({ error: "Enter a message first." }, 400, origin);
    try {
      const result = await env.AI.run(MODEL, { messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages], max_completion_tokens: 900, temperature: 0.7 });
      const reply = result?.response ?? result?.result?.response ?? result?.choices?.[0]?.message?.content;
      if (typeof reply !== "string" || !reply.trim()) return json({ error: "The model returned an empty response. Try again." }, 502, origin);
      return json({ reply, model: MODEL }, 200, origin);
    } catch {
      return json({ error: "Cloudflare Workers AI could not complete the request. Check your Workers AI access and usage limits, then try again." }, 502, origin);
    }
  }
};
