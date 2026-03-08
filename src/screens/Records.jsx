import React, { useEffect, useMemo, useState } from 'react';
import { db } from '../db';
import { nowIsoDate } from '../lib';
import { Modal } from '../components/Modal';
import { exportarExcelBonito } from '../excelExportBonito';
import { supabase } from '../supabaseClient';

function inRange(d, from, to){
  if (!d) return false;
  return (!from || d >= from) && (!to || d <= to);
}

function normalizeRange(dateFrom, dateTo){
  if (!dateFrom && !dateTo) return { from: null, to: null };
  if (!dateFrom) return { from: null, to: dateTo };
  if (!dateTo) return { from: dateFrom, to: null };
  return dateFrom <= dateTo ? { from: dateFrom, to: dateTo } : { from: dateTo, to: dateFrom };
}

function extractStoragePathFromPhotoUrl(photoUrl){
  if (!photoUrl) return null;

  const marker = '/storage/v1/object/public/checkin-photos/';
  const idx = photoUrl.indexOf(marker);

  if (idx >= 0) {
    const path = photoUrl.slice(idx + marker.length);
    return path || null;
  }

  try {
    const url = new URL(photoUrl);
    const parts = url.pathname.split('/object/public/checkin-photos/');
    if (parts[1]) return parts[1];
  } catch (_) {}

  return null;
}

async function markForPermanentCloudDeletion({ checkinCloudId, crewCloudId, photoUrl }) {

  if (!supabase) {
    console.warn('Supabase não configurado. Exclusão apenas local.');
    return;
  }

  const errors = [];

  if (checkinCloudId) {

    const { error } = await supabase
      .from('checkins')
      .delete()
      .eq('id', checkinCloudId);

    if (error) errors.push(`checkins: ${error.message}`);

  }

  if (crewCloudId) {

    const { error } = await supabase
      .from('crew')
      .delete()
      .eq('id', crewCloudId);

    if (error) errors.push(`crew: ${error.message}`);

  }

  const photoPath = extractStoragePathFromPhotoUrl(photoUrl);

  if (photoPath) {

    const { error } = await supabase
      .storage
      .from('checkin-photos')
      .remove([photoPath]);

    if (error) errors.push(`foto: ${error.message}`);

  }

  if (errors.length) {
    throw new Error(errors.join(' | '));
  }

}

