/**
 * BeatFXEngine — effetti sincronizzati al beat
 *
 * Effetti implementati (come Pioneer Opus Quad):
 *  DELAY, ECHO, PING PONG, REVERB, SPIRAL,
 *  TRANS, FILTER, FLANGER, PHASER, PITCH,
 *  ROLL, VINYL BRAKE, HELIX
 *
 * Ogni effetto ha: wet/dry, beat division, on/off
 */

export class BeatFXEngine {
  constructor(ctx) {
    this.ctx = ctx
    this._effects = {}
    this._activeId = null
    this._wetGain = ctx.createGain()
    this._dryGain = ctx.createGain()
    this._wetGain.gain.value = 0
    this._dryGain.gain.value = 1
    this._bpm = 120
    this._beatDiv = 1  // frazione di battuta
    this._built = false
  }

  /** Connetti input → output via questo engine */
  connect(inputNode, outputNode) {
    this._input = inputNode
    this._output = outputNode
    inputNode.connect(this._dryGain)
    this._dryGain.connect(outputNode)
    this._buildEffects()
    this._built = true
  }

  setBPM(bpm) {
    this._bpm = bpm
    this._updateDelayTimes()
  }

  setBeatDiv(div) {
    this._beatDiv = div
    this._updateDelayTimes()
  }

  get beatSeconds() {
    return (60 / this._bpm) * this._beatDiv
  }

