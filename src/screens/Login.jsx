import React, { useEffect, useState } from "react";
import { db } from "../db";
import { supabase, isSupabaseReady } from "../supabaseClient";

export function Login({ onLogin }) {
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [booting, setBooting] = useState(true);

  async function ensureLocalUsers() {
    const count = await db.users.count();

    if (count === 0) {
      await db.users.bulkAdd([
        {
          nome: "Supervisor",
          pin: "1111",
          role: "SUPERVISOR",
          ativo: true,
        },
        {
          nome: "Vigilante 1",
          pin: "2222",
          role: "VIGILANTE",
          ativo: true,
        },
      ]);
    }
  }

  async function pullUsersFromCloud() {
    if (!isSupabaseReady() || !supabase) return;

    const { data, error } = await supabase
      .from("users")
      .select("nome, pin, role, ativo");

    if (error) {
      console.warn("Falha ao buscar users no Supabase:", error.message);
      return;
    }

    for (const u of data || []) {
      const existing = await db.users.where("pin").equals(String(u.pin)).first();

      if (!existing) {
        await db.users.add({
          nome: u.nome,
          pin: String(u.pin),
          role: u.role,
          ativo: !!u.ativo,
        });
      } else {
        await db.users.update(existing.id, {
          nome: u.nome,
          pin: String(u.pin),
          role: u.role,
          ativo: !!u.ativo,
        });
      }
    }
  }

  useEffect(() => {
    async function boot() {
      try {
        await ensureLocalUsers();
        await pullUsersFromCloud();
      } catch (err) {
        console.error("Erro ao preparar login:", err);
      } finally {
        setBooting(false);
      }
    }

    boot();
  }, []);

  async function entrar() {
    const p = String(pin || "").trim();

    if (!p) {
      alert("Informe o PIN do vigilante.");
      return;
    }

    try {
      setLoading(true);

      const user = await db.users.where("pin").equals(p).first();

      if (!user) {
        alert("PIN inválido.");
        return;
      }

      if (!user.ativo) {
        alert("Usuário desativado.");
        return;
      }

      const session = {
        id: user.id,
        nome: user.nome,
        role: user.role,
        pin: user.pin,
      };

      localStorage.setItem("scts_user", JSON.stringify(session));
      onLogin?.(session);
    } catch (err) {
      console.error(err);
      alert("Erro ao validar login.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="loginPage">
      <div className="loginBackdrop"></div>

      <div className="loginShell compact">
        <div className="loginCard glass">
          <div className="loginLogoBlock">
            <img
              src="/logo_scts.png"
              alt="SCTS"
              className="loginLogoImg rect"
            />
            <div className="loginTitle">SCTS</div>
            <div className="loginSubtitle">
              Sistema de Controle de Tripulação e Segurança
            </div>
          </div>

          <div className="loginForm">
            <div className="label loginLabel">PIN do vigilante</div>

            <input
              type="password"
              className="input loginInput"
              placeholder={booting ? "Preparando acesso..." : "Digite seu PIN"}
              value={pin}
              disabled={booting || loading}
              onChange={(e) => setPin(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !booting && !loading) entrar();
              }}
            />

            <button
              className="btn primary loginBtn"
              onClick={entrar}
              disabled={booting || loading}
            >
              {booting ? "Carregando..." : loading ? "Entrando..." : "Entrar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}