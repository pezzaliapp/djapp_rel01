/**
 * useKeyboardShortcuts — scorciatoie da tastiera per djApp
 *
 * DECK A (tasto sinistro):
 *   Spazio        → Play/Pause deck A
 *   Z             → CUE deck A
 *   1-8           → Hot Cue 1-8 deck A
 *   ArrowLeft     → Beat Jump -1 deck A
 *   ArrowRight    → Beat Jump +1 deck A
 *   Q / E         → Key Shift ♭/♯ deck A
 *
 * DECK B (tasto destro):
 *   Enter         → Play/Pause deck B
 *   M             → CUE deck B
 *   F1-F8         → Hot Cue 1-8 deck B
 *   ArrowUp       → Beat Jump +1 deck B
 *   ArrowDown     → Beat Jump -1 deck B
 *   O / P         → Key Shift ♭/♯ deck B
 *
 * GLOBALI:
 *   Esc           → Stop entrambi i deck
 *   ?             → Mostra/nasconde help
 */

import { useEffect, useCallback, useState } from 'react'
import { audioEngine } from '@audio/AudioEngine.js'
import { useDeckStore } from '@store/useDeckStore.js'

export function useKeyboardShortcuts() {
  const [showHelp, setShowHelp] = useState(false)

  const getState = useDeckStore.getState

  const triggerDeck = useCallback((deckId, action) => {
    if (!audioEngine.ready) return
    try {
      const eng = audioEngine.deck(deckId)
      const state = getState().decks[deckId]

      switch (action) {
        case 'play': {
          if (eng.playing) { eng.pause(); useDeckStore.getState().setPlaying(deckId, false) }
          else { eng.play(); useDeckStore.getState().setPlaying(deckId, true) }
          break
        }
        case 'cue': {
          const cue = state.cuePoint ?? 0
          eng.seek(cue)
          if (!eng.playing) { eng.play(); useDeckStore.getState().setPlaying(deckId, true) }
          break
        }
        case 'stop': {
          eng.pause(); eng.seek(0)
          useDeckStore.getState().setPlaying(deckId, false)
          break
        }
        case 'jumpBack': {
          eng.loop?.beatJump(-1) ?? eng.seek(Math.max(0, eng.position - (60 / (state.bpm ?? 120))))
          break
        }
        case 'jumpFwd': {
          eng.loop?.beatJump(1) ?? eng.seek(Math.min(eng.duration, eng.position + (60 / (state.bpm ?? 120))))
          break
        }
        case 'keyDown': {
          const s = (state.keyShift ?? 0) - 1
          eng.setKeyShift(Math.max(-6, s), state.masterTempo)
          useDeckStore.getState().setKeyShift(deckId, Math.max(-6, s))
          break
        }
        case 'keyUp': {
          const s = (state.keyShift ?? 0) + 1
          eng.setKeyShift(Math.min(6, s), state.masterTempo)
          useDeckStore.getState().setKeyShift(deckId, Math.min(6, s))
          break
        }
      }
    } catch(_) {}
  }, [getState])

  const triggerHotCue = useCallback((deckId, index) => {
    if (!audioEngine.ready) return
    try {
      const eng = audioEngine.deck(deckId)
      const freshCues = useDeckStore.getState().decks[deckId]?.hotCues ?? []
      const cue = freshCues[index] ?? null
      if (cue === null) {
        const pos = eng.position
        if (pos >= 0 && pos <= eng.duration) {
          useDeckStore.getState().setHotCue(deckId, index, pos)
        }
      } else {
        eng.seek(Math.max(0, Math.min(cue, eng.duration - 0.1)))
        if (!eng.playing) { eng.play(); useDeckStore.getState().setPlaying(deckId, true) }
      }
    } catch(_) {}
  }, [])

  useEffect(() => {
    const onKey = (e) => {
      // Ignora se sta digitando in un input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return

      const key = e.key

      // Help
      if (key === '?') { e.preventDefault(); setShowHelp(v => !v); return }

      // Stop globale
      if (key === 'Escape') {
        e.preventDefault()
        triggerDeck('A', 'stop')
        triggerDeck('B', 'stop')
        return
      }

      // ── DECK A ──
      if (key === ' ') { e.preventDefault(); triggerDeck('A', 'play'); return }
      if (key === 'z' || key === 'Z') { e.preventDefault(); triggerDeck('A', 'cue'); return }
      if (key === 'ArrowLeft') { e.preventDefault(); triggerDeck('A', 'jumpBack'); return }
      if (key === 'ArrowRight') { e.preventDefault(); triggerDeck('A', 'jumpFwd'); return }
      if (key === 'q' || key === 'Q') { e.preventDefault(); triggerDeck('A', 'keyDown'); return }
      if (key === 'e' || key === 'E') { e.preventDefault(); triggerDeck('A', 'keyUp'); return }

      // Hot cue A: tasti 1-8
      if (/^[1-8]$/.test(key) && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault()
        triggerHotCue('A', parseInt(key) - 1)
        return
      }

      // ── DECK B ──
      if (key === 'Enter') { e.preventDefault(); triggerDeck('B', 'play'); return }
      if (key === 'm' || key === 'M') { e.preventDefault(); triggerDeck('B', 'cue'); return }
      if (key === 'ArrowUp') { e.preventDefault(); triggerDeck('B', 'jumpFwd'); return }
      if (key === 'ArrowDown') { e.preventDefault(); triggerDeck('B', 'jumpBack'); return }
      if (key === 'o' || key === 'O') { e.preventDefault(); triggerDeck('B', 'keyDown'); return }
      if (key === 'p' || key === 'P') { e.preventDefault(); triggerDeck('B', 'keyUp'); return }

      // Hot cue B: F1-F8
      const fMatch = key.match(/^F([1-8])$/)
      if (fMatch) {
        e.preventDefault()
        triggerHotCue('B', parseInt(fMatch[1]) - 1)
        return
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [triggerDeck, triggerHotCue])

  return { showHelp, setShowHelp }
}
