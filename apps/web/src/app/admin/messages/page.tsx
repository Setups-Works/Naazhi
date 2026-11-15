import { listAllUsers, serverConfigured } from "../../../server/session";
import SetupNotice from "../../../components/admin/SetupNotice";
import MessageComposer from "../../../components/admin/MessageComposer";
import { pushConfigured } from "../../../server/services/notifications/notifications.service";

export default async function Page() {
  if (!serverConfigured()) return <SetupNotice />;
  const people = (await listAllUsers())
    .filter((u) => !u.banned)
    .map((u) => ({ id: u.id, email: u.email, name: u.name || "" }))
    .sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email));
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
      <MessageComposer push={pushConfigured()} people={people} />
    </div>
  );
}
