import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import { authStore } from "../stores/authStore";

export default function Register() {
  const navigate = useNavigate();
  const register = authStore((s) => s.register);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  return (
    <div className="min-h-screen grid place-items-center px-4">
      <div className="w-full max-w-md card p-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-indigo-600 text-white grid place-items-center font-black">T</div>
          <div>
            <div className="text-lg font-black">Create account</div>
            <div className="text-sm text-slate-500 dark:text-slate-400">Start managing tasks like a pro</div>
          </div>
        </div>

        <form
          className="mt-6 space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setLoading(true);
            try {
              await register({ name, email, password });
              toast.success("Account created");
              navigate("/app/dashboard");
            } catch (err) {
              toast.error(err?.response?.data?.message || "Registration failed");
            } finally {
              setLoading(false);
            }
          }}
        >
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Name</label>
            <input className="input mt-1" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Email</label>
            <input className="input mt-1" value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Password</label>
            <input
              className="input mt-1"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
            />
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Minimum 8 characters.</div>
          </div>

          <button className="btn-primary w-full" type="submit" disabled={loading}>
            {loading ? "Creating…" : "Create account"}
          </button>

          <div className="text-sm text-slate-500 dark:text-slate-400">
            Already have an account?{" "}
            <Link className="font-semibold text-indigo-600 hover:underline" to="/login">
              Sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

