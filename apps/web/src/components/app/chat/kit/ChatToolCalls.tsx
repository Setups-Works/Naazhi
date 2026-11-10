"use client";
import type { ChatProposal, ShowItem } from "../../../../lib/chat-actions";
import ShownItems from "../shown/ShownItems";
import ChatActionProposal from "../ChatActionProposal";

/** What the assistant did besides talking: cards showing the person's own items, and drafts waiting for them to press Create. */
export default function ChatToolCalls({
  shows,
  proposals,
  messageId,
  chatId,
}: {
  shows: ShowItem[];
  proposals: ChatProposal[];
  messageId: string;
  chatId: string;
}) {
  return (
    <>
      {shows.length > 0 && <ShownItems shows={shows} />}
      {proposals.length > 0 && <ChatActionProposal proposals={proposals} messageId={messageId} chatId={chatId} />}
    </>
  );
}
