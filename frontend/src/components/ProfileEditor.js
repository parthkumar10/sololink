import { useState, useRef } from "react";
import { api, fileUrl, formatApiErrorDetail } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Camera, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

function initials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
}

export default function ProfileEditor() {
  const { user, setUser } = useAuth();
  const [displayName, setDisplayName] = useState(user.display_name || "");
  const [bio, setBio] = useState(user.bio || "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef(null);

  const avatar = fileUrl(user.avatar_path);

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await api.put("/profile", { display_name: displayName, bio });
      setUser(data.user);
      toast.success("Profile saved");
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail));
    } finally {
      setSaving(false);
    }
  };

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const { data } = await api.post("/profile/avatar", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setUser({ ...user, avatar_path: data.avatar_path });
      toast.success("Photo updated");
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail));
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  return (
    <Card className="p-6 rounded-2xl border-slate-200 shadow-sm">
      <h2 className="font-display text-lg font-bold">Profile</h2>
      <p className="text-sm text-slate-500 mt-0.5">This is how visitors see you.</p>

      <div className="mt-6 flex items-center gap-5">
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          className="relative group shrink-0"
          data-testid="profile-avatar-upload-button"
        >
          {avatar ? (
            <img src={avatar} alt="" className="h-20 w-20 rounded-full object-cover ring-2 ring-slate-100" />
          ) : (
            <div className="h-20 w-20 rounded-full bg-[#0F172A] text-white flex items-center justify-center font-display text-2xl font-bold">
              {initials(displayName || user.username)}
            </div>
          )}
          <span className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            {uploading ? <Loader2 className="h-5 w-5 text-white animate-spin" /> : <Camera className="h-5 w-5 text-white" />}
          </span>
        </button>
        <div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInput.current?.click()}
            disabled={uploading}
            className="rounded-full"
            data-testid="profile-avatar-upload-trigger"
          >
            <Upload className="h-3.5 w-3.5 mr-1.5" /> Upload photo
          </Button>
          <p className="text-xs text-slate-400 mt-1.5">JPG, PNG or WEBP. Max 5MB.</p>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onFile}
            data-testid="profile-avatar-upload-input"
          />
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="displayName">Display name</Label>
          <Input
            id="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name"
            data-testid="profile-display-name-input"
            className="h-11"
          />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="bio">Bio</Label>
            <span className="text-xs text-slate-400">{bio.length}/160</span>
          </div>
          <Textarea
            id="bio"
            value={bio}
            maxLength={160}
            onChange={(e) => setBio(e.target.value)}
            placeholder="A short line about you"
            data-testid="profile-bio-textarea"
            className="resize-none"
            rows={3}
          />
        </div>
        <Button
          onClick={save}
          disabled={saving}
          data-testid="profile-save-button"
          className="rounded-xl bg-[#0F172A] hover:bg-[#1e293b] font-semibold"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save profile"}
        </Button>
      </div>
    </Card>
  );
}
