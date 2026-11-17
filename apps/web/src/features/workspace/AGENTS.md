# features/workspace

**Does (planned):** create/rename/delete workspaces, switch the active workspace, invite and manage members and roles. **Track A. Phase 1.** _(Not in the original folder list — added because "Workspace" is an application service in the architecture.)_

**Backed by:** `workspaces`, `workspace_members(role)`, `workspace_invites`; SQL helpers `is_workspace_member()` / `workspace_role()`. Service: `apps/web/src/server/services/workspace`.

**Rules**

- The active workspace is a cookie resolved once per request on the server; UI reads it from context, never from query params.
- Roles: owner · admin · member · viewer — permission matrix in `docs/SECURITY.md`. Only owners/admins manage members.
- Every domain query must be workspace-scoped; journal entries stay author-private.

