/**
 * UpdateBanner — banner aggiornamento PWA
 * Appare quando un nuovo Service Worker è pronto.
 */

import React from 'react'

export default function UpdateBanner({ onUpdate }) {
  return (
    <div style={{
      position: 'fixed',
      bottom: 16,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 9999,
      background: '#1a1a1a',
      border: '1px solid var(--accent-green)',
      borderRadius: 8,
      padding: '10px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      boxShadow: '0 4px 24px rgba(0,0,0,0.6)',
      fontFamily: 'var(--font-mono)',
      fontSize: 12,
      color: 'var(--text-primary)',
      whiteSpace: 'nowrap',
    }}>
      <span style={{ color: 'var(--accent-green)' }}>◉</span>
      <span>Nuova versione disponibile</span>
      <button
        onClick={onUpdate}
        style={{
          background: 'var(--accent-green)',
          border: 'none',
          borderRadius: 4,
          padding: '4px 14px',
          color: '#000',
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.08em',
          cursor: 'pointer',
        }}
      >
        AGGIORNA
      </button>
    </div>
  )
}
