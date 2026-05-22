"use client";

import { useActionState } from "react";
import { askQuestionAction } from "@/app/dashboard/fragor/actions";

export function QuestionCreateForm({ groupId, groupName }: { groupId?: string; groupName?: string }) {
  const [state, action, pending] = useActionState(askQuestionAction, undefined);
  const isGroupQuestion = Boolean(groupId);

  return (
    <form action={action} className="card mt-6 space-y-3">
      <h2 className="text-xl">{isGroupQuestion ? "Ny diskussion" : "Ställ ny fråga"}</h2>
      {groupId && <input type="hidden" name="group_id" value={groupId} />}
      {groupName && (
        <p className="text-sm text-[var(--muted)]">Diskussionen publiceras i <strong>{groupName}</strong>.</p>
      )}
      <label className="block text-sm">
        Rubrik
        <input name="title" required maxLength={200} className="mt-1 w-full rounded-xl border border-[var(--line)] bg-white p-2" />
      </label>
      <label className="block text-sm">
        {isGroupQuestion ? "Innehåll" : "Frågetext"}
        <textarea name="body" required maxLength={10000} className="mt-1 min-h-28 w-full rounded-xl border border-[var(--line)] bg-white p-2" />
      </label>
      <label className="block text-sm">
        Kategori
        <select name="category" className="mt-1 w-full rounded-xl border border-[var(--line)] bg-white p-2 md:w-48">
          <option value="kopa">Köpa</option>
          <option value="salja">Sälja</option>
          <option value="juridik">Juridik</option>
          <option value="vardering">Värdering</option>
          <option value="flytt">Flytt</option>
          <option value="ovrigt">Övrigt</option>
        </select>
      </label>
      {!isGroupQuestion && (
        <>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block text-sm">
              Målgrupp
              <select name="audience" className="mt-1 w-full rounded-xl border border-[var(--line)] bg-white p-2">
                <option value="buyer">Köpare</option>
                <option value="seller">Säljare</option>
                <option value="general">Generell</option>
              </select>
            </label>
            <label className="block text-sm">
              Räckvidd
              <select name="geo_scope" className="mt-1 w-full rounded-xl border border-[var(--line)] bg-white p-2">
                <option value="open">Öppen</option>
                <option value="regional">Regional</option>
                <option value="local">Lokal</option>
              </select>
            </label>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block text-sm">
              Kommun (valfritt)
              <input name="municipality" className="mt-1 w-full rounded-xl border border-[var(--line)] bg-white p-2" />
            </label>
            <label className="block text-sm">
              Län (valfritt)
              <input name="region" className="mt-1 w-full rounded-xl border border-[var(--line)] bg-white p-2" />
            </label>
          </div>
        </>
      )}
      {state?.error ? <p className="text-sm text-red-700">{state.error}</p> : null}
      {state?.success ? <p className="text-sm text-emerald-700">{state.success}</p> : null}
      <button className="pill pill-dark" disabled={pending}>
        {pending ? "Publicerar..." : isGroupQuestion ? "Publicera diskussion" : "Publicera fråga"}
      </button>
    </form>
  );
}
