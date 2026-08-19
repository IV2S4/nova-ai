import React, { useState } from 'react'
import { Plus, Settings, GitCompareArrows, Bot, Trash2, Search, Sparkles, Pin, PictureInPicture2, Folder, FolderPlus, X } from 'lucide-react'
import i18n from '../i18n.js'

const t = i18n.t.bind(i18n)

const DAY = 86400000

function groupOf(ts) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  if (ts >= today) return 'today'
  if (ts >= today - DAY) return 'yesterday'
  if (ts >= today - 6 * DAY) return 'last-7-days'
  return 'older'
}

export default function Sidebar({ convos, activeId, view, onNew, onSelect, onDelete, onRename, onTogglePin, onSetFolder, onRemoveFolder, onViewChange, onOpenSettings, providers, configuredCount }) {
  const [filter, setFilter] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [alwaysOnTop, setAlwaysOnTop] = useState(false)
  const [folderOpen, setFolderOpen] = useState(null)
  const list = filter
    ? convos.filter((c) => c.title?.toLowerCase().includes(filter.toLowerCase()))
    : convos
  const sorted = [...list].sort((a, b) => ((b.pinned ? 1 : 0) - (a.pinned ? 1 : 0)) || b.updatedAt - a.updatedAt)
  const pinned = sorted.filter((c) => c.pinned)
  const folders = [...new Set(sorted.map((c) => c.folder).filter(Boolean))]
  const rest = sorted.filter((c) => !c.pinned && !c.folder)
  const groups = []
  for (const g of ['today', 'yesterday', 'last-7-days', 'older']) {
    const items = rest.filter((c) => groupOf(c.updatedAt || c.createdAt || 0) === g)
    if (items.length) groups.push({ name: g, items })
  }

  const providerName = (id) => providers.find((p) => p.id === id)?.name || id
  const providerColor = (id) => providers.find((p) => p.id === id)?.color || '#888'

  const commitRename = () => {
    if (editingId && editTitle.trim()) onRename(editingId, editTitle.trim())
    setEditingId(null)
  }

const rowProps = {
    activeId, editingId, editTitle, setEditingId, setEditTitle, commitRename,
    onSelect, onTogglePin, onDelete, providerName, providerColor,
    folders, folderOpen, setFolderOpen, onSetFolder
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-head">
        <div className="logo">
          <Sparkles size={20} />
          <div>
            <h1>Nova AI</h1>
            <span>{t('sidebar-tagline')}</span>
          </div>
        </div>
        <button className="btn primary" onClick={onNew}><Plus size={16} /> {t('new-chat')}</button>
        <button className={`btn ${view === 'compare' ? 'active' : ''}`} onClick={() => onViewChange(view === 'compare' ? 'chat' : 'compare')}>
          <GitCompareArrows size={16} /> {t('compare-models')}
        </button>
        <button className={`btn ${view === 'agent' ? 'active' : ''}`} onClick={() => onViewChange(view === 'agent' ? 'chat' : 'agent')}>
          <Bot size={16} /> {t('agent-ai')}
        </button>
      </div>

      <div className="search-box">
        <Search size={14} />
        <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder={t('search-conversations')} />
      </div>

      <div className="convo-list">
        {sorted.length === 0 && <div className="empty-hint">{filter ? t('no-results') : t('no-conversations-yet')}</div>}
        {filter ? (
          sorted.map((c) => <ConvoRow key={c.id} c={c} {...rowProps} />)
        ) : (
          <>
            {pinned.length > 0 && (
              <div className="convo-group">
                <div className="convo-group-head"><Pin size={11} /> {t('pinned')}</div>
                {pinned.map((c) => <ConvoRow key={c.id} c={c} {...rowProps} />)}
              </div>
            )}
            {folders.map((f) => (
              <div key={f} className="convo-group">
                <div className="convo-group-head folder-head">
                  <Folder size={11} /> {f}
                  <button className="icon-btn danger" title={t('remove-folder-tip')} onClick={(e) => { e.stopPropagation(); if (confirm(t('remove-folder-confirm', { name: f }))) onRemoveFolder(f) }}>
                    <X size={11} />
                  </button>
                </div>
                {sorted.filter((c) => c.folder === f).map((c) => <ConvoRow key={c.id} c={c} {...rowProps} />)}
              </div>
            ))}
            {groups.map((g) => (
              <div key={g.name} className="convo-group">
                <div className="convo-group-head">{t(g.name)}</div>
                {g.items.map((c) => <ConvoRow key={c.id} c={c} {...rowProps} />)}
              </div>
            ))}
          </>
        )}
      </div>

      <div className="sidebar-foot">
        <div className="status-line">
          <span className={`dot ${configuredCount > 0 ? 'on' : ''}`} />
          {configuredCount > 0 ? t('providers-ready', { n: configuredCount }) : t('configure-ai')}
        </div>
        <button
          className={`btn ${alwaysOnTop ? 'active' : ''}`}
          onClick={async () => setAlwaysOnTop(await window.api.setAlwaysOnTop())}
          title={t('always-on-top-tip')}
        >
          <PictureInPicture2 size={15} /> {alwaysOnTop ? t('always-on-top-yes') : t('always-on-top')}
        </button>
        <button className="btn" onClick={onOpenSettings}><Settings size={15} /> {t('settings')}</button>
      </div>
    </aside>
  )
}

