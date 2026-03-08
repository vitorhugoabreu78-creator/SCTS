/**
 * UUID v4 generator that works even in non-secure contexts (http on LAN).
 * - Prefer crypto.randomUUID when available
 * - Fallback to getRandomValues-based v4
 */
export function uuidv4(){
  try{
    if (globalThis?.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  }catch(_e){}
  const cryptoObj = globalThis.crypto || globalThis.msCrypto;
  if (!cryptoObj?.getRandomValues) {
    const s = Math.random().toString(16).slice(2) + Date.now().toString(16);
    return `${s.slice(0,8)}-${s.slice(8,12)}-4${s.slice(12,15)}-a${s.slice(15,18)}-${s.slice(18,30)}`.slice(0,36);
  }
  const b = new Uint8Array(16);
  cryptoObj.getRandomValues(b);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const hex = [...b].map(x=>x.toString(16).padStart(2,'0')).join('');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}
