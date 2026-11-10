# components/app/chat/kit

The chat page and composer are built from fifteen small presentational pieces, named after Meta's Astryx chat components and mirrored one-for-one in the phone app (`apps/mobile/src/features/chat/kit`): `ChatLayout`, `ChatMessageList`, `ChatLayoutScrollButton`, `ChatMessage`, `ChatMessageBubble`, `ChatMessageMetadata`, `ChatSystemMessage`, `ChatToolCalls`, `ChatTokenizedText`, `ChatComposer` (+ `ChatComposerToolbar`), `ChatComposerDrawer`, `ChatComposerInput`, `ChatComposerTokenElement`, `ChatDictationButton`, `ChatSendButton`.

They are our own code in our design tokens (Astryx itself is React-web only and brings its own styling, so it is not installed). Audio and pictures keep the existing `AudioWave`, `AttachmentImage`, `FilePreviewList` and `RecordButton`. Pieces hold no data fetching; `ChatApp.tsx` and `Composer.tsx` own the state.
