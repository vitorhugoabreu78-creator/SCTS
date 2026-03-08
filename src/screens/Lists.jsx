import React, { useEffect, useMemo, useRef, useState } from "react";
import { db } from "../db";
import { importExcelFile } from "../excelImport";
import { nowIsoDate } from "../lib";

function inRange(d, from, to) {
  if (!d) return false;
  return (!from || d >= from) && (!to || d <= to);
}

function normalizeRange(dateFrom, dateTo) {
  if (!dateFrom && !dateTo) return { from: null, to: null };
  if (!dateFrom) return { from: null, to: dateTo };
  if (!dateTo) return { from: dateFrom, to: null };
  return dateFrom <= dateTo ? { from: dateFrom, to: dateTo } : { from: dateTo, to: dateFrom };
}

function tipoBonito(tipo) {
  const t = String(tipo || "").toUpperCase();
  if (t.includes("EMBARQUE")) return "EMBARQUE";
  if (t.includes("DESEMBARQUE")) return "DESEMBARQUE";
  if (t.includes("SAÍDA PONTUAL") || t.includes("SAIDA PONTUAL")) return "SAÍDA PONTUAL";
  if (t.includes("(MANUAL)")) return "MANUAL";
  return t || "SEM TIPO";
}

export function Lists({ onOpenList }) {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [dateFrom, setDateFrom] = useState(nowIsoDate());
  const [dateTo, setDateTo] = useState(nowIsoDate());
  const [useRange, setUseRange] = useState(false);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const fileRef = useRef(null);

  async function load() {
    const lists = await db.lists.orderBy("dataIso").reverse().toArray();

    const enriched = [];
    for (const l of lists) {
      const crew = await db.crew.where({ listId: l.id }).toArray();
      const total = crew.length;
      const confirmados = crew.filter(c => c.status === "CONFIRMADO").length;

      enriched.push({
        ...l,
        total,
        confirmados,
        pendentes: total - confirmados
      });
    }

    setRows(enriched);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleImport(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setBusy(true);
    setMsg("");

    try {
      const res = await importExcelFile(file);
      await load();

      setMsg(`Importado com sucesso: ${res.crewInserted} tripulantes / ${res.listsCreatedOrFound} listas.`);

      if (res.warnings?.length) {
        alert(res.warnings.join("\n\n"));
      }
    } catch (err) {
      console.error(err);
      setMsg("Erro ao importar o Excel.");
    } finally {
      setBusy(false);
    }
  }

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const norm = normalizeRange(dateFrom, dateTo);

    return rows.filter((r) => {
      if (!useRange) {
        if (r.dataIso !== dateFrom) return false;
      } else {
        if (!inRange(r.dataIso, norm.from, norm.to)) return false;
      }

      if (!s) return true;

      const tipo = String(r.tipo || "").toLowerCase();
      const embarcacao = String(r.embarcacao || "").toLowerCase();
      const src = String(r.sourceFilename || "").toLowerCase();

      return (
        tipo.includes(s) ||
        embarcacao.includes(s) ||
        src.includes(s) ||
        String(r.dataIso || "").includes(s)
      );
    });
  }, [rows, q, dateFrom, dateTo, useRange]);

  return (
    <div className="container">
      <div className="corpHeroMini">
        <div>
          <div className="heroEyebrow">Listas</div>
          <div className="sectionTitle bigTitle">Listas de Tripulação</div>
          <div className="small">Importe planilhas, filtre por período e localize rapidamente qualquer lista.</div>
        </div>

        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          <button className="btn primary" onClick={() => fileRef.current?.click()} disabled={busy}>
            {busy ? "Importando..." : "Importar Excel"}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            style={{ display: "none" }}
            onChange={handleImport}
          />
        </div>
      </div>

      <div className="card corpPanel" style={{ marginTop: 16 }}>
        <div className="sectionTitle">Filtros</div>

        <div className="row" style={{ marginTop: 10 }}>
          <div className="col">
            <div className="label">Busca rápida</div>
            <input
              className="input"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Navio, motivação, arquivo, data..."
            />
          </div>

          <div className="col">
            <div className="label">Modo de data</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className={useRange ? "btn" : "btn primary"} onClick={() => setUseRange(false)}>
                Só 1 dia
              </button>
              <button className={useRange ? "btn primary" : "btn"} onClick={() => setUseRange(true)}>
                Período
              </button>
            </div>
          </div>
        </div>

        <div className="row" style={{ marginTop: 10 }}>
          <div className="col">
            <div className="label">{useRange ? "De" : "Dia"}</div>
            <input
              className="input"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>

          {useRange && (
            <div className="col">
              <div className="label">Até</div>
              <input
                className="input"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
          <button
            className="btn"
            onClick={() => {
              const d = nowIsoDate();
              setUseRange(false);
              setDateFrom(d);
              setDateTo(d);
            }}
          >
            Hoje
          </button>

          <button
            className="btn"
            onClick={() => {
              const to = nowIsoDate();
              const from = new Date();
              from.setDate(from.getDate() - 6);
              const f = from.toISOString().slice(0, 10);
              setUseRange(true);
              setDateFrom(f);
              setDateTo(to);
            }}
          >
            Últimos 7 dias
          </button>

          <button
            className="btn"
            onClick={() => {
              const to = nowIsoDate();
              const from = new Date();
              from.setDate(from.getDate() - 29);
              const f = from.toISOString().slice(0, 10);
              setUseRange(true);
              setDateFrom(f);
              setDateTo(to);
            }}
          >
            Últimos 30 dias
          </button>
        </div>

        {msg && <div className="notice ok" style={{ marginTop: 12 }}>{msg}</div>}
      </div>

      <div className="sectionHeader" style={{ marginTop: 16 }}>
        <div className="sectionTitle">Resultados</div>
        <span className="pill">{filtered.length} listas</span>
      </div>

      <div className="listCards">
        {filtered.map((l) => (
          <button key={l.id} className="listCard" onClick={() => onOpenList?.(l)}>
            <div className="listCardTop">
              <span className="softTag">{tipoBonito(l.tipo)}</span>
              <span className="small">{l.dataIso}</span>
            </div>

            <div className="listCardTitle">{l.embarcacao || "Sem navio"}</div>

            <div className="listCardMeta">
              <span>Total: {l.total}</span>
              <span>Confirmados: {l.confirmados}</span>
              <span>Pendentes: {l.pendentes}</span>
            </div>

            {l.sourceFilename && (
              <div className="small" style={{ marginTop: 8 }}>
                Arquivo: {l.sourceFilename}
              </div>
            )}
          </button>
        ))}

        {filtered.length === 0 && (
          <div className="card emptyStateCard">
            Nenhuma lista para este filtro. Tente outro período ou importe um Excel.
          </div>
        )}
      </div>
    </div>
  );
}