import ExcelJS from "exceljs";

function normalizeText(v) {
  return String(v ?? "").trim();
}

function normalizeMotivacao(v) {
  const raw = normalizeText(v).toUpperCase();

  if (!raw) return "";

  // inglês / português
  if (
    raw.includes("ARRIVAL") ||
    raw === "EMBARQUE" ||
    raw.includes("EMBARK")
  ) {
    return "EMBARQUE";
  }

  if (
    raw.includes("DEPARTURE") ||
    raw.includes("DESPATURE") ||
    raw === "DESEMBARQUE" ||
    raw.includes("DISEMBARK") ||
    raw.includes("DISembark".toUpperCase())
  ) {
    return "DESEMBARQUE";
  }

  if (
    raw.includes("SAIDA PONTUAL") ||
    raw.includes("SAÍDA PONTUAL") ||
    raw.includes("TEMPORARY EXIT") ||
    raw.includes("SHORE LEAVE")
  ) {
    return "SAÍDA PONTUAL";
  }

  return raw;
}

function normalizeAcesso(v) {
  const raw = normalizeText(v).toUpperCase();

  if (!raw) return "";

  if (
    raw.includes("PORTARIA TERRESTRE") ||
    raw.includes("TERRESTRIAL GATE") ||
    raw.includes("LAND GATE")
  ) {
    return "PORTARIA TERRESTRE";
  }

  if (
    raw.includes("PORTARIA MARITIMA") ||
    raw.includes("PORTARIA MARÍTIMA") ||
    raw.includes("MARITIME GATE") ||
    raw.includes("SEA GATE")
  ) {
    return "PORTARIA MARÍTIMA";
  }

  return raw;
}

function getRegistroFormatado(r) {
  return {
    navio: normalizeText(r.navio || r.embarcacao || r.vessel),
    nome: normalizeText(r.nome || r.nomeCompleto || r.fullName),
    documento: normalizeText(r.documento || r.cpf || r.passaporte || r.id),
    funcao: normalizeText(r.funcao || r.função || r.rank || r.role),
    empresa: normalizeText(r.empresa || r.company),
    data: normalizeText(r.dataIso || r.data || r.date),
    motivacao: normalizeMotivacao(r.motivacao || r.tipo || r.reason),
    acesso: normalizeAcesso(r.acesso || r.portaria || r.gate),
    transporte: normalizeText(r.transporte || r.vehicle || r.transport),
    tipoTransporte: normalizeText(r.tipoTransporte || r.vehicleType || r.transportType),
    placa: normalizeText(r.placa || r.vehicleId || r.identificacaoVeiculo),
    observacao: normalizeText(r.observacao || r.observação || r.notes),
    controle: normalizeText(r.controle || r.control),
    horaSaida: normalizeText(r.horaSaida || r.exitTime),
    horaEntrada: normalizeText(r.horaEntrada || r.entryTime || r.hora),
    vigilante: normalizeText(r.vigilantePin ? `PIN ${r.vigilantePin}` : r.vigilante || ""),
  };
}

function styleHeaderRow(row) {
  row.eachCell((cell) => {
    cell.font = {
      bold: true,
      color: { argb: "FFFFFFFF" },
      size: 11,
    };

    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF0B3D91" },
    };

    cell.alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };

    cell.border = {
      top: { style: "thin", color: { argb: "FFD9E2EC" } },
      left: { style: "thin", color: { argb: "FFD9E2EC" } },
      bottom: { style: "thin", color: { argb: "FFD9E2EC" } },
      right: { style: "thin", color: { argb: "FFD9E2EC" } },
    };
  });
}

function styleDataRows(sheet, startRow, endRow) {
  for (let i = startRow; i <= endRow; i++) {
    const row = sheet.getRow(i);

    row.eachCell((cell) => {
      cell.alignment = {
        vertical: "middle",
        horizontal: "left",
        wrapText: true,
      };

      cell.border = {
        top: { style: "thin", color: { argb: "FFE5E7EB" } },
        left: { style: "thin", color: { argb: "FFE5E7EB" } },
        bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
        right: { style: "thin", color: { argb: "FFE5E7EB" } },
      };

      // zebra
      if (i % 2 === 0) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF8FAFC" },
        };
      }
    });
  }
}

