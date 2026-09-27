import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { api, formatApiErrorDetail } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link2, Loader2, Check, X } from "lucide-react";
import { toast } from "sonner";

export default function Signup() {
  const { user, authenticate } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [status, setStatus] = useState(null); // null | "checking" | "available" | "taken" | "invalid"
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const debounce = useRef(null);

  useEffect(() => {
    if (user) navigate("/dashboard");
  }, [user, navigate]);

  const onUsernameChange = (raw) => {
    const val = raw.toLowerCase().replace(/[^a-z0-9_]/g, "");
    setUsername(val);
    setStatus(null);
    if (debounce.current) clearTimeout(debounce.current);
    if (val.length < 3) {
      if (val.length > 0) setStatus("invalid");
      return;
    }
    setStatus("checking");
    debounce.current = setTimeout(async () => {
      try {
        const { data } = await api.get("/auth/check-username", { params: { username: val } });
        if (!data.valid) setStatus("invalid");
        else setStatus(data.available ? "available" : "taken");
      } catch {
        setStatus(null);
      }
    }, 400);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (status === "taken" || status === "invalid") {
      setError("Please pick a valid, available username.");
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await api.post("/auth/register", {
        email,
        password,
        username,
        display_name: displayName,
      });
      authenticate(data.token, data.user);
      toast.success("Your page is live! 🎉");
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
          <h1 className="font-display text-3xl font-extrabold tracking-tight">Claim your link</h1>
          <p className="mt-2 text-slate-500">Create your free page in seconds.</p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="username">Username</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-mono pointer-events-none">
                  sololink/
                </span>
                <Input
                  id="username"
                  required
                  value={username}
                  onChange={(e) => onUsernameChange(e.target.value)}
                  placeholder="yourname"
                  data-testid="auth-signup-username-input"
                  className="h-11 pl-[72px] font-mono"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2">
                  {status === "checking" && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
                  {status === "available" && <Check className="h-4 w-4 text-[#10B981]" />}
                  {(status === "taken" || status === "invalid") && <X className="h-4 w-4 text-red-500" />}
                </span>
              </div>
              {status === "taken" && <p className="text-xs text-red-500">That username is taken.</p>}
              {status === "invalid" && <p className="text-xs text-red-500">3-30 chars: letters, numbers, underscores.</p>}
              {status === "available" && <p className="text-xs text-[#10B981]">Nice — it's available!</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="displayName">Display name</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                data-testid="auth-signup-displayname-input"
                className="h-11"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                data-testid="auth-signup-email-input"
                className="h-11"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                data-testid="auth-signup-password-input"
                className="h-11"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600" data-testid="auth-signup-error">
                {error}
              </p>
            )}

            <Button
              type="submit"
              disabled={submitting}
              data-testid="auth-signup-submit-button"
              className="w-full h-11 rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] font-semibold"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create my page"}
            </Button>
          </form>

          <p className="mt-6 text-sm text-slate-500 text-center">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold text-[#6366F1] hover:underline" data-testid="go-to-login-link">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