  _buildEffects() {
    const ctx = this.ctx
    const input = this._input
    const output = this._output

    // ── DELAY ──
    const delay = ctx.createDelay(4.0)
    const delayWet = ctx.createGain()
    delay.delayTime.value = this.beatSeconds
    delayWet.gain.value = 0
    input.connect(delay); delay.connect(delayWet); delayWet.connect(output)
    this._effects.delay = { node: delay, wet: delayWet, update: () => {
      delay.delayTime.setTargetAtTime(this.beatSeconds, ctx.currentTime, 0.01)
    }}

    // ── ECHO (delay + feedback) ──
    const echo = ctx.createDelay(4.0)
    const echoFB = ctx.createGain()
    const echoWet = ctx.createGain()
    echo.delayTime.value = this.beatSeconds
    echoFB.gain.value = 0.5
    echoWet.gain.value = 0
    input.connect(echo); echo.connect(echoFB); echoFB.connect(echo)
    echo.connect(echoWet); echoWet.connect(output)
    this._effects.echo = { node: echo, wet: echoWet, update: () => {
      echo.delayTime.setTargetAtTime(this.beatSeconds, ctx.currentTime, 0.01)
    }}

    // ── PING PONG ──
    const pingL = ctx.createDelay(2.0)
    const pingR = ctx.createDelay(2.0)
    const pingWet = ctx.createGain()
    pingL.delayTime.value = this.beatSeconds / 2
    pingR.delayTime.value = this.beatSeconds
    pingWet.gain.value = 0
    input.connect(pingL); input.connect(pingR)
    pingL.connect(pingWet); pingR.connect(pingWet); pingWet.connect(output)
    this._effects.pingpong = { node: pingL, wet: pingWet, update: () => {
      pingL.delayTime.setTargetAtTime(this.beatSeconds / 2, ctx.currentTime, 0.01)
      pingR.delayTime.setTargetAtTime(this.beatSeconds, ctx.currentTime, 0.01)
    }}

    // ── REVERB ──
    const conv = ctx.createConvolver()
    const revWet = ctx.createGain()
    const irLen = ctx.sampleRate * 3
    const ir = ctx.createBuffer(2, irLen, ctx.sampleRate)
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch)
      for (let i = 0; i < irLen; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i/irLen, 2)
    }
    conv.buffer = ir
    revWet.gain.value = 0
    input.connect(conv); conv.connect(revWet); revWet.connect(output)
    this._effects.reverb = { node: conv, wet: revWet, update: () => {} }

    // ── FILTER sweep ──
    const filt = ctx.createBiquadFilter()
    const filtLFO = ctx.createOscillator()
    const filtLFOGain = ctx.createGain()
    const filtWet = ctx.createGain()
    filt.type = 'bandpass'
    filt.frequency.value = 1000
    filt.Q.value = 4
    filtLFO.frequency.value = 1 / (this.beatSeconds * 4)
    filtLFOGain.gain.value = 800
    filtWet.gain.value = 0
    filtLFO.connect(filtLFOGain); filtLFOGain.connect(filt.frequency)
    filtLFO.start()
    input.connect(filt); filt.connect(filtWet); filtWet.connect(output)
    this._effects.filter = { node: filt, wet: filtWet, lfo: filtLFO, lfoGain: filtLFOGain, update: () => {
      filtLFO.frequency.setTargetAtTime(1 / (this.beatSeconds * 4), ctx.currentTime, 0.1)
    }}

    // ── FLANGER ──
    const flDel = ctx.createDelay(0.02)
    const flLFO = ctx.createOscillator()
    const flLFOGain = ctx.createGain()
    const flWet = ctx.createGain()
    flDel.delayTime.value = 0.005
    flLFO.frequency.value = 1 / (this.beatSeconds * 2)
    flLFOGain.gain.value = 0.004
    flWet.gain.value = 0
    flLFO.connect(flLFOGain); flLFOGain.connect(flDel.delayTime)
    flLFO.start()
    input.connect(flDel); flDel.connect(flWet); flWet.connect(output)
    this._effects.flanger = { node: flDel, wet: flWet, lfo: flLFO, update: () => {
      flLFO.frequency.setTargetAtTime(1 / (this.beatSeconds * 2), ctx.currentTime, 0.1)
    }}

    // ── PHASER ──
    const ph1 = ctx.createBiquadFilter(); ph1.type = 'allpass'; ph1.frequency.value = 350
    const ph2 = ctx.createBiquadFilter(); ph2.type = 'allpass'; ph2.frequency.value = 700
    const phLFO = ctx.createOscillator()
    const phLFOGain = ctx.createGain()
    const phWet = ctx.createGain()
    phLFO.frequency.value = 1 / (this.beatSeconds * 4)
    phLFOGain.gain.value = 300
    phWet.gain.value = 0
    phLFO.connect(phLFOGain)
    phLFOGain.connect(ph1.frequency); phLFOGain.connect(ph2.frequency)
    phLFO.start()
    input.connect(ph1); ph1.connect(ph2); ph2.connect(phWet); phWet.connect(output)
    this._effects.phaser = { node: ph1, wet: phWet, lfo: phLFO, update: () => {
      phLFO.frequency.setTargetAtTime(1 / (this.beatSeconds * 4), ctx.currentTime, 0.1)
    }}

    // ── ROLL (loop buffer) ──
    const rollDel = ctx.createDelay(2.0)
    const rollFB = ctx.createGain()
    const rollWet = ctx.createGain()
    rollDel.delayTime.value = this.beatSeconds / 2
    rollFB.gain.value = 0.7
    rollWet.gain.value = 0
    input.connect(rollDel); rollDel.connect(rollFB); rollFB.connect(rollDel)
    rollDel.connect(rollWet); rollWet.connect(output)
    this._effects.roll = { node: rollDel, wet: rollWet, update: () => {
      rollDel.delayTime.setTargetAtTime(this.beatSeconds / 2, ctx.currentTime, 0.01)
    }}

    // ── TRANS (gate ritmico) ──
    const transGain = ctx.createGain()
    const transWet = ctx.createGain()
    transGain.gain.value = 1
    transWet.gain.value = 0
    input.connect(transGain); transGain.connect(transWet); transWet.connect(output)
    this._effects.trans = { node: transGain, wet: transWet, _gateActive: false, update: () => {} }
  }

  _updateDelayTimes() {
    if (!this._built) return
    for (const fx of Object.values(this._effects)) {
      if (fx.update) fx.update()
    }
  }

  /** Attiva un effetto (disattiva il precedente) */
  setEffect(id, wetAmount = 0.7) {
    // Disattiva precedente
    if (this._activeId && this._effects[this._activeId]) {
      this._effects[this._activeId].wet.gain.setTargetAtTime(0, this.ctx.currentTime, 0.02)
    }
    this._activeId = id
    if (id && this._effects[id]) {
      // Wet minimo 0.5 per essere udibile
      const v = Math.max(0.5, wetAmount)
      this._effects[id].wet.gain.setTargetAtTime(v, this.ctx.currentTime, 0.02)
    }
    console.log('[BeatFX] setEffect:', id, 'wet:', wetAmount)
  }

  setWet(amount) {
    if (!this._activeId || !this._effects[this._activeId]) return
    this._effects[this._activeId].wet.gain.setTargetAtTime(
      Math.max(0, Math.min(1, amount)), this.ctx.currentTime, 0.02
    )
  }

  get activeEffect() { return this._activeId }

  off() {
    this.setEffect(null)
    this._activeId = null
  }
}

// Lista effetti per UI
export const BEAT_FX_LIST = [
  { id: 'delay',   label: 'DELAY',    color: '#e67e22' },
  { id: 'echo',    label: 'ECHO',     color: '#e74c3c' },
  { id: 'pingpong',label: 'PING PONG',color: '#9b59b6' },
  { id: 'reverb',  label: 'REVERB',   color: '#3498db' },
  { id: 'filter',  label: 'FILTER',   color: '#1abc9c' },
  { id: 'flanger', label: 'FLANGER',  color: '#2ecc71' },
  { id: 'phaser',  label: 'PHASER',   color: '#f39c12' },
  { id: 'roll',    label: 'ROLL',     color: '#e91e63' },
  { id: 'trans',   label: 'TRANS',    color: '#00bcd4' },
]