function ConvoRow({ c, activeId, editingId, editTitle, setEditingId, setEditTitle, commitRename, onSelect, onTogglePin, onDelete, providerName, providerColor, folders, folderOpen, setFolderOpen, onSetFolder }) {
  const pickFolder = (f) => {
    onSetFolder(c.id, f)
    setFolderOpen(null)
  }
  return (
    <div className={`convo ${c.id === activeId ? 'active' : ''} ${c.pinned ? 'pinned' : ''}`} onClick={() => onSelect(c.id)}>
      <span className="convo-dot" style={{ background: providerColor(c.provider) }} />
      <div className="convo-body">
        {editingId === c.id ? (
          <input
            className="convo-title-input"
            value={editTitle}
            autoFocus
            onChange={(e) => setEditTitle(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename()
              if (e.key === 'Escape') setEditingId(null)
            }}
            onBlur={commitRename}
          />
        ) : (
          <div
            className="convo-title"
            title={t('double-click-rename')}
            onDoubleClick={(e) => { e.stopPropagation(); setEditingId(c.id); setEditTitle(c.title || '') }}
          >
            {c.title || t('untitled')}
          </div>
        )}
        <div className="convo-sub">{providerName(c.provider)} · {t('msgs', { n: c.count })}{c.folder ? ` · ${c.folder}` : ''}</div>
      </div>
      <div className="convo-actions">
        {folderOpen === c.id && (
          <div className="folder-menu" onClick={(e) => e.stopPropagation()}>
            <div className="folder-menu-title">{t('move-to-folder')}</div>
            {folders.map((f) => (
              <button key={f} className={`folder-opt ${c.folder === f ? 'sel' : ''}`} onClick={() => pickFolder(f)}><Folder size={12} /> {f}</button>
            ))}
            <button className="folder-opt" onClick={() => {
              setFolderOpen(null)
              const name = prompt(t('folder-name-prompt'))
              if (name && name.trim()) pickFolder(name.trim())
            }}><FolderPlus size={12} /> {t('new-folder')}</button>
            {c.folder && <button className="folder-opt danger" onClick={() => pickFolder('')}><X size={12} /> {t('remove-from-folder')}</button>}
          </div>
        )}
        <button className={`icon-btn convo-folder ${c.folder ? 'has' : ''}`} onClick={(e) => { e.stopPropagation(); setFolderOpen(folderOpen === c.id ? null : c.id) }} title={c.folder ? t('folder-label', { name: c.folder }) : t('move-to-folder')}>
          <Folder size={13} />
        </button>
        <button className={`icon-btn convo-pin ${c.pinned ? 'pinned' : ''}`} onClick={(e) => { e.stopPropagation(); onTogglePin(c.id) }} title={c.pinned ? t('unpin-convo') : t('pin-convo')}>
          <Pin size={14} />
        </button>
        <button className="icon-btn danger convo-del" onClick={(e) => { e.stopPropagation(); onDelete(c.id) }} title={t('delete')}>
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}