/**
 * AudioEngine — singleton centrale
 *
 * Catena audio corretta:
 *   DeckA ──┐
 *   DeckB ──┤→ masterGain → FXEngine (color fx) → BeatFXEngine → destination
 *
 * FXEngine e BeatFXEngine sono in serie sul master bus.
 */

import { DeckEngine } from './DeckEngine.js'
import { LoopEngine } from './LoopEngine.js'
import { FXEngine } from './FXEngine.js'
import { BeatFXEngine } from './BeatFXEngine.js'
import { SyncEngine } from './SyncEngine.js'
import { SmoothEchoEngine } from './SmoothEchoEngine.js'

class AudioEngine {
  constructor() {
    this.ctx = null
    this.masterGain = null
    this.decks = {}
    this.fx = null
    this.beatFX = null
    this.sync = null
    this._ready = false
  }

  async init() {
    if (this._ready) {
      if (this.ctx?.state === 'suspended') await this.ctx.resume()
      return
    }

    this.ctx = new (window.AudioContext || window.webkitAudioContext)({
      latencyHint: 'interactive',
    })

    if (this.ctx.state === 'suspended') await this.ctx.resume()

    // ── Nodi della catena master ──────────────────────────
    this.masterGain = this.ctx.createGain()
    this.masterGain.gain.value = 0.85

    // Nodo intermedio per Color FX (in parallelo)
    this._colorFXBus = this.ctx.createGain()
    this._colorFXBus.gain.value = 1

    // Nodo intermedio per Beat FX (in serie dopo Color FX)
    this._beatFXBus = this.ctx.createGain()
    this._beatFXBus.gain.value = 1

    // ── Catena principale: masterGain → destination ──────
    this.masterGain.connect(this.ctx.destination)

    // ── Color FX: wet parallelo su masterGain → destination ──
    this.fx = new FXEngine(this.ctx, this.masterGain, this.ctx.destination)

    // ── Beat FX: wet parallelo su masterGain → destination ──
    this.beatFX = new BeatFXEngine(this.ctx)
    this.beatFX.connect(this.masterGain, this.ctx.destination)

    // ── Deck ─────────────────────────────────────────────
    for (const id of ['A', 'B']) {
      this.decks[id] = new DeckEngine(this.ctx, this.masterGain, id)
      this.decks[id].loop = new LoopEngine(this.decks[id])
    }

    // ── Sync ──────────────────────────────────────────────
    this.sync = new SyncEngine(this)

    this._ready = true
    console.log('[AudioEngine] ready — latency:', this.ctx.baseLatency?.toFixed(3), 's')
  }

  get ready() { return this._ready }

  deck(id) {
    if (!this._ready) throw new Error('AudioEngine not initialized')
    if (!this.decks[id]) throw new Error(`Deck ${id} not found`)
    return this.decks[id]
  }

  setMasterVolume(value) {
    if (!this.masterGain) return
    this.masterGain.gain.setTargetAtTime(value, this.ctx.currentTime, 0.01)
  }

  get now() { return this.ctx?.currentTime ?? 0 }
}

export const audioEngine = new AudioEngine()
