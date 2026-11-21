# services/ai — AI orchestrator

**Owner:** track C. **Phase 4.** **Jira:** UNT-77 router · UNT-80 orchestrator · UNT-82 tools · UNT-83 usage · UNT-84 prompts · UNT-86 semantic search.

**Done (UNT-80 first slice, UNT-84 first prompt):** `chat.ts` → `startChatReply()` reads the conversation as the signed-in user, streams the provider's answer and saves it as an assistant message; rate limit per user per minute (Redis); `prompts/chat.ts` holds the versioned system prompt. Chat organises a diary-style or planning message (prompt `chat.v3`) into up to six drafts — one journal entry holding the whole message, a to-do per dated action, a note per "later" item — shown as cards; `POST /api/v1/ai/actions` (`{messageId, which: index | "all"}`) creates them only after the user presses Create, and marks each created draft in the message so it can't be created twice (`lib/chat-actions.ts`, tests in `apps/web/tests/unit/chat-actions.test.ts`). Providers are listed by `GET /api/v1/ai/status`. **Not yet:** usage metering, general tools, auto-title, regenerate/stop, attachments sent to the model, client-runtime (Puter) hand-off.

**Responsibilities**

- Build the model input: system prompt (versioned, from `prompts/`), a window of the conversation, optional workspace context.
- Choose a provider via the router (`apps/web/src/server/providers/ai`), stream the answer (SSE), handle stop/regenerate/edit-and-resend.
- Persist assistant messages with provider, model, token usage, finish reason; auto-title chats.
- Tool calling: expose our services/Composio tools to the model; **writes need a user confirmation step** with a preview; log every tool call.
- Meter usage (`ai_usage`) and enforce plan limits _before_ calling a provider.
- "No AI" mode when no provider is available — never an error screen.

**Showing the user's own items:** the assistant can't see journal, to-dos or notes. When asked to show them it adds `<show-item>` blocks (journal for a day, to-dos by scope, notes by words, health for a day, Reader articles: latest / starred / unread, optionally from one followed site); the web (`components/app/chat/shown`) and the app (`features/chat/shown`) read the real items from the signed-in person's own data and draw them as cards with an Open button. Parsing: `packages/validation/src/chatActions.ts` (`showItemSchema`, at most 3 per reply); scopes and matching: `packages/logic/src/showItems.ts`. No content is ever sent to the provider for this.

**Reader in chat (`chat.v15`):** `{"kind":"rss",view,site}` show blocks draw the person's real articles (web `shown/RssShown`, app `shown/RssShown`; the site is matched against followed feeds with `feedsMatching`), and a `{"kind":"feed",title,url}` draft adds a website's feed to the Reader only after the user presses Create (`actions.ts` calls `rss.service.addFeed`, so the same limits and safe fetching apply).

**Changing and deleting (`chat.v24`):** `edit_item` / `delete_item` drafts (`target` task / note / journal) let the assistant change or remove what the person already has. The assistant can't see their items, so it names one in words (`match`; a date for a journal entry). The card calls `POST /api/v1/ai/actions/targets` (`listChatTargets`: the real items, read as the signed-in person) and the person picks one and presses the button; `POST /api/v1/ai/actions` then takes `targetId`, which `findTargets` re-checks, so only an item the card offered can change. "Create all" skips these drafts. A deleted note goes to Trash (30 days); a to-do or journal entry is removed, as on its page. Web `ChatActionProposal.tsx` and app `features/chat/kit/ChatToolCalls.tsx` draw them; matching is `tasksMatching` / `notesMatching` in `packages/logic/src/showItems.ts`.

**Rules**

- Only this service talks to `AiProvider`s. Features call the orchestrator, not Groq/Puter.
- Treat user content, emails, transcripts and tool output as **untrusted**: keep them in clearly delimited data sections of the prompt, never in the system prompt.
- Prompts are files in `prompts/` with a version string and tests (fixed inputs → expected structure); no ad-hoc prompt strings in routes.
- Respect `AbortSignal`. Never log prompt or answer text.
- Puter (`runtime: "client"`): hand the prepared messages to the browser and accept the final message back through `/api/v1/ai/messages`.

**Zoho in chat (`chat.v20`):** `zohoLine` (prompts/chat.ts) is added only for people with Zoho set up; `<show-item>{"kind":"zoho"}` cards are read by `services/integrations/zoho`; `zoho_crm` / `zoho_mail` / `zoho_cliq` drafts are created in `actions.ts` after the button press. See `docs/ZOHO.md`.

**Prompt boundary:** `startChatReply()` validates the latest persisted user message through `promptValidation.ts` before provider selection or generation. Input validation covers type, non-empty content, controls, and the 6,000-character cap. Multiple independent injection signals add a fixed trusted system guard; they do not replace authorization, the fixed prompt, or role separation. Do not log prompt content.

**Long-term semantic memory:** not integrated yet. `providers/embeddings/localE5.ts` supplies local 384-dimensional E5 embeddings, but vector persistence and retrieval must wait until pgvector is verified on the active database. Keep `chat_messages` as short-term history and never add client-controlled user filters.
