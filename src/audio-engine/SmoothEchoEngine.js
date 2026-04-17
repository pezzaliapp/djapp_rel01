/**
 * SmoothEchoEngine — Smooth Echo come Pioneer Opus Quad
 *
 * Funzionamento:
 *  1. Quando attivato, cattura il segnale audio corrente
 *  2. Lo riproduce con decay progressivo (eco che sfuma)
 *  3. Sincronizzabile al beat (beat-synced echo)
 *  4. Volume controllabile con knob
 *
 * Parametri:
 *  - volume: 0.0 → 1.0 (volume dell'eco)
 *  - beats: divisione beat (0.25, 0.5, 1, 2)
 *  - feedback: 0.0 → 0.9 (quanto dura l'eco)
 */

export class SmoothEchoEngine {
  constructor(ctx) {
    this.ctx = ctx
    this._active = false
    this._bpm = 120
    this._beats = 1
    this._volume = 0.7
    this._feedback = 0.6

    // Nodi audio
    this._inputGain = ctx.createGain()   // input del segnale
    this._echoGain = ctx.createGain()    // wet output
    this._echoGain.gain.value = 0

    this._delay = ctx.createDelay(8.0)
    this._delay.delayTime.value = this._beatSeconds

    this._feedbackGain = ctx.createGain()
    this._feedbackGain.gain.value = this._feedback

    // Catena: input → delay → feedbackGain → delay (loop)
    //                        ↓
    //                     echoGain → destination
    this._delay.connect(this._feedbackGain)
    this._feedbackGain.connect(this._delay)
    this._delay.connect(this._echoGain)
  }

  get _beatSeconds() {
    return (60 / this._bpm) * this._beats
  }

  connect(inputNode, outputNode) {
    inputNode.connect(this._inputGain)
    this._inputGain.connect(this._delay)
    this._echoGain.connect(outputNode)
    this._output = outputNode
  }

  setBPM(bpm) {
    if (!bpm || bpm <= 0) return
    this._bpm = bpm
    this._delay.delayTime.setTargetAtTime(this._beatSeconds, this.ctx.currentTime, 0.05)
  }

  setBeats(beats) {
    this._beats = beats
    this._delay.delayTime.setTargetAtTime(this._beatSeconds, this.ctx.currentTime, 0.05)
  }

  setVolume(vol) {
    this._volume = Math.max(0, Math.min(1, vol))
    if (this._active) {
      this._echoGain.gain.setTargetAtTime(this._volume, this.ctx.currentTime, 0.05)
    }
  }

  setFeedback(fb) {
    this._feedback = Math.max(0, Math.min(0.92, fb))
    this._feedbackGain.gain.setTargetAtTime(this._feedback, this.ctx.currentTime, 0.05)
  }

  /** Attiva Smooth Echo */
  activate() {
    if (this._active) return
    this._active = true
    // Fade in graduale
    this._echoGain.gain.cancelScheduledValues(this.ctx.currentTime)
    this._echoGain.gain.setTargetAtTime(this._volume, this.ctx.currentTime, 0.1)
    console.log('[SmoothEcho] activated, delay:', this._beatSeconds.toFixed(3), 's')
  }

  /** Disattiva con fade out graduale */
  deactivate() {
    if (!this._active) return
    this._active = false
    // Fade out: prima abbassa il feedback (eco si smorza naturalmente)
    this._feedbackGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.3)
    // Poi abbassa il volume dopo 2 secondi
    this._echoGain.gain.setTargetAtTime(0, this.ctx.currentTime + 0.5, 0.4)
    // Ripristina feedback dopo il fade
    setTimeout(() => {
      this._feedbackGain.gain.setTargetAtTime(this._feedback, this.ctx.currentTime, 0.1)
    }, 3000)
  }

  toggle() {
    if (this._active) this.deactivate()
    else this.activate()
    return this._active
  }

  get active() { return this._active }
}

export const SMOOTH_ECHO_BEATS = [
  { label: '1/4', value: 0.25 },
  { label: '1/2', value: 0.5 },
  { label: '1',   value: 1 },
  { label: '2',   value: 2 },
]
