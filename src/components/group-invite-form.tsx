"use client";

import InviteColleagueForm from "@/components/invite-colleague-form";

export default function GroupInviteForm({
  groupName,
  groupId,
}: {
  groupName: string;
  groupId: string;
  appUrl?: string;
}) {
  return (
    <div>
      <p className="mb-3 text-sm text-[var(--muted)]">
        Inbjudan kopplas till <strong>{groupName}</strong>.
      </p>
      <InviteColleagueForm groupId={groupId} />
    </div>
  );
}
