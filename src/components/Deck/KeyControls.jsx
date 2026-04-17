/**
 * KeyControls — Key Shift e Master Tempo
 *
 * Key Shift: sposta il tono di ±6 semitoni
 * Master Tempo: se attivo, mantiene il tempo invariato
 *   (usa AudioBufferSourceNode.detune — supportato da tutti i browser moderni)
 *
 * Tonalità visualizzata come: C, C#, D, D#, E, F, F#, G, G#, A, A#, B
 */

import React, { useCallback } from 'react'
import { audioEngine } from '@audio/AudioEngine.js'
import { useDeckStore } from '@store/useDeckStore.js'

const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']

function semitoneLabel(n) {
  if (n === 0) return '♩ 0'
  return (n > 0 ? '+' : '') + n
}

export default function KeyControls({ deckId }) {
  const keyShift = useDeckStore((s) => s.decks[deckId]?.keyShift ?? 0)
  const masterTempo = useDeckStore((s) => s.decks[deckId]?.masterTempo ?? false)
  const setKeyShift = useDeckStore((s) => s.setKeyShift)
  const setMasterTempo = useDeckStore((s) => s.setMasterTempo)

  const deckColor = deckId === 'A' ? 'var(--deck-a)' : 'var(--deck-b)'

  const applyKeyShift = useCallback((semitones) => {
    try {
      const eng = audioEngine.deck(deckId)
      // Key shift via detune (100 cents = 1 semitono)
      const keyDetune = semitones * 100
      const masterTempoComp = masterTempo ? -1200 * Math.log2(eng._playbackRate || 1) : 0
      if (eng._source) {
        eng._source.detune.setTargetAtTime(keyDetune + masterTempoComp, eng.ctx.currentTime, 0.02)
      }
      eng._keyShiftSemitones = semitones
    } catch(_) {}
    setKeyShift(deckId, semitones)
  }, [deckId, masterTempo, setKeyShift])

  const handleShiftDown = useCallback(() => {
    applyKeyShift(Math.max(-6, keyShift - 1))
  }, [keyShift, applyKeyShift])

  const handleShiftUp = useCallback(() => {
    applyKeyShift(Math.min(6, keyShift + 1))
  }, [keyShift, applyKeyShift])

  const handleReset = useCallback(() => {
    applyKeyShift(0)
  }, [applyKeyShift])

  const handleMasterTempo = useCallback(() => {
    const next = !masterTempo
    setMasterTempo(deckId, next)
    try {
      const eng = audioEngine.deck(deckId)
      eng.setMasterTempo(next)
    } catch(_) {}
  }, [deckId, masterTempo, setMasterTempo])

  const isActive = keyShift !== 0

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '2px 4px' }}>

      {/* Label KEY */}
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.1em', flexShrink: 0 }}>
        KEY
      </span>

      {/* Semitone down */}
      <button onClick={handleShiftDown} disabled={keyShift <= -6} style={btnStyle}>♭</button>

      {/* Display semitoni */}
      <button
        onClick={handleReset}
        title="Reset a 0"
        style={{
          minWidth: 36, height: 22,
          border: `1px solid ${isActive ? deckColor : 'var(--border-default)'}`,
          background: isActive ? `${deckColor}22` : 'transparent',
          color: isActive ? deckColor : 'var(--text-secondary)',
          fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700,
          borderRadius: 3, cursor: 'pointer', textAlign: 'center',
        }}
      >
        {semitoneLabel(keyShift)}
      </button>

      {/* Semitone up */}
      <button onClick={handleShiftUp} disabled={keyShift >= 6} style={btnStyle}>♯</button>

      {/* Master Tempo */}
      <button
        onClick={handleMasterTempo}
        title="Master Tempo — mantiene il tempo invariato"
        style={{
          height: 22, padding: '0 7px',
          border: `1px solid ${masterTempo ? deckColor : 'var(--border-default)'}`,
          background: masterTempo ? deckColor : 'transparent',
          color: masterTempo ? '#000' : 'var(--text-muted)',
          fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700,
          borderRadius: 3, cursor: 'pointer', letterSpacing: '0.05em', flexShrink: 0,
        }}
      >
        M.TEMPO
      </button>
    </div>
  )
}

const btnStyle = {
  width: 24, height: 22,
  border: '1px solid var(--border-default)',
  background: 'transparent',
  color: 'var(--text-secondary)',
  fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700,
  borderRadius: 3, cursor: 'pointer',
}
