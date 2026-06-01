"use client";

import { useRef, useState, useTransition } from "react";
import { updateNotificationPrefsAction } from "@/app/dashboard/profile-actions";

export function NotificationSettings({ enabled }: { enabled: boolean }) {
  const [checked, setChecked] = useState(enabled);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleToggle(next: boolean) {
    setChecked(next);
    const formData = new FormData();
    if (next) formData.set("email_notifications", "on");
    startTransition(() => updateNotificationPrefsAction(formData));
  }

  return (
    <form ref={formRef}>
      <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-[var(--line)] bg-white p-3">
        <span>
          <span className="block text-sm font-medium text-[var(--ink)]">Mailnotiser</span>
          <span className="block text-xs text-[var(--muted)]">
            Få mail när du blir godkänd i en grupp eller får ett nytt meddelande.
          </span>
        </span>
        <span className="relative inline-flex shrink-0 items-center">
          <input
            type="checkbox"
            className="peer sr-only"
            checked={checked}
            disabled={isPending}
            onChange={(e) => handleToggle(e.target.checked)}
          />
          <span className="h-6 w-11 rounded-full bg-[var(--line)] transition-colors peer-checked:bg-[var(--accent)]" />
          <span className="absolute left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
        </span>
      </label>
    </form>
  );
}
