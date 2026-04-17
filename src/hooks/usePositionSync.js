/**
 * usePositionSync — aggiorna solo playing state quando finisce un brano
 * NON aggiorna position (causa re-render instabili)
 */

import { useEffect } from 'react'
import { audioEngine } from '@audio/AudioEngine.js'
import { useDeckStore } from '@store/useDeckStore.js'

const DECK_IDS = ['A', 'B']

export function usePositionSync() {
  useEffect(() => {
    let rafId
    const sync = () => {
      if (audioEngine.ready) {
        const setPlaying = useDeckStore.getState().setPlaying
        const decks = useDeckStore.getState().decks
        for (const id of DECK_IDS) {
          try {
            const eng = audioEngine.deck(id)
            // Solo quando il brano finisce naturalmente
            if (decks[id]?.playing && !eng.playing) {
              setPlaying(id, false)
            }
          } catch(_) {}
        }
      }
      rafId = requestAnimationFrame(sync)
    }
    rafId = requestAnimationFrame(sync)
    return () => cancelAnimationFrame(rafId)
  }, [])
}
