import React, { useEffect, useMemo, useState } from 'react';
import { db } from '../db';
import { nowIsoDate } from '../lib';

function tipoBonito(tipo){
  const t = String(tipo || '').toUpperCase();
  if (t.includes('EMBARQUE')) return 'EMBARQUE';
  if (t.includes('DESEMBARQUE')) return 'DESEMBARQUE';
  if (t.includes('SAÍDA PONTUAL') || t.includes('SAIDA PONTUAL')) return 'SAÍDA PONTUAL';
  if (t.includes('(MANUAL)')) return 'MANUAL';
  return t || 'SEM TIPO';
}

function motivacaoBadgeClass(tipo){
  const t = String(tipo || '').toUpperCase();
  if (t.includes('EMBARQUE')) return 'badge ok';
  if (t.includes('DESEMBARQUE')) return 'badge warn';
  return 'badge';
}

export function Operation({ onOpenList }) {
  const [dateIso, setDateIso] = useState(nowIsoDate());
  const [lists, setLists] = useState([]);
  const [q, setQ] = useState('');
  const [matches, setMatches] = useState([]);

  async function load(d = dateIso){
    const baseLists = await db.lists.where({ dataIso: d }).toArray();

    const enriched = [];
    for (const l of baseLists) {
      let crew = await db.crew.where({ listId: l.id }).toArray();
      crew = crew.filter(c => c.status !== 'EXCLUIDO');

      const total = crew.length;
      const confirmados = crew.filter(c => c.status === 'CONFIRMADO').length;
      const pendentes = crew.filter(c => c.status !== 'CONFIRMADO').length;

      enriched.push({
        ...l,
        total,
        confirmados,
        pendentes
      });
    }

    enriched.sort((a, b) => {
      const tipoCmp = tipoBonito(a.tipo).localeCompare(tipoBonito(b.tipo));
      if (tipoCmp !== 0) return tipoCmp;
      return String(a.embarcacao || '').localeCompare(String(b.embarcacao || ''));
    });

    setLists(enriched);
  }

  useEffect(() => {
    load(dateIso);
  }, [dateIso]);

  const grouped = useMemo(() => {
    const g = new Map();
    for (const l of lists) {
      const tipo = tipoBonito(l.tipo);
      if (!g.has(tipo)) g.set(tipo, []);
      g.get(tipo).push(l);
    }
    return Array.from(g.entries());
  }, [lists]);

  async function search(){
    const s = q.trim().toLowerCase();
    if (s.length < 2) {
      setMatches([]);
      return;
    }

    const dayLists = await db.lists.where({ dataIso: dateIso }).toArray();
    const res = [];

    for (const l of dayLists) {
      let crew = await db.crew.where({ listId: l.id }).toArray();
      crew = crew.filter(c => c.status !== 'EXCLUIDO');

      for (const c of crew) {
        const nome = String(c.nome || '').toLowerCase();
        const doc = String(c.documento || '').toLowerCase();
        const empresa = String(c.empresa || '').toLowerCase();
        const funcao = String(c.funcao || '').toLowerCase();
        const acesso = String(c.acesso || '').toLowerCase();
        const transporte = String(c.transporte || '').toLowerCase();

        if (
          nome.includes(s) ||
          doc.includes(s) ||
          empresa.includes(s) ||
          funcao.includes(s) ||
          acesso.includes(s) ||
          transporte.includes(s)
        ) {
          res.push({ crew: c, list: l });
          if (res.length >= 50) break;
        }
      }

      if (res.length >= 50) break;
    }

    setMatches(res);
  }

  useEffect(() => {
    search();
  }, [q, dateIso]);

  const stats = useMemo(() => {
    const totalListas = lists.length;
    const totalTripulantes = lists.reduce((acc, l) => acc + (l.total || 0), 0);
    const confirmados = lists.reduce((acc, l) => acc + (l.confirmados || 0), 0);
    const pendentes = lists.reduce((acc, l) => acc + (l.pendentes || 0), 0);

    const embarques = lists.filter(l => String(l.tipo || '').toUpperCase().includes('EMBARQUE')).length;
    const desembarques = lists.filter(l => String(l.tipo || '').toUpperCase().includes('DESEMBARQUE')).length;
    const saidas = lists.filter(l => {
      const t = String(l.tipo || '').toUpperCase();
      return t.includes('SAIDA PONTUAL') || t.includes('SAÍDA PONTUAL');
    }).length;

    return {
      totalListas,
      totalTripulantes,
      confirmados,
      pendentes,
      embarques,
      desembarques,
      saidas
    };
  }, [lists]);

  return (
    <div className="container">
      <div className="corpHeroMini">
        <div>
          <div className="heroEyebrow">Operação</div>
          <div className="sectionTitle bigTitle">Operação do Dia</div>
          <div className="small">Acompanhe listas, busque tripulantes e avance rápido na operação.</div>
        </div>

        <button className="btn primary" onClick={() => load(dateIso)}>
          Atualizar
        </button>
      </div>

      <div className="card corpPanel" style={{ marginTop: 16 }}>
        <div className="sectionTitle">Filtros</div>

        <div className="row" style={{ marginTop: 10 }}>
          <div className="col">
            <div className="label">Dia</div>
            <input
              className="input"
              type="date"
              value={dateIso}
              onChange={(e) => setDateIso(e.target.value)}
            />
          </div>

          <div className="col">
            <div className="label">Busca rápida</div>
            <div className="searchRow">
              <input
                className="input"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Nome, documento, empresa, função, acesso..."
              />
              <span className="pill">{matches.length} achados</span>
            </div>
          </div>
        </div>
      </div>

      <div className="card corpPanel" style={{ marginTop: 16 }}>
        <div className="sectionTitle">Resumo operacional</div>

        <div className="statsGrid">
          <div className="statCard softBlue emphasis">
            <div className="statNumber">{stats.totalListas}</div>
            <div className="statLabel">Listas</div>
          </div>

          <div className="statCard softGreen emphasis">
            <div className="statNumber">{stats.totalTripulantes}</div>
            <div className="statLabel">Tripulantes</div>
          </div>

          <div className="statCard softDark emphasis">
            <div className="statNumber">{stats.confirmados}</div>
            <div className="statLabel">Confirmados</div>
          </div>

          <div className="statCard softOrange emphasis">
            <div className="statNumber">{stats.pendentes}</div>
            <div className="statLabel">Pendentes</div>
          </div>
        </div>

        <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:14 }}>
          <span className="pill">Embarques: {stats.embarques}</span>
          <span className="pill">Desembarques: {stats.desembarques}</span>
          <span className="pill">Saídas pontuais: {stats.saidas}</span>
        </div>
      </div>

      {matches.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="sectionHeader">
            <div>
              <div className="sectionTitle">Resultados da busca</div>
              <div className="small">Clique para abrir a lista correspondente.</div>
            </div>
            <span className="pill">{matches.length} encontrados</span>
          </div>

          <div className="list">
            {matches.map((m, idx) => (
              <div key={idx} className="item" onClick={() => onOpenList(m.list)}>
                <div>
                  <div style={{ fontWeight: 900 }}>{m.crew.nome || 'Sem nome'}</div>
                  <div className="small">
                    {m.crew.documento || 'Sem documento'} • {m.crew.empresa || 'Sem empresa'}
                  </div>
                  <div className="small">
                    {m.crew.funcao || 'Sem função'} • {m.list.embarcacao || 'Sem navio'}
                  </div>
                  <div className="small">
                    {m.crew.acesso || 'Sem acesso'} • {m.crew.transporte || 'Sem transporte'}
                  </div>
                </div>

                <span className={motivacaoBadgeClass(m.list.tipo)}>
                  {tipoBonito(m.list.tipo)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="sectionHeader" style={{ marginTop: 16 }}>
        <div className="sectionTitle">Listas do dia</div>
        <span className="pill">{lists.length} listas</span>
      </div>

      <div className="listCards">
        {grouped.flatMap(([tipo, arr]) =>
          arr.map((l) => (
            <button key={l.id} className="listCard" onClick={() => onOpenList(l)}>
              <div className="listCardTop">
                <span className="softTag">{tipo}</span>
                <span className="small">{l.dataIso}</span>
              </div>

              <div className="listCardTitle">{l.embarcacao || 'Sem navio'}</div>

              <div className="listCardMeta">
                <span>Total: {l.total}</span>
                <span>Confirmados: {l.confirmados}</span>
                <span>Pendentes: {l.pendentes}</span>
              </div>
            </button>
          ))
        )}

        {lists.length === 0 && (
          <div className="card emptyStateCard">
            Nenhuma lista para este dia. Importe um Excel ou use Registro Manual.
          </div>
        )}
      </div>
    </div>
  );
}