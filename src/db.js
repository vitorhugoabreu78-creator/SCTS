import Dexie from "dexie";

export const db = new Dexie("scts");

db.version(1).stores({
  meta: "&key",
  lists: "++id, embarcacao, tipo, dataIso",
  crew: "++id, listId, documento, status, nome, empresa",
  checkins: "++id, documento, dataIso, hora, embarcacao, tipo"
});

db.version(2).stores({
  meta: "&key",
  lists: "++id, embarcacao, tipo, dataIso",
  crew: "++id, listId, documento, status, nome, empresa",
  checkins: "++id, documento, dataIso, hora, embarcacao, tipo, listId"
}).upgrade(async (tx) => {

  const lists = await tx.table("lists").toArray();

  const map = new Map(
    lists.map(l => [`${l.embarcacao}|${l.tipo}|${l.dataIso}`, l.id])
  );

  await tx.table("checkins").toCollection().modify((c) => {
    const key = `${c.embarcacao}|${c.tipo}|${c.dataIso}`;
    const id = map.get(key);
    c.listId = id ?? null;
  });

});

db.version(3).stores({
  meta: "&key",
  lists: "++id, embarcacao, tipo, dataIso",
  crew: "++id, listId, documento, status, nome, empresa",
  checkins: "++id, documento, dataIso, hora, embarcacao, tipo, listId, isDeleted, deletedAt"
}).upgrade(async (tx) => {

  await tx.table("checkins").toCollection().modify((c) => {

    if (typeof c.isDeleted === "undefined") c.isDeleted = false;
    if (typeof c.deletedAt === "undefined") c.deletedAt = null;

  });

});

db.version(4).stores({
  meta: "&key",
  lists: "++id, embarcacao, tipo, dataIso",
  crew: "++id, listId, documento, status, nome, empresa",
  checkins: "++id, documento, dataIso, hora, embarcacao, tipo, listId, isDeleted, deletedAt, syncStatus"
}).upgrade(async (tx) => {

  await tx.table("checkins").toCollection().modify((c) => {

    if (typeof c.syncStatus === "undefined") c.syncStatus = "LOCAL";

  });

});

db.version(5).stores({
  meta: "&key",
  lists: "++id, embarcacao, tipo, dataIso, sourceFilename",
  crew: "++id, listId, documento, status, nome, empresa, funcao, motivacao, acesso",
  checkins: "++id, documento, dataIso, hora, embarcacao, navio, tipo, motivacao, listId, isDeleted, deletedAt, syncStatus, empresa, funcao, acesso, controle"
}).upgrade(async (tx) => {

  await tx.table("crew").toCollection().modify((c) => {

    if (typeof c.funcao === "undefined") c.funcao = "";
    if (typeof c.motivacao === "undefined") c.motivacao = "";
    if (typeof c.acesso === "undefined") c.acesso = "";
    if (typeof c.transporte === "undefined") c.transporte = "";
    if (typeof c.tipoTransporte === "undefined") c.tipoTransporte = "";
    if (typeof c.placa === "undefined") c.placa = "";
    if (typeof c.observacao === "undefined") c.observacao = "";
    if (typeof c.controle === "undefined") c.controle = "";
    if (typeof c.horaSaida === "undefined") c.horaSaida = "";
    if (typeof c.horaEntrada === "undefined") c.horaEntrada = "";
    if (typeof c.confirmedAt === "undefined") c.confirmedAt = null;

  });

  await tx.table("checkins").toCollection().modify((c) => {

    if (typeof c.navio === "undefined") c.navio = c.embarcacao || "";
    if (typeof c.funcao === "undefined") c.funcao = "";
    if (typeof c.motivacao === "undefined") c.motivacao = c.tipo || "";
    if (typeof c.acesso === "undefined") c.acesso = "";
    if (typeof c.transporte === "undefined") c.transporte = "";
    if (typeof c.tipoTransporte === "undefined") c.tipoTransporte = "";
    if (typeof c.placa === "undefined") c.placa = "";
    if (typeof c.observacao === "undefined") c.observacao = "";
    if (typeof c.controle === "undefined") c.controle = "";
    if (typeof c.horaSaida === "undefined") c.horaSaida = "";
    if (typeof c.horaEntrada === "undefined") c.horaEntrada = "";
    if (typeof c.photoUrl === "undefined") c.photoUrl = "";
    if (typeof c.syncStatus === "undefined") c.syncStatus = "LOCAL";
    if (typeof c.isDeleted === "undefined") c.isDeleted = false;
    if (typeof c.deletedAt === "undefined") c.deletedAt = null;

  });

  await tx.table("lists").toCollection().modify((l) => {

    if (typeof l.sourceFilename === "undefined") l.sourceFilename = "";

  });

});

db.version(6).stores({
  meta: "&key",
  lists: "++id, cloudId, embarcacao, tipo, dataIso, sourceFilename",
  crew: "++id, cloudId, listId, documento, status, nome, empresa, funcao, motivacao, acesso",
  checkins: "++id, cloudId, crewId, documento, dataIso, hora, embarcacao, navio, tipo, motivacao, listId, isDeleted, deletedAt, syncStatus, empresa, funcao, acesso, controle"
}).upgrade(async (tx) => {

  await tx.table("lists").toCollection().modify((l) => {
    if (typeof l.cloudId === "undefined") l.cloudId = null;
  });

  await tx.table("crew").toCollection().modify((c) => {
    if (typeof c.cloudId === "undefined") c.cloudId = null;
  });

  await tx.table("checkins").toCollection().modify((c) => {
    if (typeof c.cloudId === "undefined") c.cloudId = null;
    if (typeof c.syncError === "undefined") c.syncError = null;
  });

});

/* =====================================================
VERSION 7 – USERS (LOGIN)
===================================================== */

db.version(7).stores({
  meta: "&key",
  lists: "++id, cloudId, embarcacao, tipo, dataIso, sourceFilename",
  crew: "++id, cloudId, listId, documento, status, nome, empresa, funcao, motivacao, acesso",
  checkins: "++id, cloudId, crewId, documento, dataIso, hora, embarcacao, navio, tipo, motivacao, listId, isDeleted, deletedAt, syncStatus, empresa, funcao, acesso, controle",
  users: "++id, pin, role, ativo"
}).upgrade(async (tx) => {

  const users = await tx.table("users").toArray();

  if (users.length === 0) {

    await tx.table("users").bulkAdd([
      {
        nome: "Supervisor",
        pin: "1111",
        role: "SUPERVISOR",
        ativo: true
      },
      {
        nome: "Vigilante",
        pin: "2222",
        role: "VIGILANTE",
        ativo: true
      }
    ]);

  }

});

/* =====================================================
EXPOSIÇÃO DO DB PARA DEBUG
===================================================== */

window.db = db;