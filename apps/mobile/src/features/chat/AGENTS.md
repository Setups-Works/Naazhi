# features/chat (app)

## Chat kit (`kit/`)

The conversation and composer are built from fifteen small pieces, named like the web's (`apps/web/src/components/app/chat/kit`): `ChatLayout`, `ChatMessageList`, `ChatLayoutScrollButton`, `ChatMessage`, `ChatMessageBubble`, `ChatMessageMetadata`, `ChatSystemMessage`, `ChatToolCalls` (shown cards and Create-drafts), `ChatTokenizedText` (links in a person's message), `ChatComposer`, `ChatComposerDrawer` (attachment previews: pictures, audio), `ChatComposerInput`, `ChatComposerTokenElement`, `ChatDictationButton` (voice recording) and `ChatSendButton`. Change one piece, not the screens; keep the names the same on both platforms.
