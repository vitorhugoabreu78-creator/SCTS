import React, { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { supabase, assertSupabaseReady } from '../supabaseClient';
import { syncNow } from '../cloudSync';

export function CloudModal({ onClose }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(()=>{
    try{
      assertSupabaseReady();
      setReady(true);
    }catch(e){
      setMsg(e.message);
      setReady(false);
    }
  },[]);

  useEffect(()=>{
    if (!ready) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, sess) => setSession(sess));
    return ()=> sub.subscription.unsubscribe();
  },[ready]);

  async function signIn(){
    setMsg(''); setBusy(true);
    try{
      const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
      if (error) throw error;
      setMsg('Conectado ✅');
    }catch(e){
      setMsg(String(e.message ?? e));
    }finally{ setBusy(false); }
  }

  async function signOut(){
    setBusy(true);
    await supabase.auth.signOut();
    setBusy(false);
    setMsg('Desconectado.');
  }

  async function doSync(){
    setBusy(true); setMsg('');
    try{
      const res = await syncNow();
      setMsg(`Sync concluído. Enviados: ${res.pushed}`);
    }catch(e){
      setMsg(String(e.message ?? e));
    }finally{ setBusy(false); }
  }

  return (
    <Modal title="Nuvem (Supabase)" onClose={onClose}>
      {!ready && (
        <div className="notice err">
          {msg || 'Supabase não configurado.'}
          <div className="small" style={{marginTop:6}}>
            Configure <b>VITE_SUPABASE_URL</b> e <b>VITE_SUPABASE_ANON_KEY</b> no arquivo <code>.env</code>.
          </div>
        </div>
      )}

      {ready && (
        <>
          <div className="row">
            <div className="col">
              <div className="label">Status</div>
              <div className="small">{session ? `Conectado como ${session.user.email}` : 'Desconectado'}</div>
            </div>
            <div className="col">
              {session ? (
                <button className="btn" onClick={signOut} disabled={busy}>Sair da nuvem</button>
              ) : null}
            </div>
          </div>

          {!session && (
            <>
              <div className="hr"></div>
              <div className="label">Email</div>
              <input className="input" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="vigilante1@empresa.com" />
              <div className="label" style={{marginTop:10}}>Senha</div>
              <input className="input" type="password" value={pass} onChange={(e)=>setPass(e.target.value)} placeholder="••••••••" />
              <div className="row" style={{marginTop:10}}>
                <button className="btn primary" onClick={signIn} disabled={busy}>Entrar</button>
              </div>
              <div className="small" style={{marginTop:6}}>Para demo, no Supabase desative confirmação de email.</div>
            </>
          )}

          {session && (
            <>
              <div className="hr"></div>
              <button className="btn primary" onClick={doSync} disabled={busy}>Sincronizar agora</button>
              <div className="small" style={{marginTop:6}}>
                O app continua offline. Quando tiver internet, aperte “Sincronizar”.
              </div>
            </>
          )}

          {msg && <div className="notice" style={{marginTop:10}}>{msg}</div>}
        </>
      )}
    </Modal>
  );
}
