import { Link, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { ArrowRight, Link2, Sparkles, Zap } from "lucide-react";

const Logo = () => (
  <div className="flex items-center gap-2" data-testid="nav-brand-logo">
    <div className="h-8 w-8 rounded-lg bg-[#0F172A] flex items-center justify-center">
      <Link2 className="h-4 w-4 text-white" strokeWidth={2.5} />
    </div>
    <span className="font-display font-extrabold text-xl tracking-tight">SoloLink</span>
  </div>
);

export default function Landing() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate("/dashboard");
  }, [user, navigate]);

  return (
    <div className="min-h-screen grain">
      <header className="max-w-6xl mx-auto flex items-center justify-between p-5 sm:p-6">
        <Logo />
        <div className="flex items-center gap-2">
          <Link to="/login">
            <Button variant="ghost" data-testid="nav-login-link" className="font-medium">
              Log in
            </Button>
          </Link>
          <Link to="/signup">
            <Button data-testid="nav-signup-link" className="rounded-full bg-[#0F172A] hover:bg-[#1e293b] font-medium">
              Get started
            </Button>
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-5 sm:px-6 pt-10 sm:pt-20 grid lg:grid-cols-2 gap-12 items-center">
        <div className="animate-fade-up">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 mb-6">
            <Sparkles className="h-3.5 w-3.5 text-[#6366F1]" /> One link for everything you do
          </div>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.05]">
            Your whole world,<br />
            <span className="text-[#6366F1]">one simple link.</span>
          </h1>
          <p className="mt-6 text-base sm:text-lg text-slate-600 leading-relaxed max-w-md">
            SoloLink gives creators, students and freelancers a clean, fast public page for all the
            links that matter. Claim your username and share it anywhere.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Link to="/signup">
              <Button size="lg" data-testid="hero-cta-signup" className="rounded-full bg-[#6366F1] hover:bg-[#4F46E5] font-semibold px-6 group">
                Claim your link
                <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm">
              <span className="text-slate-400 font-mono">sololink.app/</span>
              <span className="font-mono font-semibold text-slate-800">yourname</span>
            </div>
          </div>
          <div className="mt-10 flex items-center gap-6 text-sm text-slate-500">
            <span className="flex items-center gap-1.5"><Zap className="h-4 w-4 text-[#10B981]" /> Free forever</span>
            <span className="flex items-center gap-1.5"><Zap className="h-4 w-4 text-[#10B981]" /> No code needed</span>
          </div>
        </div>

        <div className="animate-fade-up hidden lg:flex justify-center" style={{ animationDelay: "0.15s" }}>
          <div className="relative w-[300px] rounded-[2.5rem] border-8 border-[#0F172A] bg-white shadow-2xl shadow-slate-300/60 overflow-hidden">
            <div className="bg-gradient-to-b from-indigo-50 to-white px-6 py-10 flex flex-col items-center">
              <div className="h-20 w-20 rounded-full bg-[#0F172A] text-white flex items-center justify-center font-display text-2xl font-bold">A</div>
              <p className="mt-4 font-display font-bold text-lg">Alex Rivera</p>
              <p className="text-xs text-slate-400 font-mono">@alex</p>
              <p className="mt-2 text-center text-sm text-slate-500 px-2">Designer & maker. Building small things on the internet.</p>
              <div className="mt-6 w-full space-y-3">
                {["Portfolio", "Latest project", "Newsletter", "Say hi 👋"].map((t) => (
                  <div key={t} className="w-full rounded-xl border border-slate-200 bg-white py-3 text-center text-sm font-semibold shadow-sm">
                    {t}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
