import React, { useEffect, useState } from "react";
import { db } from "../db";
import { nowIsoDate } from "../lib";
import { pullUsersFromCloud } from "../cloudSync";

export function Dashboard({ go }) {

  const [stats, setStats] = useState({
    embarque: 0,
    desembarque: 0,
    saida: 0,
    total: 0,
    pendentes: 0,
    confirmados: 0
  });

  async function loadStats() {

    const hoje = nowIsoDate();

    const registros = await db.checkins.toArray();
    const crew = await db.crew.toArray();

    const hojeRegs = registros.filter((r) => r.dataIso === hoje && !r.isDeleted);

    const hojeCrew = crew.filter((c) => {
      const data = c.dataIso || c.data || "";
      return !data || data === hoje;
    });

    const embarque = hojeRegs.filter((r) =>
      String(r.motivacao || r.tipo || "").toUpperCase().includes("EMBARQUE")
    ).length;

    const desembarque = hojeRegs.filter((r) =>
      String(r.motivacao || r.tipo || "").toUpperCase().includes("DESEMBARQUE")
    ).length;

    const saida = hojeRegs.filter((r) => {
      const t = String(r.motivacao || r.tipo || "").toUpperCase();
      return t.includes("SAIDA") || t.includes("SAÍDA");
    }).length;

    const confirmados = hojeCrew.filter((c) => c.status === "CONFIRMADO").length;
    const pendentes = hojeCrew.filter((c) => c.status !== "CONFIRMADO").length;

    setStats({
      embarque,
      desembarque,
      saida,
      total: hojeRegs.length,
      pendentes,
      confirmados
    });

  }

  async function syncUsers(){

    try {

      await pullUsersFromCloud();
      console.log("Usuários sincronizados");

    } catch (err) {

      console.warn("Falha ao sincronizar usuários");

    }

  }

  useEffect(() => {

    loadStats();
    syncUsers();

  }, []);

  return (
    <div className="container">

      <div className="corpHero">

        <div className="corpHeroSide">

          <img
            src="/logo_scts.png"
            alt="SCTS"
            className="corpHeroLogo"
          />

          <div className="corpHeroText">
            Plataforma central de operação e controle.
          </div>

        </div>

        <div className="corpHeroMain">

          <div className="heroEyebrow">SCTS</div>

          <div className="heroHeading simple">
            Sistema de Controle de Tripulação
          </div>

          <div className="heroDate">
            Operação do dia: {nowIsoDate()}
          </div>

        </div>

      </div>

      <div className="card corpPanel" style={{ marginTop: 16 }}>

        <div className="sectionTitle">
          Resumo do dia
        </div>

        <div className="statsGrid">

          <div className="statCard softBlue emphasis">
            <div className="statNumber">{stats.embarque}</div>
            <div className="statLabel">Embarques</div>
          </div>

          <div className="statCard softGreen emphasis">
            <div className="statNumber">{stats.desembarque}</div>
            <div className="statLabel">Desembarques</div>
          </div>

          <div className="statCard softOrange emphasis">
            <div className="statNumber">{stats.saida}</div>
            <div className="statLabel">Saída Pontual</div>
          </div>

          <div className="statCard softDark emphasis">
            <div className="statNumber">{stats.total}</div>
            <div className="statLabel">Total</div>
          </div>

        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>

          <span className="pill">
            Confirmados: {stats.confirmados}
          </span>

          <span className="pill">
            Pendentes: {stats.pendentes}
          </span>

        </div>

      </div>

      <div className="menuSection">

        <div className="menuSideBanner">

          <div className="menuSideTag">SCTS</div>

          <div className="menuSideTitle">
            Acesso rápido
          </div>

          <div className="menuSideText">
            Abra rapidamente a área desejada para continuar a operação.
          </div>

        </div>

        <div className="gridMenu modernMenu strongCards">

          <button
            className="menuCard clean strong"
            onClick={() => go?.(1)}
          >
            <div className="menuIcon">🧭</div>

            <div>
              <div className="menuTitle">
                Operação do Dia
              </div>

              <div className="menuDesc">
                Abrir listas e confirmar tripulantes
              </div>
            </div>

          </button>

          <button
            className="menuCard clean strong"
            onClick={() => go?.(2)}
          >
            <div className="menuIcon">📋</div>

            <div>
              <div className="menuTitle">
                Listas
              </div>

              <div className="menuDesc">
                Importar e localizar listas por período
              </div>
            </div>

          </button>

          <button
            className="menuCard clean strong"
            onClick={() => go?.(3)}
          >
            <div className="menuIcon">✍️</div>

            <div>
              <div className="menuTitle">
                Registro Manual
              </div>

              <div className="menuDesc">
                Cadastrar tripulante fora da planilha
              </div>
            </div>

          </button>

          <button
            className="menuCard clean strong"
            onClick={() => go?.(4)}
          >
            <div className="menuIcon">🧾</div>

            <div>
              <div className="menuTitle">
                Registros
              </div>

              <div className="menuDesc">
                Consultar registros e exportar relatórios
              </div>
            </div>

          </button>

        </div>

      </div>

    </div>
  );
}