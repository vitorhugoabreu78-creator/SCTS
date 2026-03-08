import React, { useEffect, useMemo, useRef, useState } from 'react';
import { db } from '../db';
import { importExcelFile } from '../excelImport';
import { nowIsoDate } from '../lib';

export function Home({ go }) {
  const [dateIso, setDateIso] = useState(nowIsoDate());
  const [stats, setStats] = useState({ lists: 0, pending: 0, confirmed: 0, manual: 0 });
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);

  async function compute(d=dateIso){
    const lists = await db.lists.where({ dataIso: d }).toArray();
    let total = 0, confirmed = 0, manual = 0;
    for (const l of lists){
      const crew = await db.crew.where({ listId: l.id }).toArray();
      total += crew.length;
      confirmed += crew.filter(c => c.status === 'CONFIRMADO').length;
      if ((l.tipo||'').includes('(MANUAL)')) manual += crew.length;
    }
    const pending = Math.max(0, total - confirmed);
    setStats({ lists: lists.length, pending, confirmed, manual });
  }

  useEffect(()=>{ compute(dateIso); }, [dateIso]);

  async function pickExcel(e){
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true); setMsg('');
    try{
      const res = await importExcelFile(file);
      await compute(dateIso);
      setMsg(`Importado: ${res.crewInserted} tripulantes / ${res.listsCreatedOrFound} listas.`);
      if (res.warnings?.length) alert(res.warnings.join('\n\n'));
    }catch(err){
      setMsg('Erro ao importar: ' + (err?.message ?? String(err)));
    }finally{
      setBusy(false);
    }
  }

  const badge = useMemo(()=>{
    if (stats.pending === 0 && stats.lists > 0) return { cls: 'badge ok', text: 'Tudo confirmado ✅' };
    if (stats.lists === 0) return { cls: 'badge', text: 'Sem listas' };
    return { cls: 'badge', text: `${stats.pending} pendentes` };
  }, [stats]);

  return (
    <div className="container">
      <div className="card">
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:10, flexWrap:'wrap'}}>
          <div>
            <div style={{fontSize:18, fontWeight:1000}}>SCTS • Início</div>
            <div className="small">Importe listas, veja pendências e registre com foto (offline).</div>
          </div>
          <span className={badge.cls}>{badge.text}</span>
        </div>

        <div className="hr"></div>

        <div className="row">
          <div className="col">
            <div className="label">Dia</div>
            <input className="input" type="date" value={dateIso} onChange={(e)=>setDateIso(e.target.value)} />
          </div>
          <div className="col">
            <div className="label">Resumo do dia</div>
            <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
              <span className="pill">{stats.lists} listas</span>
              <span className="pill">{stats.confirmed} confirmados</span>
              <span className="pill">{stats.pending} pendentes</span>
              <span className="pill">{stats.manual} manuais</span>
            </div>
          </div>
        </div>

        <div style={{height:12}} />

        <div className="heroActions">
          <div className="heroCard primary" onClick={()=> fileRef.current?.click()}>
            <div className="heroTitle">📥 IMPORTAR LISTA (Excel)</div>
            <div className="heroDesc">{busy ? 'Importando...' : 'Toque aqui e selecione o arquivo .xlsx'}</div>
            <input ref={fileRef} type="file" accept=".xlsx" style={{display:'none'}} onChange={pickExcel} disabled={busy}/>
          </div>

          <div className="heroCard" onClick={()=>go(1)}>
            <div className="heroTitle">🧭 Operação do dia</div>
            <div className="heroDesc">Abrir listas do dia, buscar por nome/documento e ver pendências.</div>
          </div>

          <div className="heroCard" onClick={()=>go(2)}>
            <div className="heroTitle">📋 Listas</div>
            <div className="heroDesc">Ver todas as listas, inclusive as manuais, e exportar.</div>
          </div>

          <div className="heroCard" onClick={()=>go(3)}>
            <div className="heroTitle">✍️ Registro Manual</div>
            <div className="heroDesc">Para tripulante fora da lista. Cria lista automática “(MANUAL)”.</div>
          </div>

          <div className="heroCard" onClick={()=>go(4)}>
            <div className="heroTitle">🧾 Registros</div>
            <div className="heroDesc">Ver resumo com foto, exportar por dia/tipo/lista e lixeira.</div>
          </div>

          <div className="heroCard" onClick={()=>go(5)}>
            <div className="heroTitle">📊 Dashboard</div>
            <div className="heroDesc">Indicadores rápidos e filtro por data.</div>
          </div>
        </div>

        {msg && <div className="notice ok" style={{marginTop:12}}>{msg}</div>}
      </div>

      <div className="notice" style={{marginTop:12}}>
        No celular: <b>Chrome → ⋮ → Adicionar à tela inicial</b> para usar como app.
      </div>
    </div>
  );
}
