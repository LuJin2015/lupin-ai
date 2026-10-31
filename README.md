# Lupin AI

A modern chat assistant powered by **Qwen 3.8 27B on Cloudflare Workers AI**. The chat API runs in a Cloudflare Worker and calls the model through the built-in `env.AI` binding.

## Setup

1. Create a Cloudflare API token with permission to deploy Workers, and find your Cloudflare account ID.
2. In this GitHub repo, open **Settings → Secrets and variables → Actions** and add:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
3. Push to `main` or run the **Deploy Lupin AI** workflow manually.
4. The configured default URL is https://lupin-ai.lujinsg.workers.dev (it will work after a successful first deployment and if that Workers subdomain is enabled for your account).

**No Hugging Face token is required.** The Worker uses Cloudflare's native Workers AI binding. Model availability, account quotas, and usage pricing are controlled by Cloudflare; check current Workers AI pricing before making the app public.

## Local development

```sh
npm install
npm run dev
```

## Model

Default: [@cf/qwen/qwen3.8-27b](https://developers.cloudflare.com/workers-ai/models/qwen3.8-27b/), called using `env.AI.run()`.

Never commit or share your Cloudflare API token.

## Credits and model origins

**Underlying model family:** Qwen, associated with Alibaba's Tongyi Lab. Lupin AI currently calls the Cloudflare Workers AI model `@cf/qwen/qwen3.8-27b`. This credits the underlying model technology and does not mean Alibaba created the Lupin AI application.

**Lupin AI project lead and improver:** Lu Jin — developed, customized, and improved the Lupin AI application and its Lupin-specific integrations.

**AI development assistant:** ChatGPT by OpenAI — assisted with coding, debugging, documentation, and design.

The application, the underlying model, and third-party components have distinct origins and may be subject to different licenses and rights. Consult the relevant model and provider documentation for applicable terms.

## OpenAI-compatible API

Lupin AI can issue account-bound API keys for applications that use the OpenAI SDK.

1. Open the Lupin AI website and sign in with your Lupin Cloud account.
2. Select **API keys** in the top bar, enter a label, and create a key.
3. Copy the key immediately. The full key is displayed only once. Lupin stores its SHA-256 hash, not the plaintext key.
4. Use the key with the OpenAI SDK:

```python
from openai import OpenAI

client = OpenAI(
    api_key="sk-lupin-YOUR_KEY",
    base_url="https://lupin-ai.lujinsg.workers.dev/v1"
)

response = client.chat.completions.create(
    model="lupin-ai",
    messages=[{"role": "user", "content": "Hello from my app!"}],
    stream=True
)
for chunk in response:
    text = chunk.choices[0].delta.content
    if text:
        print(text, end="", flush=True)
```

### Supported endpoints

- `GET /v1/models` — lists `lupin-ai` and `qwen3.8-27b`.
- `POST /v1/chat/completions` — OpenAI-style chat completion request and response.
- `GET /api/keys`, `POST /api/keys`, `DELETE /api/keys/{id}` — authenticated key management used by the website.

The API supports both non-streaming and streaming text chat. Set `stream: true` to receive OpenAI-compatible Server-Sent Events, or omit it for a single JSON response. Tools/function calling, image inputs through this API, and fine-tuning endpoints are not implemented. Both listed model IDs route to Lupin AI's configured Cloudflare Workers AI model.

API calls use the same per-account LupinTokens allowance and shared daily safety cap as the Lupin AI website. API keys are tied to the account that created them, can be revoked from the API keys panel, and are limited to 10 active keys per account. Treat keys like passwords: never put them in browser code, public repositories, or shared screenshots. If a key is exposed, revoke it and create another.
