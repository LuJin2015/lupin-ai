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

