// src/pages/WhatsAppPage.js
import { useEffect, useState, useCallback } from "react";
import { listInstances } from "../api/whatsapp";
import InstanceCard from "../components/whatsapp/InstanceCard";
import ConnectModal from "../components/whatsapp/ConnectModal";
import "../components/whatsapp/whatsapp.css";

export default function WhatsAppPage() {
  const [instances, setInstances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showConnect, setShowConnect] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const result = await listInstances();
      setInstances(result.instances);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <div className="wa-page">
      <div className="wa-page__header">
        <div>
          <h1 className="wa-page__title">WhatsApp</h1>
          <p className="wa-page__subtitle">
            Connect WhatsApp numbers and set how your bot replies on each one.
          </p>
        </div>
        <button className="wa-button wa-button--primary" onClick={() => setShowConnect(true)}>
          + Connect a number
        </button>
      </div>

      {loading && <div className="wa-page__loading">Loading…</div>}

      {!loading && error && (
        <div className="wa-page__error">
          Couldn't load your numbers. {error}
        </div>
      )}

      {!loading && !error && instances.length === 0 && (
        <div className="wa-empty">
          <div className="wa-empty__icon">＋</div>
          <h2 className="wa-empty__title">No WhatsApp numbers yet</h2>
          <p className="wa-empty__subtitle">
            Connect a number to start replying to customers automatically.
          </p>
          <button className="wa-button wa-button--primary" onClick={() => setShowConnect(true)}>
            Connect a number
          </button>
        </div>
      )}

      {!loading && !error && instances.length > 0 && (
        <div className="wa-grid">
          {instances.map((instance) => (
            <InstanceCard key={instance.id} instance={instance} onChanged={refresh} />
          ))}
        </div>
      )}

      {showConnect && (
        <ConnectModal
          onClose={() => {
            setShowConnect(false);
            refresh();
          }}
          onConnected={refresh}
        />
      )}
    </div>
  );
}
