const MODEL = "@cf/qwen/qwen3.8-27b";
const SYSTEM_PROMPT = "You are Lupin AI, a helpful, friendly, clear AI assistant. Be honest when uncertain and never claim actions you did not perform.";
function json(data, status = 200) { return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } }); }
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== "/api/chat") return env.ASSETS.fetch(request);
    if (request.method !== "POST") return json({ error: "Use POST for chat requests." }, 405);
    if (!env.AI) return json({ error: "Workers AI binding is missing. Check wrangler.toml." }, 503);
    let body;
    try { body = await request.json(); } catch { return json({ error: "Request body must be valid JSON." }, 400); }
    if (!Array.isArray(body.messages)) return json({ error: "messages must be an array." }, 400);
    const messages = body.messages.slice(-20).map(m => ({ role: m?.role === "assistant" ? "assistant" : "user", content: String(m?.content ?? "").slice(0, 6000) }));
    if (!messages.some(m => m.role === "user" && m.content.trim())) return json({ error: "Enter a message first." }, 400);
    try {
      const result = await env.AI.run(MODEL, { messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages], max_completion_tokens: 900, temperature: 0.7 });
      const reply = result?.response ?? result?.result?.response ?? result?.choices?.[0]?.message?.content;
      if (typeof reply !== "string" || !reply.trim()) return json({ error: "The model returned an empty response. Try again." }, 502);
      return json({ reply, model: MODEL });
    } catch {
      return json({ error: "Cloudflare Workers AI could not complete the request. Check your Workers AI access and usage limits, then try again." }, 502);
    }
  }
};
