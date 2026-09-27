import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import ProfileEditor from "@/components/ProfileEditor";
import LinkManager from "@/components/LinkManager";
import LivePreview from "@/components/LivePreview";
import { Button } from "@/components/ui/button";
import { Link2, Copy, ExternalLink, LogOut, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const publicUrl = `${window.location.origin}/${user.username}`;

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/links");
        setLinks(data.links);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const copy = async () => {
    await navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    toast.success("Link copied to clipboard");
    setTimeout(() => setCopied(false), 1800);
  };

  const doLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-[#FAFAF9]">
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 py-3">
          <Link to="/dashboard" className="flex items-center gap-2" data-testid="nav-brand-logo">
            <div className="h-8 w-8 rounded-lg bg-[#0F172A] flex items-center justify-center">
              <Link2 className="h-4 w-4 text-white" strokeWidth={2.5} />
            </div>
            <span className="font-display font-extrabold text-lg tracking-tight hidden sm:inline">SoloLink</span>
          </Link>

          <div className="flex items-center gap-2">
            <div
              className="hidden sm:flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 pl-3 pr-1 py-1"
              data-testid="dashboard-share-url-pill"
            >
              <span className="text-xs font-mono text-slate-500 max-w-[180px] truncate">/{user.username}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={copy}
                data-testid="dashboard-copy-url-button"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-[#10B981]" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
            </div>
            <a href={`/${user.username}`} target="_blank" rel="noreferrer">
              <Button variant="outline" size="sm" className="rounded-full" data-testid="dashboard-view-public-button">
                <ExternalLink className="h-3.5 w-3.5 sm:mr-1.5" />
                <span className="hidden sm:inline">View page</span>
              </Button>
            </a>
            <Button
              variant="ghost"
              size="sm"
              onClick={doLogout}
              className="rounded-full text-slate-500"
              data-testid="nav-logout-button"
            >
              <LogOut className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Log out</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 p-4 sm:p-6 lg:p-8">
        <div className="lg:col-span-7 space-y-6">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight">
              Hey {user.display_name || user.username} 👋
            </h1>
            <p className="text-slate-500 mt-1">
              Your page is live at{" "}
              <a href={`/${user.username}`} target="_blank" rel="noreferrer" className="font-mono text-[#6366F1] hover:underline">
                /{user.username}
              </a>
            </p>
          </div>
          <ProfileEditor />
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            </div>
          ) : (
            <LinkManager links={links} setLinks={setLinks} />
          )}
        </div>

        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-24">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 text-center lg:text-left">
              Live preview
            </p>
            <LivePreview
              profile={{
                username: user.username,
                display_name: user.display_name,
                bio: user.bio,
                avatar_path: user.avatar_path,
              }}
              links={links}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
