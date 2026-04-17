/**
 * formatUtils — helpers di formattazione UI
 */

/**
 * Formatta secondi in MM:SS
 */
export function formatTime(seconds) {
  if (seconds == null || isNaN(seconds)) return '0:00'
  const s = Math.max(0, seconds)
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60).toString().padStart(2, '0')
  return `${m}:${sec}`
}

/**
 * Formatta secondi in MM:SS.ms (per display ad alta precisione)
 */
export function formatTimePrecise(seconds) {
  if (seconds == null || isNaN(seconds)) return '0:00.000'
  const s = Math.max(0, seconds)
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60).toString().padStart(2, '0')
  const ms = Math.floor((s % 1) * 1000).toString().padStart(3, '0')
  return `${m}:${sec}.${ms}`
}

/**
 * Converte playbackRate in percentuale pitch display
 * Es: 1.0 → '±0%', 1.06 → '+6.0%', 0.94 → '-6.0%'
 */
export function formatPitch(rate) {
  const pct = (rate - 1) * 100
  if (Math.abs(pct) < 0.05) return '±0%'
  return pct > 0 ? `+${pct.toFixed(1)}%` : `${pct.toFixed(1)}%`
}

/**
 * Formatta BPM con decimale
 */
export function formatBPM(bpm) {
  if (!bpm) return '—.—'
  return bpm.toFixed(1)
}

/**
 * Mappa un valore [inMin, inMax] → [outMin, outMax]
 */
export function mapRange(value, inMin, inMax, outMin, outMax) {
  return outMin + ((value - inMin) / (inMax - inMin)) * (outMax - outMin)
}

/**
 * Clamp valore nel range [min, max]
 */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}
