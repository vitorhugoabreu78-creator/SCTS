import React, { useState } from "react";
import { db } from "../db";

export function Login({ onLogin }) {

  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);

  async function entrar() {

    const p = String(pin || "").trim();

    if (!p) {
      alert("Informe o PIN do vigilante.");
      return;
    }

    try {

      setLoading(true);

      const user = await db.users
        .where("pin")
        .equals(p)
        .first();

      if (!user) {
        alert("PIN inválido.");
        setLoading(false);
        return;
      }

      if (!user.ativo) {
        alert("Usuário desativado.");
        setLoading(false);
        return;
      }

      const session = {
        id: user.id,
        nome: user.nome,
        role: user.role,
        pin: user.pin
      };

      localStorage.setItem(
        "scts_user",
        JSON.stringify(session)
      );

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

            <div className="label loginLabel">
              PIN do vigilante
            </div>

            <input
              type="password"
              className="input loginInput"
              placeholder="Digite seu PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") entrar();
              }}
            />

            <button
              className="btn primary loginBtn"
              onClick={entrar}
              disabled={loading}
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>

          </div>

        </div>

      </div>

    </div>
  );

}