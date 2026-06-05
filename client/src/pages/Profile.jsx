import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import { api } from "../lib/api";
import { authStore } from "../stores/authStore";

export default function Profile() {
  const qc = useQueryClient();
  const setUser = authStore((s) => s.setUser);

  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: async () => (await api.get("/users/me")).data.user,
    onSuccess: (user) => setUser(user),
  });

  const [name, setName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const updateProfile = useMutation({
    mutationFn: async () => (await api.put("/users/me", { name, avatarUrl })).data.user,
    onSuccess: async (user) => {
      toast.success("Profile updated");
      setUser(user);
      await qc.invalidateQueries({ queryKey: ["me"] });
    },
  });

  const changePassword = useMutation({
    mutationFn: async () => (await api.put("/users/me/password", { currentPassword, newPassword })).data,
    onSuccess: () => {
      toast.success("Password changed");
      setCurrentPassword("");
      setNewPassword("");
    },
  });

  const user = meQuery.data;
  useEffect(() => {
    if (!user) return;
    setName(user.name || "");
    setAvatarUrl(user.avatarUrl || "");
  }, [user?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (meQuery.isLoading) return <div className="card p-5 text-sm text-slate-500 dark:text-slate-400">Loading…</div>;
  if (meQuery.error) return <div className="card p-5 text-sm text-red-500">Failed to load profile.</div>;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="card p-5">
        <div className="text-sm font-black">Profile</div>
        <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Update your account details.</div>

        <div className="mt-4 space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Email</label>
            <input className="input mt-1" value={user.email} disabled />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Name</label>
            <input className="input mt-1" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Avatar URL (optional)</label>
            <input
              className="input mt-1"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://…"
            />
          </div>

          <div className="flex justify-end">
            <button
              className="btn-primary"
              type="button"
              onClick={async () => {
                try {
                  await updateProfile.mutateAsync();
                } catch (err) {
                  toast.error(err?.response?.data?.message || "Update failed");
                }
              }}
              disabled={updateProfile.isPending}
            >
              {updateProfile.isPending ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      </div>

      <div className="card p-5">
        <div className="text-sm font-black">Security</div>
        <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Change your password.</div>

        <div className="mt-4 space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Current password</label>
            <input
              className="input mt-1"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              type="password"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">New password</label>
            <input
              className="input mt-1"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              type="password"
            />
          </div>

          <div className="flex justify-end">
            <button
              className="btn-primary"
              type="button"
              onClick={async () => {
                try {
                  await changePassword.mutateAsync();
                } catch (err) {
                  toast.error(err?.response?.data?.message || "Password change failed");
                }
              }}
              disabled={changePassword.isPending}
            >
              {changePassword.isPending ? "Updating…" : "Update password"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
