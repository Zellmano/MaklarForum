"use client";

import { useState, useRef } from "react";
import { uploadAvatarAction } from "@/app/dashboard/profile-actions";

export default function AvatarUpload({ currentUrl }: { currentUrl?: string | null }) {
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setMessage("Max 2 MB.");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setMessage("Bara bildfiler tillåtna.");
      return;
    }

    setPreview(URL.createObjectURL(file));
    setUploading(true);
    setMessage("");

    const formData = new FormData();
    formData.append("avatar", file);

    const result = await uploadAvatarAction(formData);

    setUploading(false);
    if (result.error) {
      setMessage(result.error);
    } else {
      setMessage("Profilbild uppdaterad!");
      if (result.url) setPreview(result.url);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border-2 border-[var(--line)] bg-gray-100 hover:border-[var(--accent)]"
      >
        {preview ? (
          <img src={preview} alt="Profilbild" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-2xl text-[var(--muted)]">+</span>
        )}
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70">
            <span className="text-xs">...</span>
          </div>
        )}
      </button>
      <div>
        <p className="text-sm font-medium">Profilbild</p>
        <p className="text-xs text-[var(--muted)]">Klicka för att ladda upp (max 2 MB)</p>
        {message && <p className={`mt-1 text-xs ${message.includes("uppdaterad") ? "text-emerald-600" : "text-red-600"}`}>{message}</p>}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        className="hidden"
      />
    </div>
  );
}
