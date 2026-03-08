import { db } from "./db";
import { supabase, isSupabaseReady } from "./supabaseClient";

const BUCKET = "checkin-photos";

function fileNameFromCheckin(checkin) {
  const safeDoc = String(checkin.documento || "sem-doc").replace(/[^\w.-]+/g, "_");
  const safeDate = String(checkin.dataIso || "sem-data");
  const stamp = Date.now();
  return `checkins/${safeDate}/${safeDoc}_${stamp}.jpg`;
}

function dataUrlToBlob(dataUrl) {
  const arr = dataUrl.split(",");
  const mime = arr[0].match(/:(.*?);/)?.[1] || "image/jpeg";
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) u8arr[n] = bstr.charCodeAt(n);
  return new Blob([u8arr], { type: mime });
}

function isHttpUrl(value) {
  return typeof value === "string" && /^https?:\/\//i.test(value);
}

function isDataUrl(value) {
  return typeof value === "string" && value.startsWith("data:");
}

async function getMeta(key, fallback = null) {
  const row = await db.meta.get(key);
  return row ? row.value : fallback;
}

async function setMeta(key, value) {
  await db.meta.put({ key, value });
}

async function queuePermanentDeletion(entry) {
  const current = await getMeta("hardDeleteQueue", []);
  current.push(entry);
  await setMeta("hardDeleteQueue", current);
}

export async function markForPermanentCloudDeletion({
  checkinCloudId = null,
  crewCloudId = null,
  photoUrl = null,
}) {
  await queuePermanentDeletion({
    checkinCloudId,
    crewCloudId,
    photoUrl,
    createdAt: new Date().toISOString(),
  });
}

async function removeStorageFileIfNeeded(photoUrl) {
  if (!photoUrl || !supabase) return;
  if (!String(photoUrl).includes(`/storage/v1/object/public/${BUCKET}/`)) return;

  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const idx = String(photoUrl).indexOf(marker);
  if (idx < 0) return;

  const path = String(photoUrl).slice(idx + marker.length);
  if (!path) return;

  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw error;
}

async function flushHardDeleteQueue() {
  const queue = await getMeta("hardDeleteQueue", []);
  if (!Array.isArray(queue) || queue.length === 0) return;

  const remaining = [];

  for (const item of queue) {
    try {
      if (item.checkinCloudId) {
        const { error } = await supabase
          .from("checkins")
          .delete()
          .eq("id", item.checkinCloudId);

        if (error) throw error;
      }

      if (item.crewCloudId) {
        const { error } = await supabase
          .from("crew")
          .delete()
          .eq("id", item.crewCloudId);

        if (error) throw error;
      }

      if (item.photoUrl) {
        await removeStorageFileIfNeeded(item.photoUrl);
      }
    } catch (err) {
      console.error("Erro ao excluir permanentemente na nuvem", item, err);
      remaining.push(item);
    }
  }

  await setMeta("hardDeleteQueue", remaining);
}

async function uploadPhotoIfNeeded(checkin) {
  if (!checkin.photoUrl) return checkin.photoUrl;
  if (isHttpUrl(checkin.photoUrl)) return checkin.photoUrl;
  if (!isDataUrl(checkin.photoUrl)) return checkin.photoUrl;
  if (!isSupabaseReady()) return checkin.photoUrl;

  const blob = dataUrlToBlob(checkin.photoUrl);
  const path = fileNameFromCheckin(checkin);

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, {
      contentType: blob.type || "image/jpeg",
      upsert: false,
    });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

async function upsertList(localList) {
  const payload = {
    id: localList.cloudId || undefined,
    embarcacao: localList.embarcacao,
    tipo: localList.tipo,
    data_iso: localList.dataIso,
    source_filename: localList.sourceFilename || null,
  };

  const { data, error } = await supabase
    .from("lists")
    .upsert(payload, { onConflict: "id" })
    .select()
    .single();

  if (error) throw error;

  if (!localList.cloudId) {
    await db.lists.update(localList.id, { cloudId: data.id });
  }

  return data.id;
}

