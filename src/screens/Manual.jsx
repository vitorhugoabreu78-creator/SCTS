import React, { useRef, useState } from "react";
import { db } from "../db";
import { nowIsoDate } from "../lib";

function normalizeText(v){
  return String(v ?? "").trim();
}

function normalizeMotivacao(v){
  const raw = normalizeText(v).toUpperCase();

  if (!raw) return "";
  if (raw.includes("ARRIVAL") || raw === "EMBARQUE") return "EMBARQUE";
  if (raw.includes("DEPARTURE") || raw.includes("DESPATURE") || raw === "DESEMBARQUE") return "DESEMBARQUE";
  if (raw.includes("SAIDA PONTUAL") || raw.includes("SAÍDA PONTUAL")) return "SAÍDA PONTUAL";

  return raw;
}

function normalizeAcesso(v){
  const raw = normalizeText(v).toUpperCase();

  if (!raw) return "";

  if (raw.includes("PORTARIA TERRESTRE") || raw.includes("TERRESTRIAL GATE") || raw.includes("LAND GATE")) {
    return "PORTARIA TERRESTRE";
  }

  if (raw.includes("PORTARIA MARITIMA") || raw.includes("PORTARIA MARÍTIMA") || raw.includes("MARITIME GATE") || raw.includes("SEA GATE")) {
    return "PORTARIA MARÍTIMA";
  }

  return raw;
}

