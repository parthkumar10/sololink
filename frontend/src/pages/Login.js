import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { api, formatApiErrorDetail } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function Login() {
  const { user, authenticate } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) navigate("/dashboard");
  }, [user, navigate]);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const { data } = await api.post("/auth/login", { email, password });
      authenticate(data.token, data.user);
      toast.success("Welcome back!");
      navigate("/dashboard");
    } catch (err) {
      setError(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen grain flex flex-col">
      <header className="p-5 sm:p-6">
        <Link to="/" className="inline-flex items-center gap-2" data-testid="nav-brand-logo">
          <div className="h-8 w-8 rounded-lg bg-[#0F172A] flex items-center justify-center">
            <Link2 className="h-4 w-4 text-white" strokeWidth={2.5} />
          </div>
          <span className="font-display font-extrabold text-xl tracking-tight">SoloLink</span>
        </Link>
      </header>

      <div className="flex-1 flex items-center justify-center px-5 pb-16">
        <div className="w-full max-w-sm animate-fade-up">
          <h1 className="font-display text-3xl font-extrabold tracking-tight">Welcome back</h1>
          <p className="mt-2 text-slate-500">Log in to manage your SoloLink page.</p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                data-testid="auth-login-email-input"
                className="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                data-testid="auth-login-password-input"
                className="h-11"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600" data-testid="auth-login-error">
                {error}
              </p>
            )}

            <Button
              type="submit"
              disabled={submitting}
              data-testid="auth-login-submit-button"
              className="w-full h-11 rounded-xl bg-[#0F172A] hover:bg-[#1e293b] font-semibold"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Log in"}
            </Button>
          </form>

          <p className="mt-6 text-sm text-slate-500 text-center">
            New here?{" "}
            <Link to="/signup" className="font-semibold text-[#6366F1] hover:underline" data-testid="go-to-signup-link">
              Create your page
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
