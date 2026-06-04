const path = require("path");
const nodemailer = require("nodemailer");

// Always load backend/.env (works even if the process cwd is the repo root)
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

function getSmtpAuth() {
  const user = (process.env.SMTP_USER || "").trim();
  // Gmail app passwords are 16 chars; strip spaces users paste from Google UI
  const pass = (process.env.SMTP_PASS || "").trim().replace(/\s/g, "");
  return { user, pass };
}

function createMailTransporter() {
  const auth = getSmtpAuth();
  const host = (process.env.SMTP_HOST || "").trim().toLowerCase();

  if (!auth.user || !auth.pass) {
    throw new Error("SMTP_USER and SMTP_PASS must be set in backend/.env");
  }

  // Nodemailer's Gmail preset handles STARTTLS correctly
  if (host === "smtp.gmail.com" || process.env.SMTP_SERVICE === "gmail") {
    return nodemailer.createTransport({ service: "gmail", auth });
  }

  const port = Number(process.env.SMTP_PORT) || 587;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth,
  });
}

function getSmtpDiagnostics() {
  const auth = getSmtpAuth();
  const rawPass = process.env.SMTP_PASS || "";
  return {
    envFile: path.join(__dirname, "..", ".env"),
    host: (process.env.SMTP_HOST || "(not set)").trim(),
    port: process.env.SMTP_PORT || "587",
    user: auth.user || "(not set)",
    passLength: auth.pass.length,
    passHasSpaces: /\s/.test(rawPass),
    smtpLogOtp: process.env.SMTP_LOG_OTP === "true",
  };
}

async function verifySmtp() {
  const diag = getSmtpDiagnostics();
  if (!diag.user || diag.user === "(not set)" || diag.passLength === 0) {
    console.warn("[SMTP] Missing SMTP_USER or SMTP_PASS in backend/.env");
    return false;
  }

  if (diag.passLength !== 16) {
    console.warn(
      `[SMTP] SMTP_PASS length is ${diag.passLength} (expected 16 for Gmail app passwords)`
    );
  }

  try {
    const transporter = createMailTransporter();
    await transporter.verify();
    console.log(`[SMTP] Connection OK for ${diag.user}`);
    return true;
  } catch (err) {
    console.error(`[SMTP] Connection failed for ${diag.user}: ${err.message}`);
    console.error(
      "[SMTP] Regenerate an app password: https://myaccount.google.com/apppasswords"
    );
    console.error(
      "[SMTP] SMTP_USER must be the same Gmail account that created the app password."
    );
    return false;
  }
}

module.exports = {
  createMailTransporter,
  getSmtpAuth,
  getSmtpDiagnostics,
  verifySmtp,
};
