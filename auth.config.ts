import { AuthOptions } from "next-auth";
import EmailProvider from "next-auth/providers/email";
import { D1Adapter } from "@auth/d1-adapter";
import type { SendVerificationRequestParams } from "next-auth/providers/email";

async function sendVerificationRequest({ identifier, url, provider }: SendVerificationRequestParams) {
  // Use your own email sending logic or customize the template
  const { host } = new URL(url);
  const nodemailer = require("nodemailer");
  const transport = nodemailer.createTransport(provider.server);
  await transport.sendMail({
    to: identifier,
    from: provider.from,
    subject: `Sign in to Kanban Flow`,
    text: `Sign in to Kanban Flow\n${url}\n\nThis link will expire in 10 minutes.\n\nIf you did not request this email, you can safely ignore it.`,
    html: `<div style="font-family:sans-serif;max-width:480px;margin:auto;padding:2em;background:#fff;border-radius:8px;">
      <h2 style="color:#3b82f6;">Kanban Flow</h2>
      <p>Click the button below to sign in:</p>
      <a href="${url}" style="display:inline-block;padding:0.75em 1.5em;background:#3b82f6;color:#fff;border-radius:4px;text-decoration:none;font-weight:bold;">Sign in</a>
      <p style="margin-top:2em;font-size:0.9em;color:#666;">This link will expire in 10 minutes.<br>If you did not request this email, you can safely ignore it.</p>
    </div>`
  });
}

export const authOptions: AuthOptions = {
  adapter: D1Adapter(process.env.DB as any), // Replace with your D1 binding
  providers: [
    EmailProvider({
      server: process.env.EMAIL_SERVER!,
      from: process.env.EMAIL_FROM!,
      sendVerificationRequest,
    }),
  ],
  session: {
    strategy: "database",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60,   // 24 hours
  },
  callbacks: {
    async session({ session, user }) {
      session.user = user;
      return session;
    },
  },
  debug: process.env.NODE_ENV === "development",
}; 