import React from 'react';

export function Modal({ title, children, onClose }) {
  return (
    <div className="modalBackdrop" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e)=>e.stopPropagation()}>
        <div className="modalHeader">
          <div style={{fontWeight:900}}>{title}</div>
          <button className="btn" onClick={onClose}>Fechar</button>
        </div>
        <div className="modalBody">{children}</div>
      </div>
    </div>
  );
}
