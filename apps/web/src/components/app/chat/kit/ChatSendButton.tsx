import { FontAwesomeIcon as FA } from "@fortawesome/react-fontawesome";
import { faArrowUp } from "@fortawesome/free-solid-svg-icons";

/** The round send arrow. Submits the composer's form. */
export default function ChatSendButton({ disabled }: { disabled: boolean }) {
  return (
    <button className="jr-send" disabled={disabled} aria-label="Send message" title="Send (Enter)">
      <FA icon={faArrowUp} />
    </button>
  );
}