function autoFitColumns(sheet) {
  sheet.columns.forEach((column) => {
    let maxLength = 12;

    column.eachCell({ includeEmpty: true }, (cell) => {
      const cellValue = cell.value ? String(cell.value) : "";
      maxLength = Math.max(maxLength, Math.min(cellValue.length + 2, 35));
    });

    column.width = maxLength;
  });
}

async function getLogoBuffer() {
  try {
    const response = await fetch("/logo_scts.png");
    if (!response.ok) return null;
    const blob = await response.blob();
    return await blob.arrayBuffer();
  } catch {
    return null;
  }
}

function addTitulo(sheet, titulo) {
  sheet.mergeCells("C1:J2");
  const titleCell = sheet.getCell("C1");
  titleCell.value = titulo;
  titleCell.font = {
    size: 18,
    bold: true,
    color: { argb: "FF0B3D91" },
  };
  titleCell.alignment = {
    vertical: "middle",
    horizontal: "left",
  };
}

function addCabecalho(sheet) {
  const headers = [
    "NAVIO",
    "NOME COMPLETO",
    "CPF / DOCUMENTO",
    "FUNÇÃO",
    "EMPRESA",
    "DATA",
    "MOTIVAÇÃO",
    "ACESSO",
    "TRANSPORTE",
    "TIPO TRANSPORTE",
    "PLACA",
    "OBSERVAÇÃO",
    "CONTROLE",
    "HORA SAÍDA",
    "HORA ENTRADA",
    "VIGILANTE",
  ];

  const row = sheet.getRow(4);
  row.values = headers;
  row.height = 24;

  styleHeaderRow(row);

  return headers.length;
}

function addRegistros(sheet, registrosFormatados) {
  let rowIndex = 5;

  registrosFormatados.forEach((r) => {
    const row = sheet.getRow(rowIndex);

    row.values = [
      r.navio,
      r.nome,
      r.documento,
      r.funcao,
      r.empresa,
      r.data,
      r.motivacao,
      r.acesso,
      r.transporte,
      r.tipoTransporte,
      r.placa,
      r.observacao,
      r.controle,
      r.horaSaida,
      r.horaEntrada,
      r.vigilante,
    ];

    rowIndex++;
  });

  if (rowIndex > 5) {
    styleDataRows(sheet, 5, rowIndex - 1);
  }

  return rowIndex - 1;
}

function prepararPlanilha(sheet, titulo, workbook, imageId, registrosFormatados) {
  if (imageId) {
    sheet.addImage(imageId, {
      tl: { col: 0, row: 0 },
      ext: { width: 330, height: 70 },
    });
  }

  addTitulo(sheet, titulo);

  const totalCols = addCabecalho(sheet);
  const lastRow = addRegistros(sheet, registrosFormatados);

  sheet.autoFilter = {
    from: "A4",
    to: `${String.fromCharCode(64 + totalCols)}4`,
  };

  sheet.views = [{ state: "frozen", ySplit: 4 }];

  // documento como texto
  sheet.getColumn(3).numFmt = "@";
  // placa como texto
  sheet.getColumn(11).numFmt = "@";

  autoFitColumns(sheet);

  // dar uma largura boa pra algumas colunas fixas
  sheet.getColumn(2).width = 28; // nome
  sheet.getColumn(4).width = 18; // função
  sheet.getColumn(5).width = 22; // empresa
  sheet.getColumn(7).width = 18; // motivação
  sheet.getColumn(8).width = 20; // acesso
  sheet.getColumn(12).width = 24; // observação

  return lastRow;
}