function nowTimeHHMM(){
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

async function getOrCreateManualList({ embarcacao, dataIso, motivacao }){
  const tipo = `${motivacao} (MANUAL)`;

  const existing = await db.lists.where({
    embarcacao,
    tipo,
    dataIso
  }).first();

  if (existing) return existing;

  const id = await db.lists.add({
    embarcacao,
    tipo,
    dataIso
  });

  return { id, embarcacao, tipo, dataIso };
}

async function documentoJaExiste(documento){
  const doc = normalizeText(documento);
  if (!doc) return 0;

  const all = await db.checkins.toArray();
  return all.filter(r => !r.isDeleted && normalizeText(r.documento) === doc).length;
}

export function Manual({ pin }){
  const fileRef = useRef(null);

  const [form, setForm] = useState({
    navio: "",
    nome: "",
    documento: "",
    funcao: "",
    empresa: "",
    dataIso: nowIsoDate(),
    motivacao: "EMBARQUE",
    acesso: "",
    transporte: "",
    tipoTransporte: "",
    placa: "",
    observacao: "",
    controle: "",
    horaSaida: "",
    horaEntrada: nowTimeHHMM()
  });

  const [photoUrl, setPhotoUrl] = useState("");
  const [saving, setSaving] = useState(false);

  function setField(field, value){
    setForm(prev => ({ ...prev, [field]: value }));
  }

  function onPickPhoto(e){
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => setPhotoUrl(String(reader.result));
    reader.readAsDataURL(file);
  }

  async function handleSave(){
    if (saving) return;

    const payload = {
      navio: normalizeText(form.navio),
      nome: normalizeText(form.nome),
      documento: normalizeText(form.documento),
      funcao: normalizeText(form.funcao),
      empresa: normalizeText(form.empresa),
      dataIso: normalizeText(form.dataIso),
      motivacao: normalizeMotivacao(form.motivacao),
      acesso: normalizeAcesso(form.acesso),
      transporte: normalizeText(form.transporte),
      tipoTransporte: normalizeText(form.tipoTransporte),
      placa: normalizeText(form.placa),
      observacao: normalizeText(form.observacao),
      controle: normalizeText(form.controle),
      horaSaida: normalizeText(form.horaSaida),
      horaEntrada: normalizeText(form.horaEntrada)
    };

    if (!payload.navio) return alert("Informe o navio/embarcação.");
    if (!payload.nome) return alert("Informe o nome completo.");
    if (!payload.documento) return alert("Informe o CPF/documento.");
    if (!payload.empresa) return alert("Informe a empresa.");
    if (!payload.dataIso) return alert("Informe a data.");
    if (!payload.motivacao) return alert("Informe a motivação.");
    if (!photoUrl) return alert("Tire ou anexe uma foto antes de salvar.");

    const repetidos = await documentoJaExiste(payload.documento);
    if (repetidos > 0) {
      const ok = window.confirm(
        `Atenção: este documento já aparece ${repetidos} vez(es) no sistema. Deseja continuar mesmo assim?`
      );
      if (!ok) return;
    }

    setSaving(true);

    try{
      const list = await getOrCreateManualList({
        embarcacao: payload.navio,
        dataIso: payload.dataIso,
        motivacao: payload.motivacao
      });

      const crewId = await db.crew.add({
        listId: list.id,
        nome: payload.nome,
        documento: payload.documento,
        empresa: payload.empresa,
        funcao: payload.funcao,
        motivacao: payload.motivacao,
        acesso: payload.acesso,
        transporte: payload.transporte,
        tipoTransporte: payload.tipoTransporte,
        placa: payload.placa,
        observacao: payload.observacao,
        controle: payload.controle,
        horaSaida: payload.horaSaida,
        horaEntrada: payload.horaEntrada,
        status: "CONFIRMADO",
        confirmedAt: new Date().toISOString()
      });

      await db.checkins.add({
        nome: payload.nome,
        documento: payload.documento,
        empresa: payload.empresa,
        embarcacao: payload.navio,
        navio: payload.navio,
        funcao: payload.funcao,
        motivacao: payload.motivacao,
        acesso: payload.acesso,
        transporte: payload.transporte,
        tipoTransporte: payload.tipoTransporte,
        placa: payload.placa,
        observacao: payload.observacao,
        controle: payload.controle,
        horaSaida: payload.horaSaida,
        horaEntrada: payload.horaEntrada,
        tipo: `${payload.motivacao} (MANUAL)`,
        dataIso: payload.dataIso,
        hora: payload.horaEntrada || nowTimeHHMM(),
        photoUrl,
        vigilantePin: pin,
        listId: list.id,
        crewId,
        syncStatus: "LOCAL",
        isDeleted: false,
        deletedAt: null
      });

      alert("Registro manual salvo com sucesso.");

      setForm({
        navio: "",
        nome: "",
        documento: "",
        funcao: "",
        empresa: "",
        dataIso: nowIsoDate(),
        motivacao: "EMBARQUE",
        acesso: "",
        transporte: "",
        tipoTransporte: "",
        placa: "",
        observacao: "",
        controle: "",
        horaSaida: "",
        horaEntrada: nowTimeHHMM()
      });

      setPhotoUrl("");
    }catch(err){
      console.error(err);
      alert("Erro ao salvar registro manual.");
    }finally{
      setSaving(false);
    }
  }

  return (
    <div className="container">
      <div className="corpHeroMini">
        <div>
          <div className="heroEyebrow">Manual</div>
          <div className="sectionTitle bigTitle">Registro Manual</div>
          <div className="small">Use quando o tripulante não vier na planilha. O sistema cria uma lista manual automaticamente.</div>
        </div>
      </div>

      <div className="formSectionGrid" style={{ marginTop: 16 }}>
        <div className="card corpPanel">
          <div className="sectionTitle">Dados principais</div>

          <div className="row" style={{ marginTop: 10 }}>
            <div className="col">
              <div className="label">Navio / Embarcação *</div>
              <input className="input" value={form.navio} onChange={(e)=>setField("navio", e.target.value)} placeholder="Ex: BRAVANTE II" />
            </div>

            <div className="col">
              <div className="label">Data *</div>
              <input className="input" type="date" value={form.dataIso} onChange={(e)=>setField("dataIso", e.target.value)} />
            </div>
          </div>

          <div className="row">
            <div className="col">
              <div className="label">Nome completo *</div>
              <input className="input" value={form.nome} onChange={(e)=>setField("nome", e.target.value)} placeholder="Nome completo" />
            </div>

            <div className="col">
              <div className="label">CPF / Documento *</div>
              <input className="input" value={form.documento} onChange={(e)=>setField("documento", e.target.value)} placeholder="CPF, passaporte ou outro documento" />
            </div>
          </div>

          <div className="row">
            <div className="col">
              <div className="label">Função</div>
              <input className="input" value={form.funcao} onChange={(e)=>setField("funcao", e.target.value)} placeholder="Ex: Marinheiro, Comandante..." />
            </div>

            <div className="col">
              <div className="label">Empresa *</div>
              <input className="input" value={form.empresa} onChange={(e)=>setField("empresa", e.target.value)} placeholder="Empresa" />
            </div>
          </div>

          <div className="row">
            <div className="col">
              <div className="label">Motivação *</div>
              <select className="input" value={form.motivacao} onChange={(e)=>setField("motivacao", e.target.value)}>
                <option value="EMBARQUE">EMBARQUE</option>
                <option value="DESEMBARQUE">DESEMBARQUE</option>
                <option value="SAÍDA PONTUAL">SAÍDA PONTUAL</option>
              </select>
            </div>

            <div className="col">
              <div className="label">Acesso</div>
              <select className="input" value={form.acesso} onChange={(e)=>setField("acesso", e.target.value)}>
                <option value="">Selecione</option>
                <option value="PORTARIA TERRESTRE">PORTARIA TERRESTRE</option>
                <option value="PORTARIA MARÍTIMA">PORTARIA MARÍTIMA</option>
              </select>
            </div>
          </div>
        </div>

        <div className="card corpPanel">
          <div className="sectionTitle">Logística e foto</div>

          <div className="row" style={{ marginTop: 10 }}>
            <div className="col">
              <div className="label">Transporte</div>
              <input className="input" value={form.transporte} onChange={(e)=>setField("transporte", e.target.value)} placeholder="Ex: veículo terceirizado" />
            </div>

            <div className="col">
              <div className="label">Tipo de transporte</div>
              <input className="input" value={form.tipoTransporte} onChange={(e)=>setField("tipoTransporte", e.target.value)} placeholder="Ex: Van, Carro, Barco" />
            </div>
          </div>

          <div className="row">
            <div className="col">
              <div className="label">Placa / Identificação</div>
              <input className="input" value={form.placa} onChange={(e)=>setField("placa", e.target.value)} placeholder="Placa ou identificação" />
            </div>

            <div className="col">
              <div className="label">Controle</div>
              <input className="input" value={form.controle} onChange={(e)=>setField("controle", e.target.value)} placeholder="Número de controle" />
            </div>
          </div>

          <div className="row">
            <div className="col">
              <div className="label">Hora de saída</div>
              <input className="input" type="time" value={form.horaSaida} onChange={(e)=>setField("horaSaida", e.target.value)} />
            </div>

            <div className="col">
              <div className="label">Hora de entrada</div>
              <input className="input" type="time" value={form.horaEntrada} onChange={(e)=>setField("horaEntrada", e.target.value)} />
            </div>
          </div>

          <div className="label">Observação</div>
          <textarea className="input" rows={4} value={form.observacao} onChange={(e)=>setField("observacao", e.target.value)} placeholder="Observações adicionais" style={{resize:"vertical"}} />

          <div className="hr"></div>

          <div className="label">Foto do tripulante *</div>

          {!photoUrl && (
            <div>
              <button className="btn" onClick={() => fileRef.current?.click()}>
                📸 Tirar / Anexar Foto
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                style={{display:"none"}}
                onChange={onPickPhoto}
              />
            </div>
          )}

          {photoUrl && (
            <div>
              <div className="photoBox" style={{marginBottom:10}}>
                <img src={photoUrl} alt="Foto do tripulante" />
              </div>

              <div style={{display:"flex", gap:8, flexWrap:"wrap"}}>
                <button className="btn" onClick={() => fileRef.current?.click()}>
                  Refazer Foto
                </button>
                <button className="btn danger" onClick={() => setPhotoUrl("")}>
                  Remover Foto
                </button>
              </div>

              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                style={{display:"none"}}
                onChange={onPickPhoto}
              />
            </div>
          )}

          <div className="hr"></div>

          <button className="btn primary wideBtn" onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : "Salvar Registro Manual"}
          </button>
        </div>
      </div>
    </div>
  );
}