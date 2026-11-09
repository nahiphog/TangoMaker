import { useState, type RefObject } from "react";
import { toPng } from "html-to-image";
import { Button } from "@/components/ui/button";

interface Props {
  targetRef: RefObject<HTMLElement | null>;
  filename: string;
  label?: string;
}

export function CopyImageButton({ targetRef, filename, label = "Copy as image" }: Props) {
  const [status, setStatus] = useState<"idle" | "copying" | "copied" | "downloaded" | "error">("idle");

  const handle = async () => {
    if (!targetRef.current) return;
    setStatus("copying");
    try {
      // Resolve current background color so the PNG isn't transparent.
      const bg = getComputedStyle(document.body).backgroundColor || "#ffffff";
      const dataUrl = await toPng(targetRef.current, {
        pixelRatio: 2,
        backgroundColor: bg,
        cacheBust: true,
      });

      // Try Clipboard API first (PNG). Fall back to download.
      const blob = await (await fetch(dataUrl)).blob();
      if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
        try {
          await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
          setStatus("copied");
          setTimeout(() => setStatus("idle"), 1500);
          return;
        } catch {
          // fall through to download
        }
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      setStatus("downloaded");
      setTimeout(() => setStatus("idle"), 1500);
    } catch (e) {
      console.error(e);
      setStatus("error");
      setTimeout(() => setStatus("idle"), 1500);
    }
  };

  const text =
    status === "copying"
      ? "Copying…"
      : status === "copied"
        ? "Copied!"
        : status === "downloaded"
          ? "Downloaded"
          : status === "error"
            ? "Failed"
            : label;

  return (
    <Button variant="outline" size="sm" onClick={handle} disabled={status === "copying"}>
      {text}
    </Button>
  );
}
