import nodemailer from "nodemailer";

function gmailConfig() {
  const user = process.env.GMAIL_SMTP_USER?.trim();
  const appPassword = process.env.GMAIL_SMTP_APP_PASSWORD?.replace(/\s/g, "");
  if (!user || !appPassword)
    throw new Error("License email is not configured. Set GMAIL_SMTP_USER and GMAIL_SMTP_APP_PASSWORD on the server.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user))
    throw new Error("GMAIL_SMTP_USER must be a valid Gmail address.");
  return { user, appPassword };
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  })[character] ?? character);
}

export async function sendProLicenseEmail(to: string, name: string, licenseCode: string) {
  const { user, appPassword } = gmailConfig();
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user, pass: appPassword }
  });
  const safeName = escapeHtml(name);
  const safeCode = escapeHtml(licenseCode);
  const supportEmail = process.env.NEXT_PUBLIC_PRO_SUPPORT_EMAIL?.trim() || user;
  try {
    const result = await transporter.sendMail({
      from: { name: "QRcraft Pro", address: user },
      to,
      replyTo: supportEmail,
      subject: "Your QRcraft Pro license is ready",
      text: [
        `Hi ${name},`,
        "",
        "Your QRcraft Pro payment has been approved. Your reusable Pro license is:",
        "",
        licenseCode,
        "",
        "Enter this code in QRcraft under Go Pro > Already have a Pro code? to unlock your purchase.",
        "Keep this email safe. Your license is linked to the email address used for your order.",
        "",
        `Need help? Contact ${supportEmail}`
      ].join("\n"),
      html: `<div style="background:#f6f5fb;padding:32px 16px;font-family:Arial,sans-serif;color:#202034"><div style="max-width:520px;margin:auto;background:#fff;border:1px solid #e8e6f0;border-radius:16px;padding:32px"><p style="color:#6257d9;font-size:12px;font-weight:bold;letter-spacing:1px">QRCRAFT PRO</p><h1 style="font-size:24px;margin:12px 0">Your Pro license is ready</h1><p style="font-size:15px;line-height:1.6">Hi ${safeName}, your payment has been approved. Use this reusable code to unlock Pro with your email address:</p><div style="padding:16px;background:#f5f3ff;border:1px solid #e4e0ff;border-radius:10px;text-align:center;font-family:monospace;font-size:16px;word-break:break-all;color:#4538b8">${safeCode}</div><p style="font-size:13px;line-height:1.6">In QRcraft, choose <b>Go Pro</b>, enter this code under <b>Already have a Pro code?</b>, then select <b>Activate</b>.</p><p style="font-size:12px;color:#77778a">Keep this email safe. Your license is linked to the email address used for your order.</p><p style="font-size:12px;color:#77778a">Need help? <a href="mailto:${escapeHtml(supportEmail)}">${escapeHtml(supportEmail)}</a></p></div></div>`
    });
    if (result.accepted.length === 0 || result.rejected.length > 0)
      throw new Error("Gmail did not accept the recipient address.");
  } catch (cause) {
    if (cause instanceof Error && cause.message.startsWith("Gmail did not accept")) throw cause;
    throw new Error("Gmail could not send the Pro code. Check the Gmail address and App Password configuration.");
  } finally {
    transporter.close();
  }
}
