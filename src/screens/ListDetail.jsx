import React, { useEffect, useMemo, useState } from "react";
import { db } from "../db";
import { exportarExcelBonito } from "../excelExportBonito";
import { Modal } from "../components/Modal";

function tipoBonito(tipo){
  const t = String(tipo || "").toUpperCase();

  if (t.includes("EMBARQUE")) return "EMBARQUE";
  if (t.includes("DESEMBARQUE")) return "DESEMBARQUE";
  if (t.includes("SAÍDA PONTUAL") || t.includes("SAIDA PONTUAL")) return "SAÍDA PONTUAL";
  if (t.includes("(MANUAL)")) return "MANUAL";
  return t || "SEM TIPO";
}

export function ListDetail({ list, onBack, onConfirm }) {
  const [crew, setCrew] = useState([]);
  const [counts, setCounts] = useState({ total: 0, confirmados: 0 });
  const [q, setQ] = useState("");
  const [onlyPending, setOnlyPending] = useState(false);

  const [selectedCrew, setSelectedCrew] = useState(null);
  const [selectedCheckin, setSelectedCheckin] = useState(null);

  async function load(){
    let rows = await db.crew.where({ listId: list.id }).toArray();

    rows = rows.filter(r => r.status !== "EXCLUIDO");

    const total = rows.length;
    const confirmados = rows.filter(r => r.status === "CONFIRMADO").length;

    rows.sort((a, b) => {
      if (a.status === b.status) {
        return String(a.nome || "").localeCompare(String(b.nome || ""));
      }
      return a.status === "CONFIRMADO" ? 1 : -1;
    });

    setCrew(rows);
    setCounts({ total, confirmados });
  }

  useEffect(() => {
    load();
  }, [list?.id]);

  async function exportThisList(){
    const rows = await db.checkins.where({ listId: list.id }).toArray();
    await exportarExcelBonito(rows.filter(r => !r.isDeleted));
  }

  async function openPreview(c){
    setSelectedCrew(c);

    if (c.status === "CONFIRMADO") {
      const checkins = await db.checkins.where({ listId: list.id }).toArray();
      const match = checkins.find(r => !r.isDeleted && String(r.documento || "") === String(c.documento || ""));
      setSelectedCheckin(match || null);
    } else {
      setSelectedCheckin(null);
    }
  }

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();

    let out = crew;

    if (onlyPending) {
      out = out.filter(c => c.status !== "CONFIRMADO");
    }

    if (!s) return out;

    return out.filter(c => {
      const nome = String(c.nome || "").toLowerCase();
      const documento = String(c.documento || "").toLowerCase();
      const empresa = String(c.empresa || "").toLowerCase();
      const funcao = String(c.funcao || "").toLowerCase();
      const acesso = String(c.acesso || "").toLowerCase();
      const transporte = String(c.transporte || "").toLowerCase();
      const placa = String(c.placa || "").toLowerCase();
      const observacao = String(c.observacao || "").toLowerCase();

      return (
        nome.includes(s) ||
        documento.includes(s) ||
        empresa.includes(s) ||
        funcao.includes(s) ||
        acesso.includes(s) ||
        transporte.includes(s) ||
        placa.includes(s) ||
        observacao.includes(s)
      );
    });
  }, [crew, q, onlyPending]);

  return (
    <div className="container">
      <div className="card">
        <div style={{display:"flex", justifyContent:"space-between", gap:10, alignItems:"center", flexWrap:"wrap"}}>
          <button className="btn" onClick={onBack}>← Voltar</button>

          <div style={{display:"flex", gap:8, alignItems:"center", flexWrap:"wrap"}}>
            <span className={counts.confirmados === counts.total && counts.total > 0 ? "badge ok" : "badge"}>
              {counts.confirmados}/{counts.total} confirmados
            </span>

            <button className="btn primary" onClick={exportThisList}>
              Exportar Excel desta lista
            </button>
          </div>
        </div>

        <div style={{marginTop:10}}>
          <div style={{fontSize:16, fontWeight:1000}}>
            {tipoBonito(list.tipo)} • {list.embarcacao || "Sem navio"}
          </div>
          <div className="small">{list.dataIso}</div>
        </div>

        <div className="hr"></div>

        <div className="row">
          <div className="col">
            <div className="label">Busca</div>
            <input
              className="input"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Nome, documento, função, empresa, acesso..."
            />
          </div>

          <div className="col">
            <div className="label">Mostrar</div>
            <button
              className={onlyPending ? "btn primary" : "btn"}
              onClick={() => setOnlyPending(v => !v)}
            >
              {onlyPending ? "Só pendentes" : "Pendentes + confirmados"}
            </button>
            <div className="small" style={{marginTop:6}}>
              Em listas grandes, “só pendentes” agiliza muito.
            </div>
          </div>
        </div>
      </div>

      <div className="list">
        {filtered.map(c => (
          <div
            key={c.id}
            className="item"
            onClick={() => openPreview(c)}
          >
            <div style={{flex:1}}>
              <div style={{fontWeight:1000}}>
                {c.nome || "Sem nome"} {c.status === "CONFIRMADO" && <span style={{color:"var(--ok)"}}>✔</span>}
              </div>

              <div className="small">
                {c.documento || "Sem documento"} • {c.empresa || "Sem empresa"}
              </div>

              <div className="small">
                {c.funcao || "Sem função"} • {c.motivacao || tipoBonito(list.tipo)}
              </div>

              <div className="small">
                {c.acesso || "Sem acesso"} • {c.transporte || "Sem transporte"}
                {c.tipoTransporte ? ` • ${c.tipoTransporte}` : ""}
              </div>

              {(c.placa || c.controle) && (
                <div className="small">
                  {c.placa ? `Placa: ${c.placa}` : ""}
                  {c.placa && c.controle ? " • " : ""}
                  {c.controle ? `Controle: ${c.controle}` : ""}
                </div>
              )}

              {(c.horaSaida || c.horaEntrada) && (
                <div className="small">
                  {c.horaSaida ? `Saída: ${c.horaSaida}` : ""}
                  {c.horaSaida && c.horaEntrada ? " • " : ""}
                  {c.horaEntrada ? `Entrada: ${c.horaEntrada}` : ""}
                </div>
              )}

              {c.observacao && (
                <div className="small">
                  Obs: {c.observacao}
                </div>
              )}
            </div>

            <span className={c.status === "CONFIRMADO" ? "badge ok" : "badge"}>
              {c.status}
            </span>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="card">Nada encontrado para esta lista.</div>
        )}
      </div>

      {selectedCrew && (
        <Modal title="Prévia do tripulante" onClose={() => {
          setSelectedCrew(null);
          setSelectedCheckin(null);
        }}>
          <div className="modalScroll">
            <div className="kv">
              <div className="k">Nome</div><div className="v">{selectedCrew.nome || "-"}</div>
              <div className="k">Documento</div><div className="v">{selectedCrew.documento || "-"}</div>
              <div className="k">Empresa</div><div className="v">{selectedCrew.empresa || "-"}</div>
              <div className="k">Função</div><div className="v">{selectedCrew.funcao || "-"}</div>
              <div className="k">Embarcação</div><div className="v">{list.embarcacao || "-"}</div>
              <div className="k">Motivação</div><div className="v">{selectedCrew.motivacao || tipoBonito(list.tipo)}</div>
              <div className="k">Acesso</div><div className="v">{selectedCrew.acesso || "-"}</div>
              <div className="k">Transporte</div><div className="v">{selectedCrew.transporte || "-"}</div>
              <div className="k">Tipo transporte</div><div className="v">{selectedCrew.tipoTransporte || "-"}</div>
              <div className="k">Placa</div><div className="v">{selectedCrew.placa || "-"}</div>
              <div className="k">Controle</div><div className="v">{selectedCrew.controle || "-"}</div>
              <div className="k">Saída</div><div className="v">{selectedCrew.horaSaida || "-"}</div>
              <div className="k">Entrada</div><div className="v">{selectedCrew.horaEntrada || "-"}</div>
              <div className="k">Status</div><div className="v">{selectedCrew.status || "-"}</div>

              {selectedCrew.observacao && (
                <>
                  <div className="k">Observação</div><div className="v">{selectedCrew.observacao}</div>
                </>
              )}
            </div>

            {selectedCheckin && (
              <>
                <div className="hr"></div>
                <div className="label">Foto</div>
                <div className="photoBox photoBoxModal">
                  {selectedCheckin.photoUrl ? (
                    <img src={selectedCheckin.photoUrl} alt="Foto do tripulante" />
                  ) : (
                    <div className="small">Sem foto</div>
                  )}
                </div>

                <div className="small" style={{ marginTop: 8 }}>
                  Registro feito em {selectedCheckin.dataIso} {selectedCheckin.hora || ""}
                </div>
              </>
            )}

            <div className="hr"></div>

            {selectedCrew.status !== "CONFIRMADO" ? (
              <button
                className="btn primary wideBtn"
                onClick={() => {
                  const crewToConfirm = selectedCrew;
                  setSelectedCrew(null);
                  setSelectedCheckin(null);
                  onConfirm?.(crewToConfirm, list);
                }}
              >
                Confirmar tripulante
              </button>
            ) : (
              <button className="btn wideBtn" onClick={() => {
                setSelectedCrew(null);
                setSelectedCheckin(null);
              }}>
                Fechar
              </button>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}