"use client";
import { Icon as FA } from "@/components/ui/Icon";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import Modal from "../../components/ui/Modal";
import NotificationList from "./NotificationList";

/** The bell's panel: the inbox on the right edge, over the page. */
export default function NotificationsPanel({ onClose }: { onClose: () => void }) {
  return (
    <Modal label="Notifications" onClose={onClose} size="side">
      <div className="td">
        <div className="td-head">
          <h2 className="h3">Notifications</h2>
          <button type="button" className="ne-btn" aria-label="Close" onClick={onClose}>
            <FA icon={faXmark} />
          </button>
        </div>
        <NotificationList onNavigate={onClose} />
      </div>
    </Modal>
  );
}
