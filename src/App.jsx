import React, { useEffect, useRef, useState } from 'react'
import Deck from '@components/Deck/Deck.jsx'
import Mixer from '@components/Mixer/Mixer.jsx'
import Waveform from '@components/Waveform/Waveform.jsx'
import Library from '@components/Library/Library.jsx'
import FXPanel from '@components/FX/FXPanel.jsx'
import { audioEngine } from '@audio/AudioEngine.js'
import { usePositionSync } from '@hooks/usePositionSync.js'
import { useKeyboardShortcuts } from '@hooks/useKeyboardShortcuts.js'
import KeyboardHelp from './components/KeyboardHelp.jsx'
import { usePWA } from '@hooks/usePWA.js'
import UpdateBanner from '@components/UpdateBanner.jsx'
import styles from './App.module.css'

export const DECK_IDS = ['A', 'B']

function PositionSyncProvider() {
  usePositionSync()
  const { showHelp, setShowHelp } = useKeyboardShortcuts()
  return null
}

// Tab mobile: 0=DeckA, 1=Mixer, 2=DeckB, 3=Library
const MOBILE_TABS = [
  { id: 0, icon: '◉', label: 'DECK A', color: 'var(--deck-a)' },
  { id: 1, icon: '⇌', label: 'MIXER',  color: 'var(--text-secondary)' },
  { id: 2, icon: '◉', label: 'DECK B', color: 'var(--deck-b)' },
  { id: 3, icon: '♪', label: 'LIBRARY', color: 'var(--text-secondary)' },
]

export default function App() {
  const engineReady = useRef(false)
  const { updateReady, applyUpdate } = usePWA()
  const [mobileTab, setMobileTab] = useState(0)
  const [stackedWave, setStackedWave] = useState(false)
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 600)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 600)
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    const unlock = async () => {
      if (!engineReady.current) {
        await audioEngine.init()
        engineReady.current = true
        document.removeEventListener('pointerdown', unlock)
      }
    }
    document.addEventListener('pointerdown', unlock, { once: true })
    return () => document.removeEventListener('pointerdown', unlock)
  }, [])

  return (
    <div className={styles.app}>
      <PositionSyncProvider />

      {/* Header */}
      <header className={styles.header}>
        <span className={styles.brand}>djApp</span>
        <span className={styles.brandSub}>by PezzaliApp</span>
        <div className={styles.headerStatus}>
          <span className={styles.dot} />
          READY
        </div>
      </header>

      {/* Waveform zone */}
      <section className={styles.waveformZone} style={{ position: 'relative' }}>
        {isMobile ? (
          <Waveform deckId={mobileTab === 2 ? 'B' : 'A'} />
        ) : stackedWave ? (
          // Stacked: entrambe sovrapposte
          <div style={{ position: 'relative', gridColumn: '1 / -1', width: '100%', height: '100%' }}>
            <Waveform deckId="A" stacked />
            <div style={{ position: 'absolute', inset: 0, opacity: 0.55, mixBlendMode: 'screen' }}>
              <Waveform deckId="B" stacked />
            </div>
          </div>
        ) : (
          DECK_IDS.map((id) => <Waveform key={id} deckId={id} />)
        )}
        {/* Toggle stacked view */}
        {!isMobile && (
          <button
            onClick={() => setStackedWave(v => !v)}
            style={{
              position: 'absolute', top: 4, right: 8, zIndex: 10,
              background: stackedWave ? 'var(--deck-a)' : 'transparent',
              border: '1px solid var(--border-default)',
              color: stackedWave ? '#000' : 'var(--text-muted)',
              fontFamily: 'var(--font-mono)', fontSize: 9,
              letterSpacing: '0.1em', padding: '2px 8px',
              borderRadius: 3, cursor: 'pointer',
            }}
          >STACK</button>
        )}
      </section>

      {/* Performance zone */}
      <main className={styles.performanceZone}>
        {isMobile ? (
          // Mobile: mostra il pannello selezionato
          <>
            {mobileTab === 0 && <Deck deckId="A" side="left" />}
            {mobileTab === 1 && <Mixer deckIds={DECK_IDS} />}
            {mobileTab === 2 && <Deck deckId="B" side="right" />}
            {mobileTab === 3 && <Library />}
          </>
        ) : (
          <>
            <Deck deckId="A" side="left" />
            <Mixer deckIds={DECK_IDS} />
            <Deck deckId="B" side="right" />
          </>
        )}
      </main>

      {/* FX (solo desktop) */}
      <section className={styles.fxZone}>
        <FXPanel />
      </section>

      {/* Library (solo desktop) */}
      <section className={styles.libraryZone}>
        <Library />
      </section>

      {/* Update banner */}
      {updateReady && <UpdateBanner onUpdate={applyUpdate} />}

      {/* Tab bar mobile */}
      <nav className={styles.mobileNav}>
        {MOBILE_TABS.map((tab) => (
          <button
            key={tab.id}
            className={styles.mobileTab}
            data-active={mobileTab === tab.id}
            onClick={() => setMobileTab(tab.id)}
          >
            <span
              className={styles.mobileTabIcon}
              style={{ color: mobileTab === tab.id ? tab.color : 'var(--text-muted)' }}
            >
              {tab.icon}
            </span>
            <span className={styles.mobileTabLabel}>{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
