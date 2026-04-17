/**
 * BPM Detector — Web Worker
 * Autocorrelazione sull'envelope del segnale audio.
 * Range: 60–200 BPM → normalizzato in 80-160.
 *
 * Input:  { type: 'ANALYZE', sampleRate, channelData: Float32Array }
 * Output: { type: 'RESULT', bpm, confidence }
 */

self.onmessage = function (e) {
  if (e.data.type !== 'ANALYZE') return
  const { sampleRate, channelData } = e.data
  try {
    const bpm = detectBPM(channelData, sampleRate)
    self.postMessage({ type: 'RESULT', bpm })
  } catch (err) {
    self.postMessage({ type: 'ERROR', message: err.message })
  }
}

function detectBPM(data, sampleRate) {
  const DOWNSAMPLE = 10
  const targetRate = sampleRate / DOWNSAMPLE
  const ds = downsample(data, DOWNSAMPLE)
  const env = computeEnvelope(ds, Math.floor(targetRate * 0.01))

  const minLag = Math.floor(targetRate * 60 / 200)
  const maxLag = Math.floor(targetRate * 60 / 60)
  const len = Math.min(env.length, Math.floor(targetRate * 30))

  let bestLag = minLag, bestCorr = -Infinity
  for (let lag = minLag; lag <= maxLag; lag++) {
    let corr = 0
    for (let i = 0; i < len - lag; i++) corr += env[i] * env[i + lag]
    if (corr > bestCorr) { bestCorr = corr; bestLag = lag }
  }

  let bpm = 60 * targetRate / bestLag
  while (bpm < 80) bpm *= 2
  while (bpm > 160) bpm /= 2
  return Math.round(bpm * 10) / 10
}

function downsample(data, factor) {
  const out = new Float32Array(Math.floor(data.length / factor))
  for (let i = 0; i < out.length; i++) {
    let s = 0
    for (let j = 0; j < factor; j++) s += Math.abs(data[i * factor + j] || 0)
    out[i] = s / factor
  }
  return out
}

function computeEnvelope(data, win) {
  const out = new Float32Array(Math.floor(data.length / win))
  for (let i = 0; i < out.length; i++) {
    let s = 0, base = i * win
    for (let j = 0; j < win; j++) s += (data[base + j] || 0) ** 2
    out[i] = Math.sqrt(s / win)
  }
  return out
}
