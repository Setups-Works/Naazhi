import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import { ChatMessage, ChatMessageBubble } from "@/features/chat/kit";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Markdown } from "@/components/ui/Markdown";
import { PageHeader } from "@/components/ui/PageHeader";
import { Screen } from "@/components/ui/Screen";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { Palette, Space, themedStyles } from "@/constants/theme";
import { api, errorMessage } from "@/lib/api";
import { prettyTitle } from "@/features/chat/text";
import { useAppState } from "@/providers/AppState";

type Shared = { title: string; shared_at: string; messages: { id: string; role: "user" | "assistant"; body: string; created_at: string }[] };

/**
 * A chat someone shared by link (https://<app address>/share/<token>, which the phone opens here instead of the browser). It is read-only,
 * and "Continue the conversation" copies it into your own chats and opens it in Chat. Not signed in: the button sends you to sign in.
 */
export function SharedChatScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const { signedIn } = useAppState();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const q = useQuery({
    queryKey: ["shared-chat", token],
    enabled: !!token,
    retry: false,
    queryFn: async () => (await api.get<{ data: Shared }>(`/api/v1/shared-chats/${token}`)).data,
  });

  async function carryOn() {
    if (!signedIn) return router.replace("/login");
    setBusy(true);
    setError("");
    try {
      const res = await api.post<{ data: { id: string } }>(`/api/v1/shared-chats/${token}/continue`, {});
      router.replace({ pathname: "/chat", params: { chat: res.data.id } });
    } catch (e) {
      setError(errorMessage(e, "Couldn’t copy this chat. Try again."));
      setBusy(false);
    }
  }

  const close = () => (router.canGoBack() ? router.back() : router.replace("/"));
  return (
    <Screen contentStyle={styles.page}>
      <PageHeader title={q.data ? prettyTitle(q.data.title) : "Shared chat"} subtitle={q.data ? "Shared conversation · read-only" : undefined} onBack={close} backLabel="Close" />
      {q.isPending ? <LoadingState /> : null}
      {q.isError ? <ErrorState message={errorMessage(q.error, "This chat isn’t shared any more.")} onRetry={() => void q.refetch()} /> : null}
      {q.data ? (
        <>
          <View style={styles.list}>
            {q.data.messages.length === 0 ? <AppText variant="small">This chat has no messages yet.</AppText> : null}
            {q.data.messages.map((m) => (
              <ChatMessage key={m.id} role={m.role}>
                <ChatMessageBubble mine={m.role === "user"} wide={m.role === "assistant"}>
                  {m.role === "assistant" ? <Markdown text={m.body} /> : <AppText color={Palette.onDark}>{m.body}</AppText>}
                </ChatMessageBubble>
              </ChatMessage>
            ))}
          </View>
          <View style={styles.cta}>
            <Button title={signedIn ? "Continue the conversation" : "Sign in to continue"} icon="arrow-right" loading={busy} onPress={() => void carryOn()} />
            <AppText variant="small" color={Palette.fgSubtle} align="center">
              Copies this chat into your own chats so you can carry on. The original stays as it is.
            </AppText>
            {error ? (
              <AppText variant="small" color={Palette.clayFg} align="center" accessibilityRole="alert">
                {error}
              </AppText>
            ) : null}
          </View>
        </>
      ) : null}
    </Screen>
  );
}

const styles = themedStyles(() => ({
  page: { gap: Space.lg, paddingBottom: Space.xxl },
  list: { gap: Space.md },
  cta: { gap: Space.sm },
}));
