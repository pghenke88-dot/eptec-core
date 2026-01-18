import nodemailer from "nodemailer";

function bool(v) {
  return String(v || "").toLowerCase() === "true";
}

export async function sendMail({ to, subject, text, html }) {
  const logOnly = bool(process.env.MAIL_LOG_ONLY);

  if (logOnly) {
    console.log("\n[EPTEC MAIL LOG]");
    console.log("TO:", to);
    console.log("SUBJECT:", subject);
    console.log(text);
    console.log("[/EPTEC MAIL LOG]\n");
    return { ok: true, mode: "log" };
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });

  const from = process.env.MAIL_FROM || "EPTEC <no-reply@eptec.local>";
  const info = await transporter.sendMail({ from, to, subject, text, html });
  return { ok: true, messageId: info.messageId };
}
