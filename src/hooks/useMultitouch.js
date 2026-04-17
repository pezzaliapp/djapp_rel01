/**
 * useMultitouch — routing multitouch globale
 *
 * Problema che risolve:
 *   Su iPhone, quando due dita toccano due jog wheel diversi,
 *   gli eventi touch arrivano tutti sullo stesso documento.
 *   Bisogna associare ogni touchIdentifier all'elemento DOM
 *   corretto e mantenere l'associazione per tutta la gesture.
 *
 * Soluzione:
 *   Un registro globale { touchId → deckId } aggiornato
 *   a ogni touchstart. Ogni JogWheel registra il proprio
 *   ref e legge solo i touch che gli appartengono.
 *
 * Uso:
 *   const { registerJogRef, getTouchOwner } = useMultitouch()
 *   // Dentro JogWheel A:
 *   registerJogRef('A', svgRef)
 */

import { useRef, useCallback } from 'react'

// Registro singleton (condiviso tra tutti i componenti montati)
const _touchToDeck = new Map()      // touchId → deckId
const _jogRefs = new Map()          // deckId → DOM element ref

/**
 * Registra quale elemento DOM appartiene a quale deck.
 * Deve essere chiamato al mount del componente JogWheel.
 */
export function registerJogRef(deckId, element) {
  if (element) {
    _jogRefs.set(deckId, element)
  } else {
    _jogRefs.delete(deckId)
  }
}

/**
 * Dato un touch (da event.touches o event.changedTouches),
 * determina a quale deck appartiene basandosi
 * sul target element o sul registro pre-esistente.
 */
export function resolveTouchDeck(touch) {
  // 1. Già associato → usa il mapping esistente
  if (_touchToDeck.has(touch.identifier)) {
    return _touchToDeck.get(touch.identifier)
  }

  // 2. Prova con elementFromPoint (affidabile su touchstart)
  const el = document.elementFromPoint(touch.clientX, touch.clientY)

  for (const [deckId, jogEl] of _jogRefs) {
    if (jogEl && jogEl.contains(el)) {
      _touchToDeck.set(touch.identifier, deckId)
      return deckId
    }
  }

  return null
}

/**
 * Rimuove un touch dal registro (chiamare su touchend/touchcancel)
 */
export function releaseTouchId(touchId) {
  _touchToDeck.delete(touchId)
}

/**
 * Hook React che espone le utility multitouch.
 * Può essere esteso per subscriber/listener reattivi.
 */
export function useMultitouch() {
  return {
    registerJogRef,
    resolveTouchDeck,
    releaseTouchId,
    /** Debug: restituisce lo stato del registro */
    dumpRegistry: () => ({
      touchToDeck: Object.fromEntries(_touchToDeck),
      jogRefs: Array.from(_jogRefs.keys()),
    }),
  }
}
