import { BrandMark } from "@/components/ui/BrandMark";
import { useEffect, useRef, useState } from "react";
import { Keyboard, Platform, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { parseChatActions, type ChatProposal, type ShowItem } from "@untitled/validation";

import { Composer } from "./Composer";
import { ChatLayout, ChatMessage, ChatMessageBubble, ChatMessageList, ChatMessageMetadata, ChatSystemMessage, ChatTokenizedText, ChatToolCalls } from "./kit";
import { uploadChatFile, type PendingFile } from "./files";
import { useAiProviders } from "./providers";
import { useChatActions, useMessages } from "./queries";
import { streamReply } from "./streamReply";
import { prettyTitle } from "./text";
import type { Attachment } from "@untitled/types";
import { AppText } from "@/components/ui/AppText";
import { AttachmentGallery } from "@/components/ui/AttachmentGallery";
import { Markdown } from "@/components/ui/Markdown";
import { Icon } from "@/components/ui/Icon";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { Palette, Radius, themedStyles } from "@/constants/theme";
import { errorMessage } from "@/lib/api";
import { greeting } from "@/lib/dates";
import { useAppState } from "@/providers/AppState";
import { useLayout } from "@/lib/layout";

const titleFrom = (text: string) => prettyTitle((text.split("\n")[0]?.trim() || "New chat").slice(0, 60));

/**
 * The conversation itself, shown right on the Chat tab. `chatId` is null for a new chat; the parent remounts this component
 * (via `key`) when another chat is picked, so each conversation starts with clean state and any streaming reply is aborted.
 */
export function Conversation({
  chatId: initialId,
  seed,
  onSeeded,
  onCreated,
  embedded = false,
}: {
  /** Shown inside another screen (the setup), where no tab bar floats over the bottom. */
  embedded?: boolean;
  chatId: string | null;
  /** A first message to send by itself when this opens a new chat. */
  seed?: string;
  /** Called as the seed is sent, so the parent doesn't offer it to a later chat. */
  onSeeded?: () => void;
  onCreated: (id: string) => void;
}) {
  const { user } = useAppState();
  const [chatId, setChatId] = useState<string | null>(initialId);
  const messagesQ = useMessages(chatId ?? undefined);
  const { providers, provider, select: selectProvider, loading: providersLoading } = useAiProviders();
  const { createChat, addMessage, refreshMessages } = useChatActions();
  const [error, setError] = useState("");
  const [streaming, setStreaming] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const insets = useSafeAreaInsets();
  const [keyboard, setKeyboard] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow", () => setKeyboard(true));
    const hide = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide", () => setKeyboard(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  // The floating tab bar covers the bottom of the screen when keyboard is not visible.
  // The floating navbar sits under the composer on a phone; the tablet sidebar does not.
  const { sidebar } = useLayout();
  const lift = !keyboard && !embedded && !sidebar ? insets.bottom + 78 : 8;

  // Leaving the screen stops any reply still streaming.
  useEffect(() => () => abort.current?.abort(), []);

  async function send(text: string, files: PendingFile[], saved: () => void): Promise<boolean> {
    if (busy || (!text && !files.length) || !user) return false;
    setBusy(true);
    setError("");
    try {
      let target = chatId;
      if (!target) {
        const chat = await createChat.mutateAsync(titleFrom(text || files[0]?.name || "New chat"));
        if (!chat) throw new Error("Couldn’t start that chat.");
        target = chat.id;
        setChatId(target);
        onCreated(target); // lets the parent highlight this chat in the recents list without remounting
      }
      // Files go to storage first (a failed one is reported and skipped), then the message is saved with their descriptions.
      const attachments: Attachment[] = [];
      for (const f of files) {
        try {
          attachments.push(await uploadChatFile(user.id, target, f));
        } catch {
          setError(`Couldn’t upload ${f.name}.`);
        }
      }
      await addMessage.mutateAsync({ chatId: target, body: text || (attachments.length ? "Attachment" : ""), attachments });
      saved(); // the message is stored: empty the box now, not after the AI answers
      if (provider === "none") return true; // "No AI": the message is saved, no reply is generated
      const controller = new AbortController();
      abort.current = controller;
      setStreaming("");
      try {
        const failure = await streamReply({ chatId: target, provider, signal: controller.signal, onText: setStreaming });
        if (failure) setError(failure);
      } catch {
        if (!controller.signal.aborted) setError("The AI couldn’t reply. Your message was saved.");
      } finally {
        setStreaming(null);
        abort.current = null;
        await refreshMessages(target);
      }
      return true;
    } catch (e) {
      setError(errorMessage(e, "Couldn’t send that message."));
      return false;
    } finally {
      setBusy(false);
    }
  }

  // Sent once, and only after the AI list has loaded, so the reply isn't skipped as "No AI".
  const seeded = useRef(false);
  useEffect(() => {
    if (!seed || initialId || seeded.current || providersLoading || !user) return;
    seeded.current = true;
    onSeeded?.();
    void send(seed, [], () => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps -- send changes every render; this must run once per mount
  }, [seed, initialId, providersLoading, user]);

  const messages = messagesQ.data ?? [];
  // Not while the provider list is still loading: "No AI" is only the placeholder until the server answers.
  const noAi = provider === "none" && !providersLoading;

  return (
    <ChatLayout
      footer={
        <>
          {noAi ? <ChatSystemMessage>No AI is selected. Messages are saved to the chat without replies.</ChatSystemMessage> : null}
          {error ? <ChatSystemMessage kind="error">{error}</ChatSystemMessage> : null}

          {streaming !== null ? (
            <View style={styles.stopRow}>
              <Pressable accessibilityRole="button" accessibilityLabel="Stop reply" onPress={() => abort.current?.abort()} style={styles.stop}>
                <Icon name="stop" size={12} color={Palette.clayFg} />
                <AppText variant="small" color={Palette.clayFg}>
                  Stop
                </AppText>
              </Pressable>
            </View>
          ) : null}

          <Composer
            busy={busy}
            providers={providers}
            provider={provider}
            onProvider={selectProvider}
            onSend={send}
            onError={setError}
            bottomInset={lift}
          />
        </>
      }
    >
      {chatId && messagesQ.isPending ? (
        <LoadingState />
      ) : messagesQ.isError ? (
        <ErrorState message={errorMessage(messagesQ.error)} onRetry={() => void messagesQ.refetch()} />
      ) : (
        <ChatMessageList
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.messages}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            streaming === null ? (
              <View style={styles.hello}>
                <BrandMark size={44} on="page" />
                <AppText variant="title" align="center">
                  {greeting()}
                  {user ? `, ${user.name.split(" ")[0]}` : ""}
                </AppText>
                <AppText variant="body" align="center" color={Palette.fgMuted}>
                  What’s on your mind?
                </AppText>
              </View>
            ) : undefined
          }
          renderItem={({ item }) => (
            <Bubble role={item.role} text={item.body} messageId={item.id} chatId={chatId} attachments={item.attachments} at={item.created_at} />
          )}
          ListFooterComponent={streaming !== null ? <Bubble role="assistant" text={streaming || "…"} /> : undefined}
        />
      )}
    </ChatLayout>
  );
}

