/**
 * FXEngine — effetti audio per master bus
 *
 * Chain: masterGain → [Reverb, Delay, Filter, Flanger] → destination
 * Ogni FX ha un dry/wet knob (0-100%).
 * Gli effetti sono collegati in parallelo sul master bus.
 */

export class FXEngine {
  constructor(ctx, inputNode, outputNode) {
    this.ctx = ctx
    this.effects = {}

    // ── REVERB (ConvolverNode con IR sintetico) ──
    this._buildReverb(inputNode, outputNode)

    // ── DELAY ──
    this._buildDelay(inputNode, outputNode)

    // ── FILTER (AutoFilter sweep) ──
    this._buildFilter(inputNode, outputNode)

    // ── FLANGER ──
    this._buildFlanger(inputNode, outputNode)
  }

  _buildReverb(input, output) {
    const wet = this.ctx.createGain()
    const dry = this.ctx.createGain()
    const convolver = this.ctx.createConvolver()

    // IR sintetico (rumore decadente)
    const len = this.ctx.sampleRate * 2.5
    const buf = this.ctx.createBuffer(2, len, this.ctx.sampleRate)
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch)
      for (let i = 0; i < len; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.5)
      }
    }
    convolver.buffer = buf

    wet.gain.value = 0
    dry.gain.value = 1

    input.connect(dry); dry.connect(output)
    input.connect(convolver); convolver.connect(wet); wet.connect(output)

    this.effects.reverb = { wet, dry, node: convolver, wetValue: 0 }
  }

  _buildDelay(input, output) {
    const wet = this.ctx.createGain()
    const dry = this.ctx.createGain()
    const delay = this.ctx.createDelay(2.0)
    const feedback = this.ctx.createGain()

    delay.delayTime.value = 0.375  // 3/8 note a 120bpm
    feedback.gain.value = 0.35
    wet.gain.value = 0
    dry.gain.value = 1

    input.connect(dry); dry.connect(output)
    input.connect(delay)
    delay.connect(feedback); feedback.connect(delay)
    delay.connect(wet); wet.connect(output)

    this.effects.delay = { wet, dry, node: delay, wetValue: 0 }
  }

  _buildFilter(input, output) {
    const wet = this.ctx.createGain()
    const dry = this.ctx.createGain()
    const filter = this.ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = 1000
    filter.Q.value = 3

    wet.gain.value = 0
    dry.gain.value = 1

    input.connect(dry); dry.connect(output)
    input.connect(filter); filter.connect(wet); wet.connect(output)

    this.effects.filter = { wet, dry, node: filter, wetValue: 0 }
  }

  _buildFlanger(input, output) {
    const wet = this.ctx.createGain()
    const dry = this.ctx.createGain()
    const delay = this.ctx.createDelay(0.02)
    const osc = this.ctx.createOscillator()
    const oscGain = this.ctx.createGain()

    delay.delayTime.value = 0.005
    osc.frequency.value = 0.3
    oscGain.gain.value = 0.003
    wet.gain.value = 0
    dry.gain.value = 1

    osc.connect(oscGain); oscGain.connect(delay.delayTime)
    osc.start()

    input.connect(dry); dry.connect(output)
    input.connect(delay); delay.connect(wet); wet.connect(output)

    this.effects.flanger = { wet, dry, node: delay, osc, wetValue: 0 }
  }

  /**
   * Imposta il wet amount (0-1) per un effetto.
   */
  setWet(fxId, value) {
    const fx = this.effects[fxId]
    if (!fx) return
    const v = Math.max(0, Math.min(1, value))
    fx.wetValue = v
    fx.wet.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05)
    fx.dry.gain.setTargetAtTime(1 - v * 0.5, this.ctx.currentTime, 0.05)
  }

  getWet(fxId) {
    return this.effects[fxId]?.wetValue ?? 0
  }
}
