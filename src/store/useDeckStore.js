/**
 * useDeckStore — stato UI per tutti i deck
 *
 * Contiene lo stato visuale/logico del deck.
 * La sorgente di verità audio rimane in DeckEngine.
 * Questo store guida la UI (React) e coordina le azioni.
 */

import { create } from 'zustand'

const makeDeckState = (id) => ({
  id,
  /** Metadati traccia */
  trackTitle: null,
  trackArtist: null,
  trackDuration: 0,

  /** Transport */
  playing: false,
  position: 0,        // secondi
  progress: 0,        // 0.0 → 1.0

  /** Jog */
  jogAngle: 0,        // angolo visuale del jog wheel (gradi)
  jogMode: 'nudge',   // 'nudge' | 'scratch'

  /** Pitch */
  playbackRate: 1.0,
  bpm: null,
  keyShift: 0,      // semitoni (-6..+6)
  masterTempo: false, // Master Tempo attivo

  /** Cue */
  cuePoint: 0,
  hotCues: [null, null, null, null, null, null, null, null],
  hotCueColors: ['#ff3b30','#ff9500','#ffcc00','#34c759','#00c7be','#007aff','#9b59b6','#ff2d55'],
  hotCueBank: 0,  // 0-3 (4 bank da 8 cue ciascuno = 32 cue totali)
  hotCueBanks: [
    [null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null],
  ],

  /** Sync */
  syncEnabled: false,
  syncMaster: false,

  /** Quantize */
  quantize: false,

  /** Loop */
  loopActive: false,
  loopIn: null,
  loopOut: null,
  loopBeats: 0,
})

export const useDeckStore = create((set, get) => ({
  decks: {
    A: makeDeckState('A'),
    B: makeDeckState('B'),
    // Aggiungere C e D qui per espansione 4 deck
  },

  // ── Helpers ──────────────────────────────────

  /** Restituisce lo stato di un deck */
  getDeck: (id) => get().decks[id],

  /** Aggiorna campi parziali di un deck */
  updateDeck: (id, patch) =>
    set((state) => ({
      decks: {
        ...state.decks,
        [id]: { ...state.decks[id], ...patch },
      },
    })),

  // ── Transport ────────────────────────────────

  setPlaying: (id, playing) =>
    set((state) => ({
      decks: { ...state.decks, [id]: { ...state.decks[id], playing } },
    })),

  setPosition: (id, position, progress) =>
    set((state) => ({
      decks: { ...state.decks, [id]: { ...state.decks[id], position, progress } },
    })),

  // ── Jog ─────────────────────────────────────

  setJogAngle: (id, jogAngle) =>
    set((state) => ({
      decks: { ...state.decks, [id]: { ...state.decks[id], jogAngle } },
    })),

  setJogMode: (id, jogMode) =>
    set((state) => ({
      decks: { ...state.decks, [id]: { ...state.decks[id], jogMode } },
    })),

  // ── Track ────────────────────────────────────

  setTrack: (id, { title, artist, duration }) =>
    set((state) => ({
      decks: {
        ...state.decks,
        [id]: {
          ...state.decks[id],
          trackTitle: title,
          trackArtist: artist,
          trackDuration: duration,
          position: 0,
          progress: 0,
          playing: false,       // sempre false al caricamento
          bpm: null,            // reset BPM — verrà impostato dal detector
        },
      },
    })),

  // ── Cue ─────────────────────────────────────

  setCuePoint: (id, cuePoint) =>
    set((state) => ({
      decks: { ...state.decks, [id]: { ...state.decks[id], cuePoint } },
    })),

  setHotCueBank: (id, bank) =>
    set((state) => {
      const deck = state.decks[id]
      // Salva le hot cue correnti nel bank corrente
      const newBanks = deck.hotCueBanks.map((b, i) =>
        i === deck.hotCueBank ? [...deck.hotCues] : b
      )
      // Carica le hot cue del nuovo bank
      return {
        decks: {
          ...state.decks,
          [id]: {
            ...deck,
            hotCueBanks: newBanks,
            hotCueBank: bank,
            hotCues: [...newBanks[bank]],
          },
        },
      }
    }),

  setHotCue: (id, index, position) =>
    set((state) => {
      const hotCues = [...state.decks[id].hotCues]
      hotCues[index] = position
      return {
        decks: { ...state.decks, [id]: { ...state.decks[id], hotCues } },
      }
    }),

  // ── Pitch / BPM ─────────────────────────────

  setQuantize: (id, value) =>
    set((state) => ({
      decks: { ...state.decks, [id]: { ...state.decks[id], quantize: value } },
    })),

  setSyncMaster: (id, value) =>
    set((state) => ({
      decks: { ...state.decks, [id]: { ...state.decks[id], syncMaster: value } },
    })),

  setLoop: (id, patch) =>
    set((state) => ({
      decks: { ...state.decks, [id]: { ...state.decks[id], ...patch } },
    })),

  setPlaybackRate: (id, playbackRate) =>
    set((state) => ({
      decks: { ...state.decks, [id]: { ...state.decks[id], playbackRate } },
    })),

  setKeyShift: (id, semitones) =>
    set((state) => ({
      decks: { ...state.decks, [id]: { ...state.decks[id], keyShift: semitones } },
    })),

  setMasterTempo: (id, val) =>
    set((state) => ({
      decks: { ...state.decks, [id]: { ...state.decks[id], masterTempo: val } },
    })),

  setBPM: (id, bpm) =>
    set((state) => ({
      decks: { ...state.decks, [id]: { ...state.decks[id], bpm } },
    })),
}))

// Aggiunte per sync e quantize
// (append a useDeckStore - le funzioni vanno dentro il create)
