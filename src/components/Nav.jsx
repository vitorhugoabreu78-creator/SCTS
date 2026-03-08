import React from 'react';

function Item({ active, label, icon, onClick }) {
  return (
    <button className={active ? 'navItem active' : 'navItem'} onClick={onClick}>
      <div className="navIcon">{icon}</div>
      <div className="navLabel">{label}</div>
    </button>
  );
}

export function Nav({ tab, setTab }) {
  return (
    <div className="navBottom">
      <Item active={tab===0} label="Início" icon="🏠" onClick={()=>setTab(0)} />
      <Item active={tab===1} label="Operação" icon="🧭" onClick={()=>setTab(1)} />
      <Item active={tab===2} label="Listas" icon="📋" onClick={()=>setTab(2)} />
      <Item active={tab===3} label="Manual" icon="✍️" onClick={()=>setTab(3)} />
      <Item active={tab===4} label="Registros" icon="🧾" onClick={()=>setTab(4)} />
      <Item active={tab===5} label="Dashboard" icon="📊" onClick={()=>setTab(5)} />
    </div>
  );
}
