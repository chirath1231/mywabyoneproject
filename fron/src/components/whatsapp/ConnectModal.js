// src/components/whatsapp/ConnectModal.js
import { useEffect, useRef, useState } from "react";
import { connectInstance, getInstanceStatus } from "../../api/whatsapp";
import "./whatsapp.css";

const POLL_INTERVAL_MS = 2000;

export default function ConnectModal({ onClose, onConnected }) {
  const [name, setName] = useState("");
  const [step, setStep] = useState("name"); // name | creating | qr | authorized | error
  const [qrCode, setQrCode] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState(null);
  const [error, setError] = useState(null);
  const instanceIdRef = useRef(null);
  const pollRef = useRef(null);

  useEffect(() => {
    return () => clearTimeout(pollRef.current);
  }, []);

  async function handleStart(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setStep("creating");
    setError(null);

    try {
      const result = await connectInstance(name.trim());
      instanceIdRef.current = result.id;
      poll();
    } catch (err) {
      setError(
        err.status === 409
          ? "No WhatsApp numbers are available right now. Contact support to add more."
          : err.message,
      );
      setStep("error");
    }
  }

  function poll() {
    pollRef.current = setTimeout(async () => {
      try {
        const result = await getInstanceStatus(instanceIdRef.current);

        if (result.status === "qr_ready" && result.qrCode) {
          setQrCode(result.qrCode);
          setStep("qr");
          poll();
        } else if (result.status === "authorized") {
          setPhoneNumber(result.phoneNumber);
          setStep("authorized");
          onConnected();
        } else if (result.status === "blocked" || result.status === "error") {
          setError(result.error || "This number couldn't be connected. Try again.");
          setStep("error");
        } else {
          poll();
        }
      } catch (err) {
        setError(err.message);
        setStep("error");
      }
    }, POLL_INTERVAL_MS);
  }

  return (
    <div className="wa-modal-overlay" onClick={onClose}>
      <div className="wa-modal" onClick={(e) => e.stopPropagation()}>
        <button className="wa-modal__close" onClick={onClose} aria-label="Close">
          ×
        </button>

        {step === "name" && (
          <form onSubmit={handleStart}>
            <h2 className="wa-modal__title">Connect a WhatsApp number</h2>
            <p className="wa-modal__subtitle">
              Give this line a name you'll recognize later, like "Sales" or "Support".
            </p>
            <input
              className="wa-input"
              type="text"
              placeholder="e.g. Sales line"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
            <button className="wa-button wa-button--primary" type="submit" disabled={!name.trim()}>
              Continue
            </button>
          </form>
        )}

        {step === "creating" && (
          <div className="wa-modal__center">
            <div className="wa-spinner" />
            <h2 className="wa-modal__title">Setting up your line…</h2>
            <p className="wa-modal__subtitle">This takes a few seconds.</p>
          </div>
        )}

        {step === "qr" && (
          <div className="wa-modal__center">
            <h2 className="wa-modal__title">Scan with WhatsApp</h2>
            <p className="wa-modal__subtitle">
              On your phone: WhatsApp → Settings → Linked devices → Link a device
            </p>
            <div className="wa-qr-frame">
              <img
                className="wa-qr-frame__img"
                src={`data:image/png;base64,${qrCode}`}
                alt="WhatsApp QR code"
              />
              <div className="wa-qr-frame__pulse" />
            </div>
            <p className="wa-modal__hint">Waiting for scan…</p>
          </div>
        )}

        {step === "authorized" && (
          <div className="wa-modal__center">
            <div className="wa-success-check">✓</div>
            <h2 className="wa-modal__title">Connected</h2>
            <p className="wa-modal__subtitle">
              {phoneNumber ? `Linked to ${phoneNumber}` : "Your number is linked and ready."}
            </p>
            <button className="wa-button wa-button--primary" onClick={onClose}>
              Done
            </button>
          </div>
        )}

        {step === "error" && (
          <div className="wa-modal__center">
            <h2 className="wa-modal__title">Couldn't connect</h2>
            <p className="wa-modal__subtitle wa-modal__subtitle--error">{error}</p>
            <button className="wa-button wa-button--secondary" onClick={onClose}>
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
