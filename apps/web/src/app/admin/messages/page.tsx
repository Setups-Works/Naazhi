import { serverConfigured } from "../../../server/session";
import SetupNotice from "../../../components/admin/SetupNotice";
import MessageComposer from "../../../components/admin/MessageComposer";
import { pushConfigured } from "../../../server/services/notifications/notifications.service";

export default async function Page() {
  if (!serverConfigured()) return <SetupNotice />;
  return (
    <div className="dash">
      <div className="dash-head">
        <div>
          <div className="eyebrow">Messages</div>
          <h1 className="h2" style={{ marginTop: 8 }}>
            Message your users
          </h1>
        </div>
      </div>
      <MessageComposer push={pushConfigured()} />
    </div>
  );
}
