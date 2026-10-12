const MODEL = "Qwen/Qwen3.8-27B";
const HF_CHAT_URL = "https://router.huggingface.co/v1/chat/completions";
const SYSTEM_PROMPT = "You are Lupin AI, a helpful, friendly, clear AI assistant. Be honest when uncertain, explain things in an approachable way, and never claim you performed actions you did not perform.";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== "/api/chat") return env.ASSETS.fetch(request);
    if (request.method !== "POST") return json({ error: "Use POST for chat requests." }, 405);
    if (!env.HF_TOKEN) return json({ error: "Server setup incomplete: add HF_TOKEN as a Cloudflare Worker secret." }, 503);

    let body;
    try { body = await request.json(); }
    catch { return json({ error: "Request body must be valid JSON." }, 400); }

    if (!Array.isArray(body.messages)) return json({ error: "messages must be an array." }, 400);
    const messages = body.messages.slice(-20).map(m => ({
      role: m?.role === "assistant" ? "assistant" : "user",
      content: String(m?.content ?? "").slice(0, 6000)
    }));
    if (!messages.some(m => m.role === "user" && m.content.trim())) return json({ error: "Enter a message first." }, 400);

    try {
      const upstream = await fetch(HF_CHAT_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${env.HF_TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: MODEL,
          messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
          max_tokens: 900,
          temperature: 0.7,
          stream: false
        })
      });
      const data = await upstream.json().catch(() => ({}));
      if (!upstream.ok) {
        const detail = typeof data.error === "string" ? data.error : "The model provider rejected the request.";
        return json({ error: detail, providerStatus: upstream.status }, 502);
      }
      const reply = data?.choices?.[0]?.message?.content;
      if (typeof reply !== "string" || !reply.trim()) return json({ error: "The model returned an empty response. Try again." }, 502);
      return json({ reply, model: MODEL });
    } catch {
      return json({ error: "Could not reach Hugging Face. Please try again shortly." }, 502);
    }
  }
};