async function upsertCrew(localCrew) {
  const localList = await db.lists.get(localCrew.listId);
  if (!localList) throw new Error("Lista local não encontrada para crew.");

  const cloudListId = localList.cloudId || (await upsertList(localList));

  const payload = {
    id: localCrew.cloudId || undefined,
    list_id: cloudListId,
    nome: localCrew.nome,
    documento: localCrew.documento,
    empresa: localCrew.empresa || null,
    funcao: localCrew.funcao || null,
    motivacao: localCrew.motivacao || null,
    acesso: localCrew.acesso || null,
    transporte: localCrew.transporte || null,
    tipo_transporte: localCrew.tipoTransporte || null,
    placa: localCrew.placa || null,
    observacao: localCrew.observacao || null,
    controle: localCrew.controle || null,
    hora_saida: localCrew.horaSaida || null,
    hora_entrada: localCrew.horaEntrada || null,
    status: localCrew.status || "PENDENTE",
    confirmed_at: localCrew.confirmedAt || null,
  };

  const { data, error } = await supabase
    .from("crew")
    .upsert(payload, { onConflict: "id" })
    .select()
    .single();

  if (error) throw error;

  if (!localCrew.cloudId) {
    await db.crew.update(localCrew.id, { cloudId: data.id });
  }

  return data.id;
}

async function upsertCheckin(localCheckin) {
  const localList = localCheckin.listId ? await db.lists.get(localCheckin.listId) : null;
  const localCrew = localCheckin.crewId ? await db.crew.get(localCheckin.crewId) : null;

  let cloudListId = null;
  let cloudCrewId = null;

  if (localList) cloudListId = localList.cloudId || (await upsertList(localList));
  if (localCrew) cloudCrewId = localCrew.cloudId || (await upsertCrew(localCrew));

  const photoUrl = await uploadPhotoIfNeeded(localCheckin);

  const payload = {
    id: localCheckin.cloudId || undefined,
    list_id: cloudListId,
    crew_id: cloudCrewId,
    embarcacao: localCheckin.embarcacao,
    navio: localCheckin.navio || localCheckin.embarcacao || null,
    nome: localCheckin.nome,
    documento: localCheckin.documento,
    empresa: localCheckin.empresa || null,
    funcao: localCheckin.funcao || null,
    motivacao: localCheckin.motivacao || null,
    tipo: localCheckin.tipo || null,
    acesso: localCheckin.acesso || null,
    transporte: localCheckin.transporte || null,
    tipo_transporte: localCheckin.tipoTransporte || null,
    placa: localCheckin.placa || null,
    observacao: localCheckin.observacao || null,
    controle: localCheckin.controle || null,
    data_iso: localCheckin.dataIso,
    hora: localCheckin.hora || null,
    hora_saida: localCheckin.horaSaida || null,
    hora_entrada: localCheckin.horaEntrada || null,
    photo_url: photoUrl || null,
    vigilante_pin: localCheckin.vigilantePin || null,
    sync_status: "SYNCED",
    is_deleted: !!localCheckin.isDeleted,
    deleted_at: localCheckin.deletedAt || null,
  };

  const { data, error } = await supabase
    .from("checkins")
    .upsert(payload, { onConflict: "id" })
    .select()
    .single();

  if (error) throw error;

  await db.checkins.update(localCheckin.id, {
    cloudId: data.id,
    photoUrl: photoUrl || localCheckin.photoUrl,
    syncStatus: "SYNCED",
    syncError: null,
  });

  return data.id;
}

