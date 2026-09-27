import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api, fileUrl } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ExternalLink, Link2, Loader2, UserX } from "lucide-react";

function initials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
}

function NotFound({ username }) {
  return (
    <div className="min-h-screen grain flex flex-col items-center justify-center px-6 text-center">
      <div className="animate-fade-up max-w-sm">
        <div className="h-16 w-16 rounded-2xl bg-[#0F172A] flex items-center justify-center mx-auto">
          <UserX className="h-7 w-7 text-white" />
        </div>
        <h1 className="mt-6 font-display text-3xl font-extrabold tracking-tight">
          <span className="font-mono text-[#6366F1]">@{username}</span> is available!
        </h1>
        <p className="mt-3 text-slate-500">
          This page hasn't been claimed on SoloLink yet. Grab it before someone else does.
        </p>
        <Link to="/signup">
          <Button
            size="lg"
            className="mt-6 rounded-full bg-[#6366F1] hover:bg-[#4F46E5] font-semibold"
            data-testid="not-found-claim-button"
          >
            Claim this username
          </Button>
        </Link>
        <div className="mt-8">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600">
            <Link2 className="h-3.5 w-3.5" /> SoloLink
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function PublicProfile() {
  const { username } = useParams();
  const [state, setState] = useState({ status: "loading", data: null });

  useEffect(() => {
    let active = true;
    setState({ status: "loading", data: null });
    (async () => {
      try {
        const { data } = await api.get(`/public/${username}`);
        if (active) setState({ status: "ok", data });
      } catch {
        if (active) setState({ status: "notfound", data: null });
      }
    })();
    return () => {
      active = false;
    };
  }, [username]);

  if (state.status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
      </div>
    );
  }

  if (state.status === "notfound") {
    return <NotFound username={username} />;
  }

  const { profile, links } = state.data;
  const avatar = fileUrl(profile.avatar_path);

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-slate-50 to-slate-50 flex flex-col items-center justify-between p-5 sm:p-8">
      <div className="w-full max-w-md mx-auto flex-1 flex flex-col items-center pt-10 sm:pt-16 animate-fade-up">
        {avatar ? (
          <img
            src={avatar}
            alt={profile.display_name}
            className="h-24 w-24 rounded-full object-cover ring-4 ring-white shadow-lg"
            data-testid="public-profile-avatar"
          />
        ) : (
          <div
            className="h-24 w-24 rounded-full bg-[#0F172A] text-white flex items-center justify-center font-display text-3xl font-bold ring-4 ring-white shadow-lg"
            data-testid="public-profile-avatar"
          >
            {initials(profile.display_name || profile.username)}
          </div>
        )}

        <h1
          className="mt-5 font-display text-2xl font-extrabold tracking-tight text-center"
          data-testid="public-profile-display-name"
        >
          {profile.display_name || profile.username}
        </h1>
        <p className="text-sm text-slate-400 font-mono">@{profile.username}</p>

        {profile.bio && (
          <p className="mt-3 text-center text-slate-600 max-w-xs leading-relaxed" data-testid="public-profile-bio">
            {profile.bio}
          </p>
        )}

        <div className="mt-8 w-full space-y-3">
          {links.length === 0 ? (
            <p className="text-center text-sm text-slate-400 py-6" data-testid="public-profile-no-links">
              No links to show yet.
            </p>
          ) : (
            links.map((l, i) => (
              <a
                key={l.id}
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                data-testid={`public-profile-link-card-${l.id}`}
                className="group flex items-center justify-between w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 font-semibold shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:border-[#6366F1] transition-all animate-fade-up"
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <span className="truncate">{l.title}</span>
                <ExternalLink className="h-4 w-4 text-slate-300 group-hover:text-[#6366F1] shrink-0 transition-colors" />
              </a>
            ))
          )}
        </div>
      </div>

      <footer className="mt-12 pt-6">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors"
        >
          Made with{" "}
          <span className="inline-flex items-center gap-1 font-semibold text-slate-500">
            <Link2 className="h-3 w-3" /> SoloLink
          </span>
          • Create your free page
        </Link>
      </footer>
    </div>
  );
}
