import { serverConfigured } from "../../../server/session";
import { listAllTeam } from "../../../server/services/team/team.service";
import SetupNotice from "../../../components/admin/SetupNotice";
import TeamEditor from "../../../components/admin/TeamEditor";

export default async function Page() {
  if (!serverConfigured()) return <SetupNotice />;
  const { members, error } = await listAllTeam();
  return (
    <div className="dash">
      <div className="dash-head">
        <div>
          <div className="eyebrow">Team</div>
          <h1 className="h2" style={{ marginTop: 8 }}>
            The people behind Naazhi
          </h1>
        </div>
      </div>
      {error && (
        <p className="form-err" role="alert">
          Couldn’t load the team. Make sure the latest database migration has been applied.
        </p>
      )}
      <TeamEditor members={members} />
    </div>
  );
}