async function getQueuedCloudIds() {
  const queue = await getMeta("hardDeleteQueue", []);
  const checkinIds = new Set();
  const crewIds = new Set();

  for (const item of Array.isArray(queue) ? queue : []) {
    if (item?.checkinCloudId) checkinIds.add(item.checkinCloudId);
    if (item?.crewCloudId) crewIds.add(item.crewCloudId);
  }

  return { checkinIds, crewIds };
}

function shouldSyncCheckin(item, queuedCheckinIds) {
  if (!item) return false;

  if (item.cloudId && queuedCheckinIds.has(item.cloudId)) {
    return false;
  }

  if (item.isDeleted) {
    return true;
  }

  if (!item.cloudId) {
    return true;
  }

  if (item.syncStatus === "LOCAL" || item.syncStatus === "PENDING" || item.syncStatus === "ERROR") {
    return true;
  }

  return false;
}

function shouldSyncCrew(item, queuedCrewIds) {
  if (!item) return false;

  if (item.cloudId && queuedCrewIds.has(item.cloudId)) {
    return false;
  }

  if (!item.cloudId) return true;

  return true;
}

export async function syncAllToCloud() {
  if (!isSupabaseReady()) {
    throw new Error("Supabase não configurado no .env");
  }

  await flushHardDeleteQueue();

  const { checkinIds: queuedCheckinIds, crewIds: queuedCrewIds } = await getQueuedCloudIds();

  const lists = await db.lists.toArray();
  const crew = await db.crew.toArray();
  const checkins = await db.checkins.toArray();

  for (const item of lists) {
    try {
      await upsertList(item);
    } catch (err) {
      console.error("Erro sync list", item.id, err);
    }
  }

  for (const item of crew) {
    try {
      if (!shouldSyncCrew(item, queuedCrewIds)) continue;
      await upsertCrew(item);
    } catch (err) {
      console.error("Erro sync crew", item.id, err);
    }
  }

  for (const item of checkins) {
    try {
      if (!shouldSyncCheckin(item, queuedCheckinIds)) continue;

      await db.checkins.update(item.id, {
        syncStatus: "PENDING",
        syncError: null,
      });

      await upsertCheckin(item);
    } catch (err) {
      console.error("Erro sync checkin", item.id, err);
      await db.checkins.update(item.id, {
        syncStatus: "ERROR",
        syncError: String(err?.message || err),
      });
    }
  }

  await db.meta.put({
    key: "lastSyncAt",
    value: new Date().toISOString(),
  });

  return true;
}

export async function pullListsFromCloud() {
  if (!isSupabaseReady()) {
    throw new Error("Supabase não configurado no .env");
  }

  const { data: cloudLists, error: listErr } = await supabase
    .from("lists")
    .select("*")
    .order("data_iso", { ascending: false });

  if (listErr) throw listErr;

  for (const row of cloudLists || []) {
    const existing = await db.lists.where("cloudId").equals(row.id).first();

    if (!existing) {
      await db.lists.add({
        cloudId: row.id,
        embarcacao: row.embarcacao,
        tipo: row.tipo,
        dataIso: row.data_iso,
        sourceFilename: row.source_filename || "",
      });
      continue;
    }

    await db.lists.update(existing.id, {
      embarcacao: row.embarcacao,
      tipo: row.tipo,
      dataIso: row.data_iso,
      sourceFilename: row.source_filename || "",
    });
  }

  return true;
}
export async function pullUsersFromCloud() {

  if (!isSupabaseReady()) {
    throw new Error("Supabase não configurado");
  }

  const { data: users, error } = await supabase
    .from("users")
    .select("*");

  if (error) throw error;

  for (const u of users || []) {

    const existing = await db.users
      .where("pin")
      .equals(u.pin)
      .first();

    if (!existing) {

      await db.users.add({
        nome: u.nome,
        pin: u.pin,
        role: u.role,
        ativo: u.ativo
      });

    } else {

      await db.users.update(existing.id, {
        nome: u.nome,
        role: u.role,
        ativo: u.ativo
      });

    }

  }

  return true;

}