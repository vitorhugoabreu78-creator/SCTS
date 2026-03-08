import React, { useState, useEffect } from "react";
import { TopBar } from "./components/TopBar";

import { Dashboard } from "./screens/Dashboard";
import { Operation } from "./screens/Operation";
import { Lists } from "./screens/Lists";
import { ListDetail } from "./screens/ListDetail";
import { Confirm } from "./screens/Confirm";
import { Manual } from "./screens/Manual";
import { Records } from "./screens/Records";
import { Login } from "./screens/Login";

import { syncAllToCloud } from "./cloudSync";

export default function App() {

  const [user, setUser] = useState(() => {

    const stored = localStorage.getItem("scts_user");

    if (!stored) return null;

    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }

  });

  const [tab, setTab] = useState(0);
  const [selectedList, setSelectedList] = useState(null);
  const [selectedCrew, setSelectedCrew] = useState(null);

  function handleLogin(session) {

    localStorage.setItem("scts_user", JSON.stringify(session));
    setUser(session);

  }

  function handleLogout() {

    localStorage.removeItem("scts_user");

    setUser(null);
    setTab(0);
    setSelectedList(null);
    setSelectedCrew(null);

  }

  function goHome() {

    setSelectedList(null);
    setSelectedCrew(null);
    setTab(0);

  }

  function goTab(n) {

    setSelectedList(null);
    setSelectedCrew(null);
    setTab(n);

  }

  /* ==========================================
     SINCRONIZAÇÃO AUTOMÁTICA
  ========================================== */

  useEffect(() => {

    async function trySync() {

      try {
        await syncAllToCloud();
        console.log("SCTS sync OK");
      } catch (err) {
        console.log("SCTS sync pendente/offline");
      }

    }

    /* sync inicial */
    trySync();

    /* sync periódico */
    const interval = setInterval(trySync, 60000);

    /* sync quando voltar internet */
    window.addEventListener("online", trySync);

    return () => {
      clearInterval(interval);
      window.removeEventListener("online", trySync);
    };

  }, []);

  /* ========================================== */

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  let content = null;

  if (selectedCrew && selectedList) {

    content = (
      <Confirm
        crew={selectedCrew}
        list={selectedList}
        vigilantePin={user.pin}
        onBack={() => setSelectedCrew(null)}
        onDone={() => {
          setSelectedCrew(null);
          setTab(1);
        }}
      />
    );

  } else if (selectedList) {

    content = (
      <ListDetail
        list={selectedList}
        onBack={() => setSelectedList(null)}
        onConfirm={(crew, list) => {
          setSelectedCrew(crew);
          setSelectedList(list);
        }}
      />
    );

  } else {

    if (tab === 0) content = <Dashboard go={goTab} />;

    if (tab === 1)
      content = (
        <Operation
          onOpenList={(list) => setSelectedList(list)}
        />
      );

    if (tab === 2)
      content = (
        <Lists
          onOpenList={(list) => setSelectedList(list)}
        />
      );

    if (tab === 3)
      content = (
        <Manual
          pin={user.pin}
        />
      );

    if (tab === 4)
      content = (
        <Records
          userRole={user.role}
        />
      );

  }

  return (
    <>
      <TopBar
        pin={user.pin}
        nome={user.nome}
        role={user.role}
        onLogout={handleLogout}
        tab={tab}
        goHome={goHome}
      />

      {content}
    </>
  );

}