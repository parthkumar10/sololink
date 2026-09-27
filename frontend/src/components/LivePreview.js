import { fileUrl } from "@/lib/api";
import { ExternalLink } from "lucide-react";

function initials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
}

export default function LivePreview({ profile, links }) {
  const avatar = fileUrl(profile.avatar_path);
  return (
    <div className="mx-auto w-[280px] rounded-[2.5rem] border-8 border-[#0F172A] bg-white shadow-2xl shadow-slate-300/50 overflow-hidden">
      <div className="h-[520px] overflow-y-auto bg-gradient-to-b from-indigo-50 via-white to-white px-5 py-8 flex flex-col items-center">
        {avatar ? (
          <img
            src={avatar}
            alt=""
            className="h-20 w-20 rounded-full object-cover ring-4 ring-white shadow"
          />
        ) : (
          <div className="h-20 w-20 rounded-full bg-[#0F172A] text-white flex items-center justify-center font-display text-2xl font-bold">
            {initials(profile.display_name || profile.username)}
          </div>
        )}
        <p className="mt-4 font-display font-bold text-lg text-center leading-tight">
          {profile.display_name || profile.username}
        </p>
        <p className="text-xs text-slate-400 font-mono">@{profile.username}</p>
        {profile.bio && <p className="mt-2 text-center text-sm text-slate-500">{profile.bio}</p>}

        <div className="mt-6 w-full space-y-3">
          {links.length === 0 ? (
            <p className="text-center text-xs text-slate-300 py-8">Your links show up here</p>
          ) : (
            links.map((l) => (
              <div
                key={l.id}
                className="group w-full rounded-xl border border-slate-200 bg-white py-3 px-4 flex items-center justify-between text-sm font-semibold shadow-sm"
              >
                <span className="truncate">{l.title}</span>
                <ExternalLink className="h-3.5 w-3.5 text-slate-300 shrink-0" />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
