const { getSmtpDiagnostics, verifySmtp } = require("../config/mail");

(async () => {
  console.log("SMTP diagnostics:", getSmtpDiagnostics());
  const ok = await verifySmtp();
  process.exit(ok ? 0 : 1);
})();
