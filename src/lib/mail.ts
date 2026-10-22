import 'server-only';

import nodemailer, { type Transporter } from 'nodemailer';

import { SITE } from '@/config/site';
import { serverEnv } from '@lib/env';

type Mail = { to: string; subject: string; text: string; html: string };

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = serverEnv;
  if (!SMTP_USER || !SMTP_PASS) return null;
  transporter ??= nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return transporter;
}

/**
 * Sends an email over SMTP (see SMTP_* in `.env.example`). Without SMTP
 * credentials the mail is logged instead, so flows still work in development.
 */
export async function sendMail(mail: Mail): Promise<void> {
  const smtp = getTransporter();
  if (!smtp) {
    const log = serverEnv.IS_PROD ? console.error : console.info;
    log(`[mail] SMTP not configured — not sent to ${mail.to}: ${mail.subject}\n${mail.text}`);
    return;
  }
  await smtp.sendMail({
    from: serverEnv.MAIL_FROM ?? `${SITE.name} <${serverEnv.SMTP_USER}>`,
    ...mail,
  });
}

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** A minimal, email-client-safe layout: greeting, paragraphs and one button. */
export function mailLayout(opts: {
  greeting: string;
  paragraphs: string[];
  action: { label: string; url: string };
  footnote?: string;
}): { text: string; html: string } {
  const { greeting, paragraphs, action, footnote } = opts;
  const text = [
    greeting,
    ...paragraphs,
    `${action.label}: ${action.url}`,
    footnote,
    `— ${SITE.name}`,
  ]
    .filter(Boolean)
    .join('\n\n');
  const p = (s: string) =>
    `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155">${escapeHtml(s)}</p>`;
  const html = `<!doctype html><html><body style="margin:0;background:#f1f5f9;padding:24px 12px;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px">
<tr><td style="padding:28px 28px 8px;font-size:20px;font-weight:bold;color:#0f172a">${escapeHtml(SITE.name)}</td></tr>
<tr><td style="padding:12px 28px 28px">
${p(greeting)}
${paragraphs.map(p).join('\n')}
<p style="margin:24px 0"><a href="${escapeHtml(action.url)}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;padding:12px 22px;border-radius:8px">${escapeHtml(action.label)}</a></p>
<p style="margin:0 0 16px;font-size:13px;line-height:1.6;color:#64748b">Or paste this link into your browser:<br><a href="${escapeHtml(action.url)}" style="color:#2563eb;word-break:break-all">${escapeHtml(action.url)}</a></p>
${footnote ? `<p style="margin:0;font-size:13px;line-height:1.6;color:#64748b">${escapeHtml(footnote)}</p>` : ''}
</td></tr></table></body></html>`;
  return { text, html };
}
