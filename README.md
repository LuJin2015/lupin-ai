# Lupin AI

A modern chat assistant powered by **Qwen/Qwen3.8-27B** on Hugging Face Inference Providers, with a Cloudflare Worker keeping the API token server-side.

## Setup

1. Create a Hugging Face access token with Inference Providers permission: https://huggingface.co/settings/tokens
2. In Cloudflare, make an API token that can deploy Workers and find your account ID.
3. In this GitHub repo, open **Settings → Secrets and variables → Actions** and add:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
   - `HF_TOKEN` (your Hugging Face token)
4. Push to `main` or run the **Deploy Lupin AI** workflow manually.
5. The configured default URL is https://lupin-ai.lujinsg.workers.dev (it will work after a successful first deployment and if that Workers subdomain is enabled for your account).

## Local development

```sh
npm install
npx wrangler secret put HF_TOKEN
npm run dev
```

Never commit or share your Hugging Face or Cloudflare tokens. Hosted inference may have usage limits or charges; check current Hugging Face pricing before making the app public.

## Model

Default: [Qwen/Qwen3.8-27B](https://huggingface.co/Qwen/Qwen3.8-27B). The app calls Hugging Face's OpenAI-compatible chat-completions endpoint.
