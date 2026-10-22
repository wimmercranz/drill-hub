"use client";

import { useRef, useState, useTransition } from "react";

type UploadResult = { error?: string; success?: string };

/** Resizes the chosen picture in the browser (square, 256×256 JPEG) and uploads it with the given action. */
export default function AvatarUpload({
  hasAvatar,
  upload,
  remove,
  labels = { add: "Upload picture", change: "Change picture" },
}: {
  hasAvatar: boolean;
  upload: (dataUrl: string) => Promise<UploadResult>;
  remove: () => Promise<void>;
  labels?: { add: string; change: string };
}) {
  const input = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function onFile(file: File) {
    setMessage(null);
    const img = new Image();
    img.src = URL.createObjectURL(file);
    try {
      await img.decode();
    } catch {
      setMessage("That file doesn't look like an image.");
      return;
    }
    const size = 256;
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    canvas.getContext("2d")!.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, size, size);
    URL.revokeObjectURL(img.src);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    startTransition(async () => {
      const res = await upload(dataUrl);
      setMessage(res.error ?? res.success ?? null);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input ref={input} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
      <button type="button" className="btn-secondary btn-sm" disabled={pending} onClick={() => input.current?.click()}>
        {pending ? "Uploading…" : hasAvatar ? labels.change : labels.add}
      </button>
      {hasAvatar && (
        <button type="button" className="btn-ghost btn-sm text-ink-500" disabled={pending} onClick={() => startTransition(() => remove())}>
          Remove
        </button>
      )}
      {message && <span className="text-xs text-ink-500">{message}</span>}
    </div>
  );
}
