import React from 'react'
import { X, Sparkles, Check } from 'lucide-react'

export default function ChangelogModal({ open, onClose, entries, currentVersion }) {
  if (!open) return null
  const versions = Object.keys(entries || {}).sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal changelog-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2 className="changelog-title"><Sparkles size={16} /> Novedades · v{currentVersion}</h2>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          {versions.map((v) => (
            <div key={v} className={`changelog-block ${v === currentVersion ? 'current' : ''}`}>
              <div className="changelog-ver">
                Versión {v}
                {v === currentVersion && <span className="badge">actual</span>}
              </div>
              <ul>
                {entries[v].map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            </div>
          ))}
        </div>
        <div className="modal-foot">
          <button className="btn primary" onClick={onClose}><Check size={15} /> Entendido</button>
        </div>
      </div>
    </div>
  )
}