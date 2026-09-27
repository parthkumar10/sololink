import { useState } from "react";
import { api, formatApiErrorDetail } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Trash2, ArrowUp, ArrowDown, Loader2, GripVertical, LinkIcon } from "lucide-react";
import { toast } from "sonner";

const MAX = 20;

export default function LinkManager({ links, setLinks }) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [adding, setAdding] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [busy, setBusy] = useState(false);

  const atLimit = links.length >= MAX;

  const addLink = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Please enter a link title.");
      return;
    }
    setAdding(true);
    try {
      const { data } = await api.post("/links", { title, url });
      setLinks([...links, data.link]);
      setTitle("");
      setUrl("");
      toast.success("Link added");
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail));
    } finally {
      setAdding(false);
    }
  };

  const confirmDelete = async () => {
    const id = deleteId;
    setDeleteId(null);
    try {
      await api.delete(`/links/${id}`);
      setLinks(links.filter((l) => l.id !== id));
      toast.success("Link deleted");
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail));
    }
  };

  const move = async (index, dir) => {
    const target = index + dir;
    if (target < 0 || target >= links.length || busy) return;
    const next = [...links];
    [next[index], next[target]] = [next[target], next[index]];
    setLinks(next);
    setBusy(true);
    try {
      const { data } = await api.put("/links/reorder/all", {
        ordered_ids: next.map((l) => l.id),
      });
      setLinks(data.links);
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail));
      setLinks(links);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-6 rounded-2xl border-slate-200 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg font-bold">Links</h2>
          <p className="text-sm text-slate-500 mt-0.5">Add, reorder and manage your links.</p>
        </div>
        <span
          className="text-xs font-semibold font-mono text-slate-500 bg-slate-100 rounded-full px-3 py-1"
          data-testid="link-counter-badge"
        >
          {links.length} / {MAX}
        </span>
      </div>

      <Progress value={(links.length / MAX) * 100} className="mt-3 h-1.5" />

      <form onSubmit={addLink} className="mt-5 grid gap-2.5 sm:grid-cols-[1fr_1fr_auto] items-start">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title (e.g. Portfolio)"
          disabled={atLimit}
          data-testid="link-add-title-input"
          className="h-11"
        />
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="example.com"
          disabled={atLimit}
          data-testid="link-add-url-input"
          className="h-11"
        />
        <Button
          type="submit"
          disabled={adding || atLimit}
          data-testid="link-add-submit-button"
          className="h-11 rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] font-semibold"
        >
          {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4 mr-1" /> Add</>}
        </Button>
      </form>
      {atLimit && (
        <p className="text-xs text-amber-600 mt-2">You've reached the {MAX}-link limit. Delete one to add more.</p>
      )}

      <div className="mt-5 space-y-2.5">
        {links.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-slate-200 rounded-xl" data-testid="links-empty-state">
            <LinkIcon className="h-6 w-6 mx-auto text-slate-300" />
            <p className="mt-2 text-sm font-medium text-slate-500">No links yet</p>
            <p className="text-xs text-slate-400">Add your first link above to get started.</p>
          </div>
        ) : (
          links.map((l, i) => (
            <div
              key={l.id}
              data-testid={`link-item-card-${l.id}`}
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 hover:border-slate-300 transition-colors"
            >
              <GripVertical className="h-4 w-4 text-slate-300 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm truncate">{l.title}</p>
                <p className="text-xs text-slate-400 truncate font-mono">{l.url}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  disabled={i === 0 || busy}
                  onClick={() => move(i, -1)}
                  data-testid={`link-item-move-up-button-${l.id}`}
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  disabled={i === links.length - 1 || busy}
                  onClick={() => move(i, 1)}
                  data-testid={`link-item-move-down-button-${l.id}`}
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                  onClick={() => setDeleteId(l.id)}
                  data-testid={`link-item-delete-button-${l.id}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this link?</AlertDialogTitle>
            <AlertDialogDescription>
              This link will be removed from your public page immediately. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="link-delete-cancel-button">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              data-testid="link-delete-confirm-button"
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
