/**
 * useJogControl — hook ad alto livello per il controllo jog
 *
 * Astrae la logica che collega:
 *   gesti touch/mouse → DeckEngine (scratch/nudge)
 *
 * Usato internamente da JogWheel ma esportato per
 * eventuali controller MIDI o shortcut tastiera futuri.
 *
 * @param {string} deckId - 'A' | 'B' | 'C' | 'D'
 */

import { useCallback, useRef } from 'react'
import { audioEngine } from '@audio/AudioEngine.js'
import { useDeckStore } from '@store/useDeckStore.js'
import { computeScratchRate } from '@utils/angleUtils.js'

export function useJogControl(deckId) {
  const jogMode = useDeckStore((s) => s.decks[deckId]?.jogMode ?? 'nudge')
  const isNudging = useRef(false)

  /**
   * Chiamata ad ogni frame del gesto jog.
   * @param {number} deltaAngle - delta angolare in gradi
   * @param {number} deltaTime  - delta tempo in ms
   */
  const onJogDelta = useCallback((deltaAngle, deltaTime) => {
    if (!audioEngine.ready) return

    let deck
    try { deck = audioEngine.deck(deckId) } catch { return }

    if (jogMode === 'scratch') {
      // Scratch: riposiziona l'audio proporzionalmente alla rotazione
      const { scratchRate } = computeScratchRate(deltaAngle, deltaTime)
      deck.scratch(deltaAngle, scratchRate)
      isNudging.current = false

    } else {
      // Nudge: piccola accelerazione/decelerazione temporanea
      // Mappatura: ±180°/frame → ±15% velocità
      const maxNudge = 0.15
      const factor = 1 + (deltaAngle / 180) * maxNudge
      deck.nudge(Math.max(0.5, Math.min(2.0, factor)))
      isNudging.current = true
    }
  }, [deckId, jogMode])

  /**
   * Chiamata al rilascio del gesto.
   */
  const onJogRelease = useCallback(() => {
    if (!audioEngine.ready) return
    if (!isNudging.current) return

    try {
      audioEngine.deck(deckId).nudgeRelease()
    } catch { }
    isNudging.current = false
  }, [deckId])

  /**
   * Chiamata all'inizio del gesto scratch.
   * Mette in pausa il playback (classic scratch behavior).
   */
  const onScratchStart = useCallback(() => {
    if (jogMode !== 'scratch') return
    if (!audioEngine.ready) return
    // Opzionale: in modalità scratch il piatto "stacca" dal motore
    // Implementazione avanzata: AudioWorklet ScratchNode
  }, [jogMode])

  return { onJogDelta, onJogRelease, onScratchStart }
}
