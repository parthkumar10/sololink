import { useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Copy, Check, Link2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export default function QRCodeModal({ open, onOpenChange, url, username }) {
  const wrapRef = useRef(null);
  const [copied, setCopied] = useState(false);

  const download = () => {
    const canvas = wrapRef.current?.querySelector("canvas");
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `sololink-${username}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    toast.success("QR code downloaded");
  };

  const copy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Link copied");
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm" data-testid="qr-modal">
        <DialogHeader>
          <DialogTitle className="font-display">Share your page</DialogTitle>
          <DialogDescription>Scan or download this QR code for print, slides and anywhere offline.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center pt-2">
          <div
            ref={wrapRef}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            data-testid="qr-code-canvas-wrap"
          >
            <QRCodeCanvas
              value={url}
              size={200}
              level="M"
              marginSize={2}
              fgColor="#0F172A"
              bgColor="#ffffff"
              imageSettings={undefined}
            />
          </div>
          <p className="mt-4 font-mono text-sm text-slate-500 flex items-center gap-1.5">
            <Link2 className="h-3.5 w-3.5" /> /{username}
          </p>

          <div className="mt-5 grid grid-cols-2 gap-2 w-full">
            <Button
              variant="outline"
              onClick={copy}
              className="rounded-xl"
              data-testid="qr-copy-link-button"
            >
              {copied ? <Check className="h-4 w-4 mr-1.5 text-[#10B981]" /> : <Copy className="h-4 w-4 mr-1.5" />}
              Copy link
            </Button>
            <Button
              onClick={download}
              className="rounded-xl bg-[#0F172A] hover:bg-[#1e293b]"
              data-testid="qr-download-button"
            >
              <Download className="h-4 w-4 mr-1.5" /> Download
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
