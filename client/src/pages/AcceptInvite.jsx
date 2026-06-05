import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";

import { api } from "../lib/api";
import { authStore } from "../stores/authStore";

export default function AcceptInvite() {
  const { token } = useParams();
  const navigate = useNavigate();
  const user = authStore((s) => s.user);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        await api.post("/teams/invites/accept", { token });
        if (!cancelled) {
          toast.success("Joined team");
          navigate("/app/teams");
        }
      } catch (err) {
        toast.error(err?.response?.data?.message || "Invite failed");
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, user, navigate]);

  return (
    <div className="min-h-screen grid place-items-center px-4">
      <div className="w-full max-w-lg card p-6">
        <div className="text-lg font-black">Team invitation</div>
        <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {user ? "Accepting invitation…" : "Sign in to accept this invitation."}
        </div>

        {!user ? (
          <div className="mt-6 flex gap-3">
            <Link className="btn-primary" to="/login">
              Sign in
            </Link>
            <Link className="btn-secondary" to="/register">
              Create account
            </Link>
          </div>
        ) : (
          <div className="mt-6">
            <div className="text-sm text-slate-500 dark:text-slate-400">{loading ? "Working…" : "Done"}</div>
          </div>
        )}
      </div>
    </div>
  );
}

