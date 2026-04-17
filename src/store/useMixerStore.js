/**
 * useMixerStore — stato del mixer centrale
 */

import { create } from 'zustand'

const makeChannelState = (id) => ({
  id,
  gain: 0.8,        // 0.0 → 1.0
  eqLow: 0,         // dB, -12 → +12
  eqMid: 0,
  eqHigh: 0,
  muted: false,
})

export const useMixerStore = create((set, get) => ({
  channels: {
    A: makeChannelState('A'),
    B: makeChannelState('B'),
  },

  /** Crossfader: 0.0 = full A, 1.0 = full B, 0.5 = center */
  crossfader: 0.5,

  masterVolume: 0.9,

  // ── Channel ─────────────────────────────────

  setChannelGain: (id, gain) =>
    set((state) => ({
      channels: { ...state.channels, [id]: { ...state.channels[id], gain } },
    })),

  setEQ: (id, band, value) =>
    set((state) => ({
      channels: {
        ...state.channels,
        [id]: { ...state.channels[id], [`eq${band}`]: value },
      },
    })),

  toggleMute: (id) =>
    set((state) => ({
      channels: {
        ...state.channels,
        [id]: { ...state.channels[id], muted: !state.channels[id].muted },
      },
    })),

  // ── Crossfader ───────────────────────────────

  setCrossfader: (value) => set({ crossfader: Math.max(0, Math.min(1, value)) }),

  /**
   * Calcola il gain effettivo per ogni canale dato il crossfader.
   * Curva lineare di default (sostituibile con curva Custom).
   */
  getCrossfaderGains: () => {
    const { crossfader } = get()
    return {
      A: Math.cos(crossfader * 0.5 * Math.PI),
      B: Math.cos((1 - crossfader) * 0.5 * Math.PI),
    }
  },

  // ── Master ───────────────────────────────────

  setMasterVolume: (value) => set({ masterVolume: Math.max(0, Math.min(1, value)) }),
}))
