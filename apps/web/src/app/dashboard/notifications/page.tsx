import ClientOnly from "../../../components/app/ClientOnly";
import NotificationList from "../../../features/notifications/NotificationList";

export const metadata = { title: "Notifications — Naazhi" };

/** The inbox as a page. Messages from the admin panel point here (the path /notifications), the bell opens the same list in a panel. */
export default function Page() {
  return (
    <ClientOnly>
      <div className="mx-auto w-full max-w-[760px] pb-16">
        <h1 className="m-0 mt-6 text-[30px] font-semibold tracking-[-0.022em]">Notifications</h1>
        <p className="m-0 mt-2 text-[15px] text-ink-3">Messages from the team, shared-journal invitations and new articles.</p>
        <div className="mt-6">
          <NotificationList />
        </div>
      </div>
    </ClientOnly>
  );
}
