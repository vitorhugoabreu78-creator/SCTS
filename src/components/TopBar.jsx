import React, { useState } from "react";
import { syncAllToCloud } from "../cloudSync";

export function TopBar({ pin, onLogout, tab, goHome }) {
  const isHome = tab === 0;
  const [syncing, setSyncing] = useState(false);

  async function handleSync() {
    try {
      setSyncing(true);
      await syncAllToCloud();
      alert("Sincronização concluída com sucesso.");
    } catch (err) {
      console.error(err);
      alert(`Erro na sincronização: ${err.message || err}`);
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="topbar">
      <div className="brand">
        <img src="/logo_scts.png" alt="SCTS" className="brandLogo" />
        <div>
          <div className="brandTitle">SCTS</div>
          <div className="brandSub">Controle de Tripulantes</div>
        </div>
      </div>

      <div className="topbarRight">
        {!isHome && (
          <button className="btn primary homeBtn" onClick={goHome}>
            ← Menu principal
          </button>
        )}

        <button className="btn soft" onClick={handleSync} disabled={syncing}>
          {syncing ? "Sincronizando..." : "Sincronizar"}
        </button>

        <span className="pill">PIN {pin}</span>

        <button className="btn ghost" onClick={onLogout}>
          Sair
        </button>
      </div>
    </div>
  );
}