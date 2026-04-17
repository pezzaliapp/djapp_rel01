/**
 * HotCues — 8 hot cue colorati + 4 bank
 *
 * Design professionale: i pulsanti mostrano solo il colore/dot,
 * NON il numero — il numero era fuorviante (sembrava collegato ai tasti 1-8)
 *
 * Tap su slot vuoto → salva posizione
 * Tap su slot pieno → salta e riparte
 * Modalità CLEAR attiva → tap cancella il cue
 */

import React, { useState, useCallback } from 'react'
import { audioEngine } from '@audio/AudioEngine.js'
import { useDeckStore } from '@store/useDeckStore.js'

const BANK_LABELS = ['A', 'B', 'C', 'D']

// Colori fissi per i 8 hot cue (stile Pioneer)
const CUE_COLORS = [
  '#e74c3c', // 1 rosso
  '#e67e22', // 2 arancione
  '#f1c40f', // 3 giallo
  '#2ecc71', // 4 verde
  '#1abc9c', // 5 teal
  '#3498db', // 6 blu
  '#9b59b6', // 7 viola
  '#e91e63', // 8 rosa
]

export default function HotCues({ deckId }) {
  const deck = useDeckStore((s) => s.decks[deckId])
  const setHotCue = useDeckStore((s) => s.setHotCue)
  const setHotCueBank = useDeckStore((s) => s.setHotCueBank)
  const setPlaying = useDeckStore((s) => s.setPlaying)
  const [clearMode, setClearMode] = useState(false)

  const currentBank = deck.hotCueBank ?? 0
  const deckColor = deckId === 'A' ? 'var(--deck-a)' : 'var(--deck-b)'

  const getEng = useCallback(() => {
    if (!audioEngine.ready) return null
    try { return audioEngine.deck(deckId) } catch { return null }
  }, [deckId])

  const handlePress = useCallback(async (index) => {
    if (clearMode) {
      setHotCue(deckId, index, null)
      setClearMode(false)
      return
    }
    const eng = getEng()
    if (!eng?.buffer) return

    const freshCues = useDeckStore.getState().decks[deckId]?.hotCues ?? []
    const cue = freshCues[index] ?? null

    try {
      if (audioEngine.ctx?.state === 'suspended') await audioEngine.ctx.resume()
    } catch(_) {}

    if (cue === null) {
      const pos = eng.position
      if (pos >= 0 && pos <= eng.duration) {
        setHotCue(deckId, index, pos)
      }
    } else {
      const safePos = Math.max(0, Math.min(cue, eng.duration - 0.1))
      try { eng.seek(safePos) } catch(_) {}
      try {
        if (!eng.playing) { eng.play(); setPlaying(deckId, true) }
      } catch(_) {}
    }
  }, [deckId, clearMode, setHotCue, setPlaying, getEng])

  const handleBank = useCallback((bank) => {
    setHotCueBank(deckId, bank)
    setClearMode(false)
  }, [deckId, setHotCueBank])

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 3, padding: '0 4px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.08em', flexShrink: 0 }}>
          HOT CUE
        </span>
        <button onClick={() => setClearMode(v => !v)} style={{
          height: 16, padding: '0 6px', flexShrink: 0,
          border: `1px solid ${clearMode ? '#ff3b30' : 'var(--border-default)'}`,
          background: clearMode ? '#ff3b30' : 'transparent',
          color: clearMode ? '#fff' : 'var(--text-muted)',
          fontFamily: 'var(--font-mono)', fontSize: 8, fontWeight: 700,
          borderRadius: 3, cursor: 'pointer',
        }}>
          {clearMode ? '✕ CLR' : 'CLR'}
        </button>
        <div style={{ display: 'flex', gap: 2, marginLeft: 'auto' }}>
          {BANK_LABELS.map((label, i) => (
            <button key={i} onClick={() => handleBank(i)} style={{
              width: 20, height: 16,
              border: `1px solid ${currentBank === i ? deckColor : 'var(--border-default)'}`,
              background: currentBank === i ? deckColor : 'transparent',
              color: currentBank === i ? '#000' : 'var(--text-muted)',
              fontFamily: 'var(--font-mono)', fontSize: 8, fontWeight: 700,
              borderRadius: 3, cursor: 'pointer',
            }}>{label}</button>
          ))}
        </div>
      </div>

      {/* Riga 1: cue 1-4 */}
      <div style={{ display: 'flex', gap: 3 }}>
        {[0,1,2,3].map((i) => (
          <CueBtn key={i} index={i} cue={deck.hotCues[i]}
            color={CUE_COLORS[i]} clearMode={clearMode} onPress={handlePress} />
        ))}
      </div>

      {/* Riga 2: cue 5-8 */}
      <div style={{ display: 'flex', gap: 3 }}>
        {[4,5,6,7].map((i) => (
          <CueBtn key={i} index={i} cue={deck.hotCues[i]}
            color={CUE_COLORS[i]} clearMode={clearMode} onPress={handlePress} />
        ))}
      </div>

    </div>
  )
}

function CueBtn({ index, cue, color, clearMode, onPress }) {
  const isSet = cue !== null
  const showDelete = clearMode && isSet

  return (
    <button
      onClick={() => onPress(index)}
      onContextMenu={(e) => { e.preventDefault(); onPress(index) }}
      title={isSet ? `Cue ${index + 1} — click per richiamare` : `Cue ${index + 1} — click per impostare`}
      style={{
        flex: 1,
        height: 28,
        borderRadius: 4,
        border: `2px solid ${showDelete ? '#ff3b30' : isSet ? color : 'var(--border-default)'}`,
        background: showDelete ? '#ff3b3022'
                  : isSet      ? `${color}cc`
                  :              `${color}18`,
        cursor: 'pointer',
        transition: 'all 80ms ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Dot centrale — presente sempre, pieno se cue è impostato */}
      <span style={{
        width: showDelete ? 10 : isSet ? 10 : 5,
        height: showDelete ? 10 : isSet ? 10 : 5,
        borderRadius: '50%',
        background: showDelete ? '#ff3b30'
                   : isSet     ? '#fff'
                   :             color,
        opacity: showDelete ? 1 : isSet ? 0.9 : 0.4,
        transition: 'all 80ms ease',
        display: 'block',
        flexShrink: 0,
      }} />

      {/* X in modalità CLR */}
      {showDelete && (
        <span style={{
          position: 'absolute',
          fontFamily: 'var(--font-mono)',
          fontSize: 10, fontWeight: 700,
          color: '#ff3b30',
        }}>✕</span>
      )}
    </button>
  )
}
