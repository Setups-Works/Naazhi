# apps/web/src/server/providers

**Purpose:** Adapters to third-party services, each behind an interface so the rest of the code never depends on a vendor. Today: `ai/` (Groq, Puter) and `embeddings/localE5.ts` (local multilingual E5 through Transformers.js). **Owner:** track C.

## Rules

- One folder per vendor under its capability (`ai/groq`, `ai/puter`). A new vendor = a new folder implementing the capability interface + one line in the registry — nothing else changes.
- Providers read secrets via `serverEnv()`; they expose `isAvailable()` so the UI/router can degrade gracefully.
- Map vendor errors to our typed errors (`AiProviderError` with `code`). Never leak vendor error bodies to users.
- No imports from `apps/web/src/server/services` (providers are leaf dependencies).
- Add contract tests with a fake provider so the orchestrator can be tested without network.
- The E5 adapter uses a pinned `Xenova/multilingual-e5-small` ONNX export of `intfloat/multilingual-e5-small` for local CPU inference. Keep `query:` and `passage:` prefixes, mean pooling, normalized 384-dimensional outputs, and the singleton pipeline. Never send embedding text to a hosted embedding API.
- Model artifacts are downloaded from the public Hugging Face Hub on first use and cached by Transformers.js. Recheck cache persistence and CPU/RAM within the actual Docker/Azure quotas before deployment.