export function Records({ userRole }) {

  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(null);

  const [tipoFilter, setTipoFilter] = useState('TODOS');

  const [dateFrom, setDateFrom] = useState(nowIsoDate());
  const [dateTo, setDateTo] = useState(nowIsoDate());

  const [useRange, setUseRange] = useState(false);

  const [listFilter, setListFilter] = useState('TODAS');
  const [showTrash, setShowTrash] = useState(false);

  const [confirmDel, setConfirmDel] = useState(null);
  const [confirmText, setConfirmText] = useState('');

  const [confirmHardDel, setConfirmHardDel] = useState(null);
  const [hardDelText, setHardDelText] = useState('');

  const [toast, setToast] = useState(null);

  async function load(){

    const r = await db.checkins
      .orderBy('id')
      .reverse()
      .toArray();

    setRows(r);

  }

  useEffect(() => {
    load();
  }, []);

  const listOptions = useMemo(() => {

    const m = new Map();

    for (const r of rows) {

      const key = r.listId ? String(r.listId) : 'MANUAL';

      const label = r.listId
        ? `${r.tipo} • ${r.embarcacao} • ${r.dataIso}`
        : `MANUAL • ${r.tipo} • ${r.embarcacao} • ${r.dataIso}`;

      if (!m.has(key)) m.set(key, label);

    }

    const arr = Array
      .from(m.entries())
      .map(([value, label]) => ({ value, label }));

    arr.sort((a, b) => a.label.localeCompare(b.label));

    return arr;

  }, [rows]);

  const filtered = useMemo(() => {

    const norm = normalizeRange(dateFrom, dateTo);

    return rows.filter(r => {

      if (!showTrash && r.isDeleted) return false;
      if (showTrash && !r.isDeleted) return false;

      if (tipoFilter !== 'TODOS' && (r.motivacao || r.tipo) !== tipoFilter) return false;

      if (!useRange) {

        if (r.dataIso !== dateFrom) return false;

      } else {

        if (!inRange(r.dataIso, norm.from, norm.to)) return false;

      }

      if (listFilter !== 'TODAS') {

        if (listFilter === 'MANUAL') return !r.listId;

        return String(r.listId ?? '') === String(listFilter);

      }

      return true;

    });

  }, [rows, tipoFilter, dateFrom, dateTo, useRange, listFilter, showTrash]);

  async function exportExcelAtual(){
    await exportarExcelBonito(filtered.filter(r => !r.isDeleted));
  }

  function askDelete(rec){

    setConfirmText('');
    setConfirmDel(rec);

  }

  async function doDelete(rec){

    await db.checkins.update(rec.id, {

      isDeleted: true,
      deletedAt: new Date().toISOString(),
      syncStatus: 'LOCAL'

    });

    setSelected(null);
    setConfirmDel(null);

    setToast({

      id: rec.id,
      message: 'Registro movido para a lixeira.'

    });

    await load();

  }

  function askHardDelete(rec){

    if (userRole !== "SUPERVISOR") {

      alert("Apenas supervisor pode excluir permanentemente.");
      return;

    }

    setHardDelText('');
    setConfirmHardDel(rec);

  }

  async function doHardDelete(rec){

    try {

      await markForPermanentCloudDeletion({

        checkinCloudId: rec.cloudId || null,
        crewCloudId: null,
        photoUrl: rec.photoUrl || null

      });

      await db.checkins.delete(rec.id);

      setSelected(null);
      setConfirmHardDel(null);

      setToast({

        id: null,
        message: 'Registro excluído permanentemente.'

      });

      await load();

    } catch (err) {

      console.error(err);

      setToast({

        id: null,
        message: 'Erro ao excluir permanentemente'

      });

    }

  }

  return (
    <div className="container">

      <div className="corpHeroMini">

        <div>

          <div className="heroEyebrow">Registros</div>

          <div className="sectionTitle bigTitle">
            Consulta de Registros
          </div>

          <div className="small">
            Filtre, revise, restaure ou exclua registros.
          </div>

        </div>

        <div style={{ display:'flex', gap:8 }}>

          <button className="btn" onClick={load}>
            Atualizar
          </button>

          <button
            className={showTrash ? 'btn primary' : 'btn'}
            onClick={() => setShowTrash(v => !v)}
          >
            {showTrash ? 'Ver ativos' : 'Ver lixeira'}
          </button>

        </div>

      </div>

      <div className="sectionHeader" style={{ marginTop:16 }}>

        <div className="sectionTitle">
          Resultados
        </div>

        <span className="pill">
          {filtered.length} registros
        </span>

      </div>

      <div className="list">

        {filtered.map(r => (

          <div
            className="item"
            key={r.id}
            onClick={() => setSelected(r)}
          >

            <div>

              <div style={{fontWeight:900}}>
                {r.motivacao || r.tipo} • {r.embarcacao}
              </div>

              <div className="small">
                {r.nome} • {r.documento}
              </div>

              <div className="small">
                {r.dataIso} {r.hora}
              </div>

            </div>

          </div>

        ))}

      </div>

      {selected && (

        <Modal
          title="Resumo do registro"
          onClose={() => setSelected(null)}
        >

          <div className="label">Nome</div>
          <div>{selected.nome}</div>

          <div className="label">Documento</div>
          <div>{selected.documento}</div>

          <div className="label">Foto</div>

          <div className="photoBox">

            {selected.photoUrl
              ? <img src={selected.photoUrl} alt="foto"/>
              : <div className="small">Sem foto</div>}

          </div>

          <div className="hr"></div>

          {showTrash ? (

            <div className="row">

              <button
                className="btn"
                onClick={() => setSelected(null)}
              >
                Fechar
              </button>

              {userRole === "SUPERVISOR" && (

                <button
                  className="btn danger"
                  onClick={() => askHardDelete(selected)}
                >
                  Excluir permanente
                </button>

              )}

            </div>

          ) : (

            <button
              className="btn danger"
              onClick={() => askDelete(selected)}
            >
              Apagar (mover para lixeira)
            </button>

          )}

        </Modal>

      )}

    </div>
  );

}