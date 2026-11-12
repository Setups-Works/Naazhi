export default function SetupNotice() {
  return (
    <div className="panel">
      <h2 className="h3">The server isn’t connected</h2>
      <p className="body" style={{ marginTop: 8 }}>
        The admin panel reads users from the database, which can’t be reached right now. Please try again in a moment.
      </p>
    </div>
  );
}
