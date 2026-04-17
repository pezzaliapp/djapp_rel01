/**
 * DeckEngine — motore audio per un singolo deck
 *
 * Chain audio:
 *   AudioBufferSourceNode
 *     → lowFilter → midFilter → highFilter
 *     → channelGain → masterBus
 */

export class DeckEngine {
  constructor(ctx, masterBus, id) {
    this.ctx = ctx
    this.id = id
    this.buffer = null
    this._source = null
    this._startOffset = 0
    this._startTime = 0
    this._playing = false
    this._playbackRate = 1.0

    // Scratch state
    this._scratchActive = false
    this._scratchPosition = 0  // posizione "congelata" durante scratch

    // Nodi audio
    this.channelGain = ctx.createGain()
    this.channelGain.gain.value = 0.8

    this.lowFilter = ctx.createBiquadFilter()
    this.lowFilter.type = 'lowshelf'
    this.lowFilter.frequency.value = 200
    this.lowFilter.gain.value = 0

    this.midFilter = ctx.createBiquadFilter()
    this.midFilter.type = 'peaking'
    this.midFilter.frequency.value = 1000
    this.midFilter.Q.value = 1
    this.midFilter.gain.value = 0

    this.highFilter = ctx.createBiquadFilter()
    this.highFilter.type = 'highshelf'
    this.highFilter.frequency.value = 4000
    this.highFilter.gain.value = 0

    this.lowFilter.connect(this.midFilter)
    this.midFilter.connect(this.highFilter)
    this.highFilter.connect(this.channelGain)
    this.channelGain.connect(masterBus)
  }

  // ── Load ─────────────────────────────────────────────

  async loadFile(fileOrBuffer) {
    // Ferma tutto prima di caricare
    this._stopSource()
    this._playing = false
    this._startOffset = 0
    this._scratchActive = false

    let arrayBuffer
    if (fileOrBuffer instanceof File) {
      arrayBuffer = await fileOrBuffer.arrayBuffer()
    } else {
      arrayBuffer = fileOrBuffer
    }

    try {
      this.buffer = await this.ctx.decodeAudioData(arrayBuffer)
      this._startOffset = 0
      return true
    } catch (err) {
      console.error(`[Deck ${this.id}] decode error:`, err)
      return false
    }
  }

  // ── Transport ─────────────────────────────────────────

  play() {
    if (!this.buffer || this._playing) return
    this._startSource(this._startOffset)
  }

  pause() {
    if (!this._playing) return
    this._startOffset = this._currentPosition()
    this._stopSource()
    this._playing = false
  }

  stop() {
    this._stopSource()
    this._playing = false
    this._startOffset = 0
  }

  seek(posSeconds) {
    if (!this.buffer) return
    if (isNaN(posSeconds) || posSeconds < 0) posSeconds = 0
    const wasPlaying = this._playing
    if (this._playing) {
      this._stopSource()
      this._playing = false
    }
    this._startOffset = this._clamp(posSeconds)
    if (wasPlaying) this._startSource(this._startOffset)
  }

  cue(posSeconds) {
    this.pause()
    this._startOffset = this._clamp(posSeconds)
  }

  // ── NUDGE ─────────────────────────────────────────────
  // Chiamato durante il drag sul bordo esterno del jog.
  // deltaAngle in gradi, positivo = avanti (CW), negativo = indietro (CCW)

  nudge(deltaAngleDeg) {
    if (!this._source || !this._playing) return
    // deltaAngleDeg è il delta per frame (piccolo).
    // Accumula una velocità proporzionale alla direzione.
    // +5% per ogni grado/frame in senso orario, -5% CCW
    const sign = deltaAngleDeg >= 0 ? 1 : -1
    const magnitude = Math.min(Math.abs(deltaAngleDeg) * 0.08, 0.25)
    const factor = 1.0 + sign * magnitude
    const clamped = Math.max(0.6, Math.min(1.4, factor))
    this._source.playbackRate.setTargetAtTime(clamped, this.ctx.currentTime, 0.01)
  }

  nudgeRelease() {
    if (!this._source) return
    // Torna alla velocità normale
    this._source.playbackRate.setTargetAtTime(
      this._playbackRate, this.ctx.currentTime, 0.05
    )
  }

  // ── SCRATCH ───────────────────────────────────────────
  // scratchStart: tocchi il piatto → musica si ferma, posizione congelata
  // scratchMove:  muovi → posizione avanza/indietreggia con la mano
  // scratchEnd:   rilasci → riprendi da dove sei

  scratchStart() {
    if (!this.buffer) return
    this._scratchActive = true
    this._scratchPosition = this._currentPosition()
    // Ferma la riproduzione ma NON resetta la posizione
    if (this._playing) {
      this._stopSource()
      this._playing = false
    }
  }

