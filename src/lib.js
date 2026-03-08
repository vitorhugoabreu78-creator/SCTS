export function norm(s){
  return (s ?? '')
    .toString()
    .trim()
    .toUpperCase()
    .replaceAll('Ã','A')
    .replaceAll('Ç','C')
    .replaceAll(/\s+/g,' ');
}

export function normalizeTipo(raw){
  const n = norm(raw);
  if (n.includes('DESEMB')) return 'DESEMBARQUE';
  if (n.includes('EMBAR')) return 'EMBARQUE';
  if (n.includes('PONT') || n.includes('SAIDA') || n.includes('SAÍDA')) return 'SAIDA PONTUAL';
  return n;
}

export function normalizeDate(raw){
  const s = (raw ?? '').toString().trim();
  if (!s) return '';
  // yyyy-mm-dd
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // dd/mm/yyyy
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  // Excel serial
  const n = Number(s);
  if (!Number.isNaN(n) && Number.isFinite(n)) {
    const epoch = new Date(Date.UTC(1899,11,30));
    epoch.setUTCDate(epoch.getUTCDate() + Math.floor(n));
    const yyyy = epoch.getUTCFullYear();
    const mm = String(epoch.getUTCMonth()+1).padStart(2,'0');
    const dd = String(epoch.getUTCDate()).padStart(2,'0');
    return `${yyyy}-${mm}-${dd}`;
  }
  // try Date.parse
  const t = Date.parse(s);
  if (!Number.isNaN(t)) {
    const d = new Date(t);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth()+1).padStart(2,'0');
    const dd = String(d.getDate()).padStart(2,'0');
    return `${yyyy}-${mm}-${dd}`;
  }
  return '';
}

export function nowIsoDate(){
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth()+1).padStart(2,'0');
  const dd = String(d.getDate()).padStart(2,'0');
  return `${yyyy}-${mm}-${dd}`;
}

export function nowTime(){
  const d = new Date();
  const hh = String(d.getHours()).padStart(2,'0');
  const mm = String(d.getMinutes()).padStart(2,'0');
  const ss = String(d.getSeconds()).padStart(2,'0');
  return `${hh}:${mm}:${ss}`;
}

export function downloadText(filename, text){
  const blob = new Blob([text], {type:'text/plain;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
export function nowTimeHHMM(){
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}