function criarResumo(sheet, registrosFormatados, workbook, imageId) {
  if (imageId) {
    sheet.addImage(imageId, {
      tl: { col: 0, row: 0 },
      ext: { width: 330, height: 70 },
    });
  }

  addTitulo(sheet, "SCTS — RESUMO OPERACIONAL");

  const total = registrosFormatados.length;
  const embarques = registrosFormatados.filter(r => r.motivacao === "EMBARQUE").length;
  const desembarques = registrosFormatados.filter(r => r.motivacao === "DESEMBARQUE").length;
  const saidas = registrosFormatados.filter(r => r.motivacao === "SAÍDA PONTUAL").length;

  const topNavios = {};
  const topEmpresas = {};

  registrosFormatados.forEach(r => {
    if (r.navio) topNavios[r.navio] = (topNavios[r.navio] || 0) + 1;
    if (r.empresa) topEmpresas[r.empresa] = (topEmpresas[r.empresa] || 0) + 1;
  });

  const naviosOrdenados = Object.entries(topNavios).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const empresasOrdenadas = Object.entries(topEmpresas).sort((a, b) => b[1] - a[1]).slice(0, 10);

  const dadosResumo = [
    ["INDICADOR", "VALOR"],
    ["TOTAL DE REGISTROS", total],
    ["EMBARQUES", embarques],
    ["DESEMBARQUES", desembarques],
    ["SAÍDAS PONTUAIS", saidas],
  ];

  let rowIndex = 4;
  dadosResumo.forEach((item, i) => {
    const row = sheet.getRow(rowIndex++);
    row.values = item;

    if (i === 0) {
      styleHeaderRow(row);
    } else {
      styleDataRows(sheet, row.number, row.number);
    }
  });

  rowIndex += 2;
  sheet.getCell(`A${rowIndex}`).value = "TOP NAVIOS";
  sheet.getCell(`A${rowIndex}`).font = { bold: true, size: 13, color: { argb: "FF0B3D91" } };
  rowIndex++;

  const navioHeader = sheet.getRow(rowIndex++);
  navioHeader.values = ["NAVIO", "QUANTIDADE"];
  styleHeaderRow(navioHeader);

  naviosOrdenados.forEach(([nome, qtd]) => {
    const row = sheet.getRow(rowIndex++);
    row.values = [nome, qtd];
  });

  const fimNavios = rowIndex - 1;
  if (fimNavios >= 1) styleDataRows(sheet, navioHeader.number + 1, fimNavios);

  rowIndex += 2;
  sheet.getCell(`A${rowIndex}`).value = "TOP EMPRESAS";
  sheet.getCell(`A${rowIndex}`).font = { bold: true, size: 13, color: { argb: "FF0B3D91" } };
  rowIndex++;

  const empresaHeader = sheet.getRow(rowIndex++);
  empresaHeader.values = ["EMPRESA", "QUANTIDADE"];
  styleHeaderRow(empresaHeader);

  empresasOrdenadas.forEach(([nome, qtd]) => {
    const row = sheet.getRow(rowIndex++);
    row.values = [nome, qtd];
  });

  const fimEmpresas = rowIndex - 1;
  if (fimEmpresas >= 1) styleDataRows(sheet, empresaHeader.number + 1, fimEmpresas);

  autoFitColumns(sheet);
  sheet.views = [{ state: "frozen", ySplit: 4 }];
}

export async function exportarExcelBonito(registros) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "SCTS";
  workbook.created = new Date();

  const logoBuffer = await getLogoBuffer();
  let imageId = null;

  if (logoBuffer) {
    imageId = workbook.addImage({
      buffer: logoBuffer,
      extension: "png",
    });
  }

  const registrosFormatados = registros.map(getRegistroFormatado);

  const geral = workbook.addWorksheet("GERAL");
  const embarque = workbook.addWorksheet("EMBARQUE");
  const desembarque = workbook.addWorksheet("DESEMBARQUE");
  const saida = workbook.addWorksheet("SAIDA PONTUAL");
  const resumo = workbook.addWorksheet("RESUMO");

  prepararPlanilha(
    geral,
    "SCTS — RELATÓRIO GERAL DE CONTROLE DE TRIPULAÇÃO",
    workbook,
    imageId,
    registrosFormatados
  );

  prepararPlanilha(
    embarque,
    "SCTS — RELATÓRIO DE EMBARQUES",
    workbook,
    imageId,
    registrosFormatados.filter(r => r.motivacao === "EMBARQUE")
  );

  prepararPlanilha(
    desembarque,
    "SCTS — RELATÓRIO DE DESEMBARQUES",
    workbook,
    imageId,
    registrosFormatados.filter(r => r.motivacao === "DESEMBARQUE")
  );

  prepararPlanilha(
    saida,
    "SCTS — RELATÓRIO DE SAÍDAS PONTUAIS",
    workbook,
    imageId,
    registrosFormatados.filter(r => r.motivacao === "SAÍDA PONTUAL")
  );

  criarResumo(resumo, registrosFormatados, workbook, imageId);

  const bufferExcel = await workbook.xlsx.writeBuffer();

  const blobExcel = new Blob([bufferExcel], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  });

  const link = document.createElement("a");
  link.href = URL.createObjectURL(blobExcel);
  link.download = `SCTS_RELATORIO_${new Date().toISOString().slice(0,10)}.xlsx`;
  link.click();

  URL.revokeObjectURL(link.href);
}