function Bubble({
  role,
  text,
  messageId,
  chatId,
  attachments = [],
  at,
}: {
  role: "user" | "assistant";
  text: string;
  messageId?: string;
  chatId?: string | null;
  attachments?: Attachment[];
  at?: string;
}) {
  const mine = role === "user";
  // Only the assistant's own messages are parsed for drafts; text a user types can never create items.
  const { body, proposals, shows } = mine ? { body: text, proposals: [] as ChatProposal[], shows: [] as ShowItem[] } : parseChatActions(text);
  return (
    <ChatMessage role={role}>
      <ChatMessageBubble mine={mine} wide={proposals.length > 0 || shows.length > 0}>
        {body && !(attachments.length && body === "Attachment") ? mine ? <ChatTokenizedText text={body} /> : <Markdown text={body} /> : null}
        {attachments.length ? <AttachmentGallery attachments={attachments} /> : null}
        <ChatToolCalls shows={shows} proposals={proposals} messageId={messageId} chatId={chatId} />
        {at ? <ChatMessageMetadata at={at} mine={mine} /> : null}
      </ChatMessageBubble>
    </ChatMessage>
  );
}

const styles = themedStyles(() => ({
  stopRow: { alignItems: "center", paddingBottom: 4 },
  stop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 34,
    paddingHorizontal: 14,
    borderRadius: Radius.pill,
    backgroundColor: Palette.clayBg,
  },
  messages: { padding: 20, gap: 10, flexGrow: 1 },
  hello: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 80 },
}));
