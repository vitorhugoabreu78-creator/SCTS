import * as XLSX from "xlsx";
import { db } from "./db";

/*
  IMPORTADOR INTELIGENTE SCTS
  - aceita português e inglês
  - aceita colunas em ordem diferente
  - entende motivação:
      ARRIVAL -> EMBARQUE
      DEPARTURE / DESPATURE -> DESEMBARQUE
      SAÍDA PONTUAL -> SAÍDA PONTUAL
  - cria listas separadas por:
      NAVIO + DATA + MOTIVAÇÃO
*/

function normalizeText(v) {
  return String(v ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeKey(v) {
  return normalizeText(v)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function excelDateToIso(value) {
  if (value == null || value === "") return "";

  // já veio como texto
  if (typeof value === "string") {
    const txt = value.trim();

    // yyyy-mm-dd
    if (/^\d{4}-\d{2}-\d{2}$/.test(txt)) return txt;

    // dd/mm/yyyy
    const br = txt.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (br) {
      const [, dd, mm, yyyy] = br;
      return `${yyyy}-${mm}-${dd}`;
    }

    // dd-mm-yyyy
    const br2 = txt.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (br2) {
      const [, dd, mm, yyyy] = br2;
      return `${yyyy}-${mm}-${dd}`;
    }

    return txt;
  }

  // serial do Excel
  if (typeof value === "number") {
    const d = XLSX.SSF.parse_date_code(value);
    if (!d) return "";
    const yyyy = String(d.y).padStart(4, "0");
    const mm = String(d.m).padStart(2, "0");
    const dd = String(d.d).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  return "";
}

function normalizeHora(value) {
  if (value == null || value === "") return "";

  if (typeof value === "number") {
    // fração do dia no Excel
    const totalSeconds = Math.round(value * 24 * 60 * 60);
    const hh = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
    const mm = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
    return `${hh}:${mm}`;
  }

  const txt = normalizeText(value);

  // HH:mm ou HH:mm:ss
  const m = txt.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (m) {
    const hh = String(m[1]).padStart(2, "0");
    const mm = String(m[2]).padStart(2, "0");
    return `${hh}:${mm}`;
  }

  return txt;
}

function normalizeMotivacao(value) {
  const raw = normalizeKey(value);

  if (!raw) return "";

  if (
    raw === "embarque" ||
    raw.includes("arrival") ||
    raw.includes("embark")
  ) {
    return "EMBARQUE";
  }

  if (
    raw === "desembarque" ||
    raw.includes("departure") ||
    raw.includes("despature") ||
    raw.includes("disembark")
  ) {
    return "DESEMBARQUE";
  }

  if (
    raw === "saida pontual" ||
    raw === "saida" ||
    raw === "saida pontual portaria" ||
    raw.includes("shore leave") ||
    raw.includes("temporary exit")
  ) {
    return "SAÍDA PONTUAL";
  }

  return String(value ?? "").toUpperCase().trim();
}

function normalizeAcesso(value) {
  const raw = normalizeKey(value);

  if (!raw) return "";

  if (
    raw.includes("portaria terrestre") ||
    raw.includes("terrestrial gate") ||
    raw.includes("land gate")
  ) {
    return "PORTARIA TERRESTRE";
  }

  if (
    raw.includes("portaria maritima") ||
    raw.includes("portaria maritíma") ||
    raw.includes("maritime gate") ||
    raw.includes("sea gate")
  ) {
    return "PORTARIA MARÍTIMA";
  }

  return String(value ?? "").toUpperCase().trim();
}

function mapHeaderToField(header) {
  const h = normalizeKey(header);

  const map = {
    // navio
    "navio": "navio",
    "embarcacao": "navio",
    "vessel": "navio",
    "ship": "navio",
    "boat": "navio",

    // nome
    "nome": "nome",
    "nome completo": "nome",
    "full name": "nome",
    "name": "nome",
    "crew name": "nome",

    // documento
    "cpf": "documento",
    "documento": "documento",
    "document": "documento",
    "passport": "documento",
    "id": "documento",
    "rg": "documento",

    // função
    "funcao": "funcao",
    "função": "funcao",
    "role": "funcao",
    "rank": "funcao",
    "function": "funcao",
    "cargo": "funcao",

    // empresa
    "empresa": "empresa",
    "company": "empresa",
    "contractor": "empresa",

    // data
    "data": "data",
    "date": "data",

    // motivação
    "motivacao": "motivacao",
    "motivação": "motivacao",
    "motivo": "motivacao",
    "reason": "motivacao",
    "tipo": "motivacao",
    "arrival": "motivacao",
    "departure": "motivacao",
    "despature": "motivacao",

    // acesso
    "acesso": "acesso",
    "portaria": "acesso",
    "gate": "acesso",
    "entry gate": "acesso",
    "local de chegada": "acesso",

    // transporte
    "transporte": "transporte",
    "transport": "transporte",
    "vehicle": "transporte",
    "veiculo": "transporte",
    "veículo": "transporte",

    // tipo transporte
    "tipo transporte": "tipoTransporte",
    "tipo de transporte": "tipoTransporte",
    "transport type": "tipoTransporte",
    "vehicle type": "tipoTransporte",

    // placa
    "placa": "placa",
    "plate": "placa",
    "identificacao do veiculo": "placa",
    "identificação do veículo": "placa",
    "vehicle id": "placa",

    // observação
    "observacao": "observacao",
    "observação": "observacao",
    "observation": "observacao",
    "notes": "observacao",
    "note": "observacao",

    // controle
    "controle": "controle",
    "control": "controle",
    "numero de controle": "controle",
    "n de controle": "controle",

    // horas
    "hora de saida": "horaSaida",
    "hora de saída": "horaSaida",
    "exit time": "horaSaida",
    "departure time": "horaSaida",

    "hora de entrada": "horaEntrada",
    "entry time": "horaEntrada",
    "arrival time": "horaEntrada",
    "hora entrada": "horaEntrada"
  };

  return map[h] || null;
}

function normalizeRow(rawRow) {
  const row = {
    navio: "",
    nome: "",
    documento: "",
    funcao: "",
    empresa: "",
    dataIso: "",
    motivacao: "",
    acesso: "",
    transporte: "",
    tipoTransporte: "",
    placa: "",
    observacao: "",
    controle: "",
    horaSaida: "",
    horaEntrada: ""
  };

  for (const [k, v] of Object.entries(rawRow)) {
    const field = mapHeaderToField(k);
    if (!field) continue;

    if (field === "data") {
      row.dataIso = excelDateToIso(v);
    } else if (field === "motivacao") {
      row.motivacao = normalizeMotivacao(v);
    } else if (field === "acesso") {
      row.acesso = normalizeAcesso(v);
    } else if (field === "horaSaida") {
      row.horaSaida = normalizeHora(v);
    } else if (field === "horaEntrada") {
      row.horaEntrada = normalizeHora(v);
    } else {
      row[field] = normalizeText(v);
    }
  }

  return row;
}

function isMeaningfulRow(row) {
  return !!(
    row.nome ||
    row.documento ||
    row.navio ||
    row.motivacao
  );
}

function listKey(row) {
  return `${row.navio}|||${row.dataIso}|||${row.motivacao}`;
}

async function getOrCreateList(row, sourceFilename = "") {
  const existing = await db.lists
    .where({
      embarcacao: row.navio,
      tipo: row.motivacao,
      dataIso: row.dataIso
    })
    .first();

  if (existing) return existing;

  const id = await db.lists.add({
    embarcacao: row.navio,
    tipo: row.motivacao,
    dataIso: row.dataIso,
    sourceFilename
  });

  return {
    id,
    embarcacao: row.navio,
    tipo: row.motivacao,
    dataIso: row.dataIso,
    sourceFilename
  };
}

async function insertCrewIfNotExists(listId, row) {
  const existing = await db.crew
    .where({
      listId,
      documento: row.documento
    })
    .first();

  if (existing) return false;

  await db.crew.add({
    listId,
    nome: row.nome,
    documento: row.documento,
    empresa: row.empresa,
    funcao: row.funcao,
    motivacao: row.motivacao,
    acesso: row.acesso,
    transporte: row.transporte,
    tipoTransporte: row.tipoTransporte,
    placa: row.placa,
    observacao: row.observacao,
    controle: row.controle,
    horaSaida: row.horaSaida,
    horaEntrada: row.horaEntrada,
    status: "PENDENTE"
  });

  return true;
}

export async function importExcelFile(file) {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: "array" });

  let crewInserted = 0;
  const warnings = [];
  const seenLists = new Set();

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, {
      defval: "",
      raw: true
    });

    for (const rawRow of rows) {
      const row = normalizeRow(rawRow);

      if (!isMeaningfulRow(row)) continue;

      if (!row.nome && !row.documento) {
        warnings.push(`Linha ignorada em "${sheetName}": sem nome e sem documento.`);
        continue;
      }

      if (!row.navio) {
        warnings.push(`Linha ignorada em "${sheetName}": sem navio/embarcação (${row.nome || row.documento}).`);
        continue;
      }

      if (!row.dataIso) {
        warnings.push(`Linha ignorada em "${sheetName}": sem data (${row.nome || row.documento}).`);
        continue;
      }

      if (!row.motivacao) {
        warnings.push(`Linha ignorada em "${sheetName}": sem motivação/arrival/departure (${row.nome || row.documento}).`);
        continue;
      }

      const list = await getOrCreateList(row, file.name);
      seenLists.add(listKey(row));

      const inserted = await insertCrewIfNotExists(list.id, row);
      if (inserted) crewInserted++;
    }
  }

  return {
    crewInserted,
    listsCreatedOrFound: seenLists.size,
    warnings
  };
}