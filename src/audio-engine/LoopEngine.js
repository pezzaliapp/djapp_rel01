/**
 * LoopEngine — gestione loop per un deck
 *
 * Feature:
 *  - Auto-loop (imposta in/out automaticamente basandosi sui BPM)
 *  - Loop manuale (imposta in/out manualmente)
 *  - Loop halve/double (dimezza/raddoppia la lunghezza)
 *  - Beat Jump (salta ±N battute)
 *  - Active Loop (il loop riparte ogni volta che scade)
 *  - Emergency Loop (loop di emergenza in caso di errore)
 */

export class LoopEngine {
  constructor(deckEngine) {
    this.deck = deckEngine
    this.loopIn = null      // secondi
    this.loopOut = null     // secondi
    this.active = false
    this.beatLength = null  // secondi per battuta (calcolato da BPM)
    this._loopCheckInterval = null
  }

  // ── Setup ─────────────────────────────────────────

  setBPM(bpm) {
    if (bpm > 0) this.beatLength = 60 / bpm
  }

  // ── Auto Loop ────────────────────────────────────
  // Imposta un loop di N battute dalla posizione corrente

  autoLoop(beats) {
    if (!this.beatLength) return false
    const pos = this.deck.position
    this.loopIn = pos
    this.loopOut = pos + this.beatLength * beats
    this.active = true
    this._startLoopCheck()
    return true
  }

  // ── Loop In/Out manuale ──────────────────────────

  setLoopIn() {
    this.loopIn = this.deck.position
    this.active = false
    this._stopLoopCheck()
  }

  setLoopOut() {
    if (this.loopIn === null) return
    this.loopOut = this.deck.position
    if (this.loopOut <= this.loopIn) {
      // Se out < in, sposta in
      this.loopIn = Math.max(0, this.loopOut - (this.beatLength ?? 1))
    }
    this.active = true
    this._startLoopCheck()
  }

  // ── Loop toggle ──────────────────────────────────

  toggleLoop() {
    if (this.active) {
      this.exitLoop()
    } else if (this.loopIn !== null && this.loopOut !== null) {
      this.active = true
      this._startLoopCheck()
    }
  }

  exitLoop() {
    this.active = false
    this._stopLoopCheck()
  }

  // ── Halve / Double ───────────────────────────────

  halve() {
    if (!this.active || this.loopIn === null || this.loopOut === null) return
    const len = (this.loopOut - this.loopIn) / 2
    this.loopOut = this.loopIn + len
  }

  double() {
    if (!this.active || this.loopIn === null || this.loopOut === null) return
    const len = (this.loopOut - this.loopIn) * 2
    this.loopOut = this.loopIn + len
  }

  // ── Beat Jump ────────────────────────────────────
  // Salta ±N battute mantenendo il loop se attivo

  beatJump(beats) {
    if (!this.beatLength) return
    const delta = this.beatLength * beats
    const newPos = Math.max(0, this.deck.position + delta)

    if (this.active && this.loopIn !== null && this.loopOut !== null) {
      // Sposta anche il loop
      this.loopIn += delta
      this.loopOut += delta
    }

    this.deck.seek(newPos)
  }

  // ── Emergency Loop ───────────────────────────────
  // Loop di 4 battute dalla posizione corrente (fallback)

  emergencyLoop() {
    const beats = this.beatLength ? 4 : 2
    const pos = this.deck.position
    this.loopIn = pos
    this.loopOut = pos + (this.beatLength ?? 2) * beats
    this.active = true
    this._startLoopCheck()
  }

  // ── Getters ──────────────────────────────────────

  get loopLength() {
    if (this.loopIn === null || this.loopOut === null) return 0
    return this.loopOut - this.loopIn
  }

  get loopBeats() {
    if (!this.beatLength || !this.loopLength) return 0
    return Math.round(this.loopLength / this.beatLength * 10) / 10
  }

  // ── Loop check RAF ───────────────────────────────

  _startLoopCheck() {
    this._stopLoopCheck()
    const check = () => {
      if (!this.active) return
      if (this.loopOut !== null && this.deck.position >= this.loopOut) {
        this.deck.seek(this.loopIn)
      }
      this._loopCheckInterval = requestAnimationFrame(check)
    }
    this._loopCheckInterval = requestAnimationFrame(check)
  }

  _stopLoopCheck() {
    if (this._loopCheckInterval) {
      cancelAnimationFrame(this._loopCheckInterval)
      this._loopCheckInterval = null
    }
  }

  destroy() {
    this._stopLoopCheck()
  }
}
