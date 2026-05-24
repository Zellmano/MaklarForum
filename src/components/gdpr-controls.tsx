"use client";

import { useActionState, useState, useTransition } from "react";
import { deleteMyAccountAction, exportMyDataAction } from "@/app/dashboard/gdpr-actions";

export function GdprControls() {
  const [showConfirm, setShowConfirm] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [isExporting, startExport] = useTransition();
  const [deleteState, deleteAction, isDeleting] = useActionState(deleteMyAccountAction, undefined);

  function handleExport() {
    setExportError(null);
    startExport(async () => {
      const res = await exportMyDataAction();
      if (res.error || !res.data) {
        setExportError(res.error ?? "Kunde inte exportera.");
        return;
      }
      const blob = new Blob([res.data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `maklarforum-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    });
  }

  return (
    <div className="space-y-6">
      <section>
        <h3 className="font-semibold">Exportera mina data</h3>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Ladda ner en JSON-fil med all data du har på MäklarForum — profil, frågor, svar, meddelanden, grupper.
        </p>
        <button
          type="button"
          onClick={handleExport}
          disabled={isExporting}
          className="pill pill-light mt-3"
        >
          {isExporting ? "Förbereder..." : "Ladda ner mina data"}
        </button>
        {exportError ? <p className="mt-2 text-sm text-red-700">{exportError}</p> : null}
      </section>

      <section>
        <h3 className="font-semibold text-red-800">Radera mitt konto</h3>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Tar bort din profil, alla dina inlägg, svar, meddelanden och röster — permanent och utan
          möjlighet att återställa. Detta motsvarar din rätt enligt GDPR Art. 17.
        </p>

        {!showConfirm ? (
          <button
            type="button"
            onClick={() => setShowConfirm(true)}
            className="pill mt-3 border border-red-300 bg-red-50 text-red-800 hover:bg-red-100"
          >
            Radera mitt konto
          </button>
        ) : (
          <form action={deleteAction} className="mt-3 rounded-xl border border-red-300 bg-red-50 p-4">
            <p className="text-sm text-red-900">
              Skriv <strong>RADERA</strong> nedan för att bekräfta. Detta går inte att ångra.
            </p>
            <input
              name="confirmation"
              required
              autoComplete="off"
              className="mt-2 w-full rounded-xl border border-red-300 bg-white p-2 text-sm"
              placeholder="RADERA"
            />
            {deleteState?.error ? (
              <p className="mt-2 text-sm text-red-800">{deleteState.error}</p>
            ) : null}
            <div className="mt-3 flex gap-2">
              <button
                type="submit"
                disabled={isDeleting}
                className="pill bg-red-700 text-white hover:bg-red-800"
              >
                {isDeleting ? "Raderar..." : "Bekräfta radering"}
              </button>
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                disabled={isDeleting}
                className="pill pill-light"
              >
                Avbryt
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
