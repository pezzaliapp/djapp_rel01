/**
 * KeyboardHelp — pannello help scorciatoie
 * Premi ? per mostrare/nascondere
 */

import React from 'react'

const SHORTCUTS = [
  { section: 'DECK A', items: [
    ['Spazio', 'Play / Pause'],
    ['Z', 'CUE'],
    ['1 – 8', 'Hot Cue 1–8'],
    ['← →', 'Beat Jump ±1'],
    ['Q / E', 'Key Shift ♭ / ♯'],
  ]},
  { section: 'DECK B', items: [
    ['Enter', 'Play / Pause'],
    ['M', 'CUE'],
    ['F1 – F8', 'Hot Cue 1–8'],
    ['↑ ↓', 'Beat Jump ±1'],
    ['O / P', 'Key Shift ♭ / ♯'],
  ]},
  { section: 'GLOBALI', items: [
    ['Esc', 'Stop entrambi'],
    ['?', 'Mostra / nascondi questo help'],
  ]},
]

export default function KeyboardHelp({ onClose }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-default)',
        borderRadius: 12, padding: '24px 32px',
        minWidth: 380, maxWidth: 480,
        color: 'var(--text-primary)',
      }} onClick={e => e.stopPropagation()}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, letterSpacing: '0.1em' }}>
            ⌨ KEYBOARD SHORTCUTS
          </span>
          <button onClick={onClose} style={{
            background: 'transparent', border: 'none',
            color: 'var(--text-muted)', fontSize: 18, cursor: 'pointer',
          }}>✕</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          {SHORTCUTS.map(({ section, items }) => (
            <div key={section}>
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700,
                letterSpacing: '0.15em', color: 'var(--accent-green)',
                marginBottom: 10,
              }}>{section}</div>
              {items.map(([key, action]) => (
                <div key={key} style={{
                  display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', marginBottom: 7, gap: 12,
                }}>
                  <kbd style={{
                    fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700,
                    background: 'var(--bg-primary)', border: '1px solid var(--border-default)',
                    borderRadius: 4, padding: '2px 7px', color: 'var(--text-primary)',
                    whiteSpace: 'nowrap',
                  }}>{key}</kbd>
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)', textAlign: 'right' }}>
                    {action}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div style={{
          marginTop: 20, paddingTop: 14,
          borderTop: '1px solid var(--border-subtle)',
          fontFamily: 'var(--font-mono)', fontSize: 9,
          color: 'var(--text-muted)', textAlign: 'center',
        }}>
          Premi ? o clicca fuori per chiudere
        </div>
      </div>
    </div>
  )
}
