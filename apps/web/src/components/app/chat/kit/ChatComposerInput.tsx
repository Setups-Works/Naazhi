"use client";
import { forwardRef } from "react";

/** The message box: grows with the text up to 200 px, Enter sends, Shift+Enter adds a line. */
const ChatComposerInput = forwardRef<
  HTMLTextAreaElement,
  { value: string; onChange: (text: string) => void; onSubmit: () => void; autoFocus?: boolean; placeholder?: string }
>(function ChatComposerInput({ value, onChange, onSubmit, autoFocus, placeholder = "Ask anything…" }, ref) {
  return (
    <textarea
      ref={ref}
      value={value}
      rows={1}
      maxLength={20000}
      autoFocus={autoFocus}
      placeholder={placeholder}
      aria-label="Message"
      onChange={(e) => {
        onChange(e.target.value);
        e.target.style.height = "auto";
        e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
          e.preventDefault();
          onSubmit();
        }
      }}
    />
  );
});
export default ChatComposerInput;
