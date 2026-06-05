import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import clsx from "clsx";
import { Plus, Mail, Copy } from "lucide-react";

import { api } from "../lib/api";
import Modal from "../components/Modal";

export default function Teams() {
  const qc = useQueryClient();

  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [teamDescription, setTeamDescription] = useState("");

  const teamsQuery = useQuery({
    queryKey: ["teams"],
    queryFn: async () => (await api.get("/teams")).data.teams,
  });

  const teamDetailQuery = useQuery({
    queryKey: ["team", selectedTeamId],
    enabled: Boolean(selectedTeamId),
    queryFn: async () => (await api.get(`/teams/${selectedTeamId}`)).data,
  });

  const createTeam = useMutation({
    mutationFn: async () => (await api.post("/teams", { name: teamName, description: teamDescription })).data.team,
    onSuccess: async (team) => {
      toast.success("Team created");
      setCreateOpen(false);
      setTeamName("");
      setTeamDescription("");
      await qc.invalidateQueries({ queryKey: ["teams"] });
      setSelectedTeamId(team._id);
    },
  });

  const inviteMutation = useMutation({
    mutationFn: async ({ teamId, email }) => (await api.post(`/teams/${teamId}/invites`, { email })).data.invite,
    onSuccess: async () => {
      toast.success("Invite created");
      await qc.invalidateQueries({ queryKey: ["team", selectedTeamId] });
    },
  });

  const removeMember = useMutation({
    mutationFn: async ({ teamId, memberId }) => (await api.delete(`/teams/${teamId}/members/${memberId}`)).data,
    onSuccess: async () => {
      toast.success("Member removed");
      await qc.invalidateQueries({ queryKey: ["team", selectedTeamId] });
    },
  });

  const changeRole = useMutation({
    mutationFn: async ({ teamId, memberId, role }) => (await api.patch(`/teams/${teamId}/members/${memberId}`, { role })).data,
    onSuccess: async () => {
      toast.success("Role updated");
      await qc.invalidateQueries({ queryKey: ["team", selectedTeamId] });
    },
  });

  const teams = teamsQuery.data || [];
  const selected = useMemo(() => teams.find((t) => t._id === selectedTeamId) || null, [teams, selectedTeamId]);

  const [inviteEmail, setInviteEmail] = useState("");
  const [lastInviteToken, setLastInviteToken] = useState("");

  const myRole = teamDetailQuery.data?.myRole;

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="card p-4 lg:col-span-1">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-black">Teams</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Manage collaboration</div>
          </div>
          <button className="btn-primary" onClick={() => setCreateOpen(true)} type="button">
            <Plus size={16} /> New
          </button>
        </div>

        <div className="mt-4 space-y-2">
          {teams.map((t) => (
            <button
              key={t._id}
              className={clsx(
                "w-full text-left rounded-xl border px-3 py-3 transition",
                selectedTeamId === t._id
                  ? "border-indigo-500 bg-indigo-500/10"
                  : "border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900"
              )}
              onClick={() => setSelectedTeamId(t._id)}
              type="button"
            >
              <div className="text-sm font-black truncate">{t.name}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {t.description || "No description"}
              </div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Role: {t.myRole}</div>
            </button>
          ))}

          {!teams.length ? (
            <div className="text-sm text-slate-500 dark:text-slate-400">No teams yet. Create your first team.</div>
          ) : null}
        </div>
      </div>

      <div className="lg:col-span-2 space-y-4">
        {!selectedTeamId ? (
          <div className="card p-5 text-sm text-slate-500 dark:text-slate-400">Select a team to view details.</div>
        ) : teamDetailQuery.isLoading ? (
          <div className="card p-5 text-sm text-slate-500 dark:text-slate-400">Loading team…</div>
        ) : teamDetailQuery.error ? (
          <div className="card p-5 text-sm text-red-500">Failed to load team.</div>
        ) : (
          <>
            <div className="card p-5">
              <div className="text-lg font-black">{selected?.name}</div>
              <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">{selected?.description || ""}</div>
              <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">Your role: {myRole}</div>
            </div>

            <div className="card p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-black">Members</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Manage access and roles</div>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {(teamDetailQuery.data?.members || []).map((m) => (
                  <div
                    key={m.id}
                    className="flex flex-col gap-2 rounded-xl border border-slate-200/80 p-3 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold">{m.user.name}</div>
                      <div className="truncate text-xs text-slate-500 dark:text-slate-400">{m.user.email}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        className="select w-40"
                        value={m.role}
                        disabled={myRole !== "owner"}
                        onChange={(e) => changeRole.mutate({ teamId: selectedTeamId, memberId: m.id, role: e.target.value })}
                      >
                        <option value="owner">Owner</option>
                        <option value="admin">Admin</option>
                        <option value="member">Member</option>
                      </select>
                      <button
                        className="btn-secondary"
                        disabled={myRole === "member"}
                        onClick={() => {
                          if (confirm("Remove this member?")) removeMember.mutate({ teamId: selectedTeamId, memberId: m.id });
                        }}
                        type="button"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-5">
              <div className="text-sm font-black">Invite member</div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Creates a shareable invite link.</div>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <div className="flex-1">
                  <input
                    className="input"
                    placeholder="member@email.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    type="email"
                    disabled={myRole === "member"}
                  />
                </div>
                <button
                  className="btn-primary"
                  disabled={myRole === "member"}
                  onClick={async () => {
                    try {
                      const inv = await inviteMutation.mutateAsync({ teamId: selectedTeamId, email: inviteEmail });
                      setLastInviteToken(inv.token);
                      setInviteEmail("");
                    } catch (err) {
                      toast.error(err?.response?.data?.message || "Invite failed");
                    }
                  }}
                  type="button"
                >
                  <Mail size={16} /> Invite
                </button>
              </div>

              {lastInviteToken ? (
                <div className="mt-4 rounded-xl border border-slate-200/80 bg-slate-50 p-3 text-sm dark:border-slate-800 dark:bg-slate-950">
                  <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Invite link</div>
                  <div className="mt-1 flex items-center gap-2">
                    <code className="flex-1 overflow-auto rounded-lg bg-black/5 px-2 py-1 text-xs dark:bg-white/5">
                      {`${window.location.origin}/invite/${lastInviteToken}`}
                    </code>
                    <button
                      className="btn-secondary"
                      type="button"
                      onClick={async () => {
                        await navigator.clipboard.writeText(`${window.location.origin}/invite/${lastInviteToken}`);
                        toast.success("Copied");
                      }}
                    >
                      <Copy size={16} />
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </>
        )}
      </div>

      <Modal open={createOpen} title="Create team" onClose={() => setCreateOpen(false)}>
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!teamName.trim()) return toast.error("Team name is required");
            try {
              await createTeam.mutateAsync();
            } catch (err) {
              toast.error(err?.response?.data?.message || "Create team failed");
            }
          }}
        >
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Name</label>
            <input className="input mt-1" value={teamName} onChange={(e) => setTeamName(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Description</label>
            <textarea
              className="input mt-1 min-h-24"
              value={teamDescription}
              onChange={(e) => setTeamDescription(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button className="btn-secondary" type="button" onClick={() => setCreateOpen(false)}>
              Cancel
            </button>
            <button className="btn-primary" type="submit" disabled={createTeam.isPending}>
              {createTeam.isPending ? "Creating…" : "Create"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