  scratchMove(deltaAngleDeg) {
    if (!this._scratchActive || !this.buffer) return
    // 1 rotazione completa (360°) = ~1.8 secondi audio (come vinile 33rpm)
    const SECS_PER_ROTATION = 60 / 33.3
    const deltaSeconds = (deltaAngleDeg / 360) * SECS_PER_ROTATION
    this._scratchPosition = this._clamp(this._scratchPosition + deltaSeconds)
    this._startOffset = this._scratchPosition

    // Riproduci in avanti o in dietro brevemente per sentire il suono
    // (riavvia il source dalla nuova posizione per simulare scratch audio)
    this._stopSource()
    if (Math.abs(deltaAngleDeg) > 0.5) {
      this._startSource(this._scratchPosition)
      // Ferma subito dopo un frammento breve (scratch sound)
      setTimeout(() => {
        if (this._scratchActive) {
          this._stopSource()
          this._playing = false
        }
      }, 80)
    }
  }

  scratchEnd() {
    if (!this._scratchActive) return
    this._scratchActive = false
    this._startOffset = this._scratchPosition
    // Riprendi la riproduzione dalla posizione di scratch
    this._startSource(this._startOffset)
  }

  // ── Parametri ────────────────────────────────────────

  setGain(value) {
    this.channelGain.gain.setTargetAtTime(value, this.ctx.currentTime, 0.01)
  }

  /**
   * Key Shift — sposta il pitch di N semitoni
   * Se masterTempo=true, corregge il rate per mantenere il tempo
   * (approssimazione: usa un secondo playback compensato)
   */
  setKeyShift(semitones, masterTempo = false) {
    // 1 semitono = 2^(1/12) ≈ 1.0595
    const pitchFactor = Math.pow(2, semitones / 12)
    if (masterTempo) {
      // Master Tempo: cambia pitch ma compensa la velocità
      // Usiamo detune sul BufferSource (Chrome supporta detune)
      this._keyShiftSemitones = semitones
      this._masterTempo = true
      if (this._source) {
        try {
          // detune è in cents (100 cents = 1 semitono)
          this._source.detune.setTargetAtTime(semitones * 100, this.ctx.currentTime, 0.01)
        } catch (_) {
          // Fallback: playbackRate
          this.setPlaybackRate(this._playbackRate * pitchFactor)
        }
      }
    } else {
      // Key Shift senza Master Tempo: cambia pitch E tempo
      this._keyShiftSemitones = semitones
      this._masterTempo = false
      this.setPlaybackRate(this._playbackRate * pitchFactor / Math.pow(2, (this._prevKeyShift ?? 0) / 12))
    }
    this._prevKeyShift = semitones
  }

  setPlaybackRate(rate) {
    this._playbackRate = rate
    if (this._source) {
      this._source.playbackRate.setTargetAtTime(rate, this.ctx.currentTime, 0.01)
    }
  }

  setEQ(band, gainDb) {
    const filter = { low: this.lowFilter, mid: this.midFilter, high: this.highFilter }[band]
    if (filter) filter.gain.setTargetAtTime(gainDb, this.ctx.currentTime, 0.01)
  }

  // ── Getters ──────────────────────────────────────────

  get playing() { return this._playing }
  get duration() { return this.buffer?.duration ?? 0 }
  get position() { return this._currentPosition() }
  get progress() { return this.duration > 0 ? this._currentPosition() / this.duration : 0 }
  get scratchActive() { return this._scratchActive }

  // ── Privati ──────────────────────────────────────────

  _startSource(fromPosition) {
    if (!this.buffer) return
    this._stopSource()
    this._source = this.ctx.createBufferSource()
    this._source.buffer = this.buffer
    this._source.playbackRate.value = this._playbackRate
    this._source.connect(this.lowFilter)

    const src = this._source
    src.onended = () => {
      if (this._source === src && this._playing && !this._scratchActive) {
        this._playing = false
        this._startOffset = 0
      }
    }

    // Applica detune: Key Shift + eventuale compensazione Master Tempo
    try {
      let detune = (this._keyShiftSemitones ?? 0) * 100
      if (this._masterTempo) {
        detune += -1200 * Math.log2(this._playbackRate)
      }
      if (detune !== 0) this._source.detune.value = detune
    } catch(_) {}
    this._source.start(0, this._clamp(fromPosition))
    this._startTime = this.ctx.currentTime
    this._playing = true
  }

  _stopSource() {
    if (this._source) {
      this._source.onended = null
      try { this._source.stop() } catch (_) {}
      this._source = null
    }
  }

  _currentPosition() {
    if (!this._playing) return this._startOffset
    return this._startOffset + (this.ctx.currentTime - this._startTime) * this._playbackRate
  }

  _clamp(pos) {
    return Math.max(0, Math.min(pos, this.buffer?.duration ?? 0))
  }
}
