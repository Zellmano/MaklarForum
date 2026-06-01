/**
 * Transactional email via Resend.
 *
 * Set these env vars in production (Vercel):
 *   RESEND_API_KEY   — your Resend API key
 *   RESEND_FROM      — verified sender, e.g. "MäklarForum <noreply@maklarforum.se>"
 *   NEXT_PUBLIC_APP_URL — site origin, used to build links in emails
 *
 * If RESEND_API_KEY is missing, sending is a no-op (logged, never throws) so
 * the surrounding action still succeeds in local/dev or before the key is set.
 */

type NotificationPrefs = Record<string, unknown> | null | undefined;

/** Master switch: notifications are on unless explicitly disabled. */
export function emailNotificationsEnabled(prefs: NotificationPrefs): boolean {
  if (prefs && typeof prefs === "object" && "email_notifications" in prefs) {
    return prefs.email_notifications !== false;
  }
  return true;
}

export function appUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
  );
}

async function sendEmail(params: { to: string; subject: string; html: string }): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(`[email] RESEND_API_KEY not set — skipping email "${params.subject}" to ${params.to}`);
    return;
  }

  const from = process.env.RESEND_FROM ?? "MäklarForum <onboarding@resend.dev>";

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: [params.to], subject: params.subject, html: params.html }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error(`[email] Resend rejected "${params.subject}" (${res.status}): ${detail}`);
    }
  } catch (err) {
    console.error(`[email] Failed to send "${params.subject}":`, err);
  }
}

function layout(heading: string, bodyHtml: string, ctaLabel: string, ctaHref: string): string {
  return `
  <div style="font-family:'Helvetica Neue',Arial,sans-serif;background:#f3f1ec;padding:32px 0;color:#16202a">
    <div style="max-width:520px;margin:0 auto;background:#fffdf8;border:1px solid #d7d2c5;border-radius:16px;padding:28px">
      <h1 style="font-size:20px;margin:0 0 12px">${heading}</h1>
      <div style="font-size:15px;line-height:1.55;color:#16202a">${bodyHtml}</div>
      <a href="${ctaHref}" style="display:inline-block;margin-top:20px;background:#104a4d;color:#f8fcfb;text-decoration:none;padding:11px 18px;border-radius:999px;font-weight:600;font-size:14px">${ctaLabel}</a>
      <p style="margin-top:24px;font-size:12px;color:#5d6872">
        Du får detta mail eftersom du har mailnotiser påslagna på MäklarForum.
        Stäng av dem under Min profil → Inställningar.
      </p>
    </div>
  </div>`;
}

export async function sendGroupApprovalEmail(params: {
  to: string;
  name: string;
  groupName: string;
  groupSlug: string;
}): Promise<void> {
  const href = `${appUrl()}/dashboard/grupper/${params.groupSlug}`;
  await sendEmail({
    to: params.to,
    subject: `Du är nu medlem i ${params.groupName}`,
    html: layout(
      `Välkommen in i ${params.groupName}!`,
      `<p>Hej ${escapeHtml(params.name)},</p>
       <p>Din ansökan till gruppen <strong>${escapeHtml(params.groupName)}</strong> har godkänts. Du kan nu se diskussioner, delta i omröstningar och skriva inlägg i gruppen.</p>`,
      "Öppna gruppen",
      href,
    ),
  });
}

export async function sendNewMessageEmail(params: {
  to: string;
  name: string;
  senderName: string;
  senderId: string;
}): Promise<void> {
  const href = `${appUrl()}/dashboard/messages/${params.senderId}`;
  await sendEmail({
    to: params.to,
    subject: `Nytt meddelande från ${params.senderName}`,
    html: layout(
      "Du har fått ett nytt meddelande",
      `<p>Hej ${escapeHtml(params.name)},</p>
       <p><strong>${escapeHtml(params.senderName)}</strong> har skickat dig ett meddelande på MäklarForum.</p>`,
      "Läs meddelandet",
      href,
    ),
  });
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
