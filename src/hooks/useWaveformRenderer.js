/**
 * useWaveformRenderer — logica di rendering waveform
 *
 * Responsabilità:
 *  - Estrae i peaks dal buffer audio (una volta sola per buffer)
 *  - Calcola l'offset di scroll in base alla posizione di playback
 *  - Disegna waveform principale + overview + ruler su Canvas 2D
 *  - Gestisce zoom level
 *
 * Il playhead è FISSO al centro del canvas.
 * La waveform SCORRE sotto di esso.
 */

import { useRef, useCallback, useEffect, useState } from 'react'

// ── Configurazione ─────────────────────────────────────────────

const ZOOM_LEVELS = [4, 8, 16, 30, 60, 120]   // secondi visibili
const DEFAULT_ZOOM_INDEX = 3                    // 30s default

const COLORS = {
  A: {
    played:    '#0099ff',
    unplayed:  '#003355',
    midPlayed: '#0066bb',
    midUnplay: '#001a33',
    bg:        '#03080f',
    playhead:  '#ffffff',
    ruler:     '#334455',
    rulerText: '#4477aa',
  },
  B: {
    played:    '#00e599',
    unplayed:  '#004433',
    midPlayed: '#00aa66',
    midUnplay: '#002211',
    bg:        '#030f08',
    playhead:  '#ffffff',
    ruler:     '#334433',
    rulerText: '#44aa77',
  },
}

// ── Peak extraction ────────────────────────────────────────────

/**
 * Riduce un AudioBuffer a peaks RMS per colonna.
 * Usa sia canal 0 (L) che 1 (R) se stereo.
 * @param {AudioBuffer} buffer
 * @param {number} resolution - samples per peak (più basso = più dettaglio)
 * @returns {{ peaks: Float32Array, rms: Float32Array }}
 */
export function extractPeaksFromBuffer(buffer, resolution = 512) {
  const len = buffer.length
  const numPeaks = Math.ceil(len / resolution)
  const peaks = new Float32Array(numPeaks)
  const rms = new Float32Array(numPeaks)

  const channels = []
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    channels.push(buffer.getChannelData(c))
  }

  for (let i = 0; i < numPeaks; i++) {
    const start = i * resolution
    const end = Math.min(start + resolution, len)
    let maxAbs = 0
    let sumSq = 0
    const count = end - start

    for (let j = start; j < end; j++) {
      let sampleAbs = 0
      let sampleSum = 0
      for (const ch of channels) {
        const v = ch[j] ?? 0
        sampleAbs = Math.max(sampleAbs, Math.abs(v))
        sampleSum += v
      }
      const avg = sampleSum / channels.length
      maxAbs = Math.max(maxAbs, sampleAbs)
      sumSq += avg * avg
    }

    peaks[i] = maxAbs
    rms[i] = Math.sqrt(sumSq / count)
  }

  return { peaks, rms, resolution, sampleRate: buffer.sampleRate }
}

// ── Hook ───────────────────────────────────────────────────────

export function useWaveformRenderer({ deckId, canvasRef, overviewRef }) {
  const colorsRef = useRef(COLORS[deckId] ?? COLORS.A)

  // Dati estratti dal buffer
  const peakDataRef = useRef(null)   // { peaks, rms, resolution, sampleRate }

  // Zoom
  const [zoomIndex, setZoomIndex] = useState(DEFAULT_ZOOM_INDEX)
  const zoomIndexRef = useRef(DEFAULT_ZOOM_INDEX)

  // Pinch-to-zoom state
  const pinchRef = useRef({ active: false, startDist: 0, startZoomIdx: 0 })

  const visibleSeconds = ZOOM_LEVELS[zoomIndex]

  // ── API pubblica: carica i dati peaks ──────────────────────

  const loadBuffer = useCallback((audioBuffer) => {
    peakDataRef.current = extractPeaksFromBuffer(audioBuffer)
  }, [])

  // ── Zoom ───────────────────────────────────────────────────

  const zoomIn = useCallback(() => {
    setZoomIndex((i) => {
      const next = Math.max(0, i - 1)
      zoomIndexRef.current = next
      return next
    })
  }, [])

  const zoomOut = useCallback(() => {
    setZoomIndex((i) => {
      const next = Math.min(ZOOM_LEVELS.length - 1, i + 1)
      zoomIndexRef.current = next
      return next
    })
  }, [])

  // ── Pinch gesture (iPhone) ─────────────────────────────────

  const onPinchStart = useCallback((touches) => {
    if (touches.length < 2) return
    const dx = touches[0].clientX - touches[1].clientX
    const dy = touches[0].clientY - touches[1].clientY
    pinchRef.current = {
      active: true,
      startDist: Math.hypot(dx, dy),
      startZoomIdx: zoomIndexRef.current,
    }
  }, [])

  const onPinchMove = useCallback((touches) => {
    if (!pinchRef.current.active || touches.length < 2) return
    const dx = touches[0].clientX - touches[1].clientX
    const dy = touches[0].clientY - touches[1].clientY
    const dist = Math.hypot(dx, dy)
    const ratio = pinchRef.current.startDist / dist

    // ratio > 1 = pinch-in (zoom in), ratio < 1 = spread (zoom out)
    const deltaIdx = Math.round(Math.log2(ratio) * 1.5)
    const newIdx = Math.max(0, Math.min(
      ZOOM_LEVELS.length - 1,
      pinchRef.current.startZoomIdx + deltaIdx,
    ))

    if (newIdx !== zoomIndexRef.current) {
      zoomIndexRef.current = newIdx
      setZoomIndex(newIdx)
    }
  }, [])

  const onPinchEnd = useCallback(() => {
    pinchRef.current.active = false
  }, [])

  // ── Draw waveform principale ───────────────────────────────

  const draw = useCallback((position, duration, cuePoint = 0, hotCues = [], bpm = null, hotCueColors = []) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { alpha: false })
    const W = canvas.width
    const H = canvas.height
    const col = colorsRef.current
    const pd = peakDataRef.current

    // Sfondo
    ctx.fillStyle = col.bg
    ctx.fillRect(0, 0, W, H)

    const visibleSecs = ZOOM_LEVELS[zoomIndexRef.current]
    const pxPerSec = W / visibleSecs
    const centerX = W / 2

    if (pd && duration > 0) {
      // seconds per peak = resolution / sampleRate
      const secsPerPeak = pd.resolution / pd.sampleRate
      const pxPerPeak = secsPerPeak * pxPerSec

      // offset scroll: il sample a `position` deve stare a centerX
      const offsetX = centerX - position * pxPerSec

      const halfH = H / 2
      const waveH = halfH * 0.85

      // Disegna solo i peak visibili (ottimizzazione)
      const firstVisible = Math.max(0, Math.floor(-offsetX / pxPerPeak) - 1)
      const lastVisible  = Math.min(pd.peaks.length - 1,
        Math.ceil((W - offsetX) / pxPerPeak) + 1)

      for (let i = firstVisible; i <= lastVisible; i++) {
        const x = offsetX + i * pxPerPeak
        const peakH = pd.peaks[i] * waveH
        const rmsH  = pd.rms[i]  * waveH * 0.7

        const isPlayed = (i * secsPerPeak) < position

        // Corpo peak (contorno)
        ctx.fillStyle = isPlayed ? col.played : col.unplayed
        ctx.fillRect(x, halfH - peakH, Math.max(1, pxPerPeak - 0.5), peakH * 2)

        // Corpo RMS (centro, più luminoso)
        ctx.fillStyle = isPlayed ? col.midPlayed : col.midUnplay
        ctx.fillRect(x, halfH - rmsH, Math.max(1, pxPerPeak - 0.5), rmsH * 2)
      }

      // ── Time ruler ──────────────────────────────────────────

      _drawRuler(ctx, W, H, position, visibleSecs, pxPerSec, col)

    } else {
      // Nessun audio: griglia placeholder
      _drawPlaceholder(ctx, W, H, col, deckId)
    }

    // ── Playhead fisso al centro ─────────────────────────────
    ctx.strokeStyle = col.playhead
    ctx.lineWidth = 1.5
    ctx.globalAlpha = 0.9
    ctx.beginPath()
    ctx.moveTo(centerX, 0)
    ctx.lineTo(centerX, H)
    ctx.stroke()

    // Triangolino indicatore
    ctx.fillStyle = col.playhead
    ctx.globalAlpha = 1
    ctx.beginPath()
    ctx.moveTo(centerX - 5, 0)
    ctx.lineTo(centerX + 5, 0)
    ctx.lineTo(centerX, 7)
    ctx.closePath()
    ctx.fill()

    // ── Beat Grid ────────────────────────────────────────────
    if (bpm && bpm > 0 && duration > 0) {
      const beatLen = 60 / bpm
      // Prima battuta visibile
      const startSec = position - visibleSecs / 2
      const firstBeat = Math.ceil(startSec / beatLen) * beatLen
      const isColA = deckId === 'A'

      for (let t = firstBeat; t <= startSec + visibleSecs + beatLen; t += beatLen) {
        if (t < 0 || t > duration) continue
        const bx = centerX + (t - position) * pxPerSec

        // Beat counter per evidenziare i tempi forti (ogni 4 beat)
        const beatNum = Math.round(t / beatLen)
        const isDownbeat = beatNum % 4 === 0
        const isHalfbeat = beatNum % 2 === 0

        ctx.strokeStyle = isColA ? '#0099ff' : '#00e599'
        ctx.lineWidth = isDownbeat ? 1.5 : (isHalfbeat ? 0.8 : 0.4)
        ctx.globalAlpha = isDownbeat ? 0.5 : (isHalfbeat ? 0.25 : 0.12)
        ctx.beginPath()
        ctx.moveTo(bx, isDownbeat ? 0 : H * 0.2)
        ctx.lineTo(bx, isDownbeat ? H : H * 0.8)
        ctx.stroke()

        // Numero battuta sui downbeat
        if (isDownbeat && bx > 10 && bx < W - 10) {
          ctx.fillStyle = isColA ? '#0099ff' : '#00e599'
          ctx.globalAlpha = 0.4
          ctx.font = '8px monospace'
          ctx.textAlign = 'center'
          ctx.fillText(beatNum, bx, 10)
        }
      }
      ctx.globalAlpha = 1
    }

    // ── Cue point marker ────────────────────────────────────
    if (duration > 0 && cuePoint > 0) {
      const cueX = centerX + (cuePoint - position) * pxPerSec
      if (cueX >= 0 && cueX <= W) {
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 1.5
        ctx.globalAlpha = 0.7
        ctx.setLineDash([3, 3])
        ctx.beginPath()
        ctx.moveTo(cueX, 0)
        ctx.lineTo(cueX, H)
        ctx.stroke()
        ctx.setLineDash([])
        // Label CUE
        ctx.fillStyle = '#ffffff'
        ctx.globalAlpha = 0.8
        ctx.font = 'bold 9px monospace'
        ctx.textAlign = 'center'
        ctx.fillText('CUE', cueX, 10)
      }
    }

    // ── Hot cue markers (8 colorati) ──────────────────────────
    const DEFAULT_HC_COLORS = ['#ff3b30','#ff9500','#ffcc00','#34c759','#00c7be','#007aff','#9b59b6','#ff2d55']
    if (duration > 0) {
      hotCues.forEach((hc, i) => {
        if (hc === null) return
        const hcX = centerX + (hc - position) * pxPerSec
        if (hcX < -10 || hcX > W + 10) return
        const hcColor = hotCueColors[i] ?? DEFAULT_HC_COLORS[i] ?? col.played

        // Linea verticale sottile
        ctx.strokeStyle = hcColor
        ctx.lineWidth = 1.5
        ctx.globalAlpha = 0.6
        ctx.beginPath()
        ctx.moveTo(hcX, 0)
        ctx.lineTo(hcX, H)
        ctx.stroke()

        // Triangolo in alto con numero
        ctx.fillStyle = hcColor
        ctx.globalAlpha = 1
        ctx.beginPath()
        ctx.moveTo(hcX - 7, 0)
        ctx.lineTo(hcX + 7, 0)
        ctx.lineTo(hcX, 12)
        ctx.closePath()
        ctx.fill()

        // Numero
        ctx.fillStyle = '#000'
        ctx.globalAlpha = 1
        ctx.font = 'bold 8px monospace'
        ctx.textAlign = 'center'
        ctx.fillText(i + 1, hcX, 9)

        // Label in basso
        ctx.fillStyle = hcColor
        ctx.globalAlpha = 0.8
        ctx.font = 'bold 8px monospace'
        ctx.fillText(i + 1, hcX, H - 3)
      })
      ctx.globalAlpha = 1
    }

    // ── Etichetta tempo corrente ─────────────────────────────
    if (duration > 0) {
      const timeStr = _formatTime(position)
      ctx.fillStyle = col.playhead
      ctx.globalAlpha = 0.85
      ctx.font = '10px monospace'
      ctx.textAlign = 'center'
      ctx.fillText(timeStr, centerX, H - 4)
    }

    ctx.globalAlpha = 1
  }, [canvasRef, deckId])

  // ── Draw overview (minimap) ────────────────────────────────

  const drawOverview = useCallback((position, duration) => {
    const canvas = overviewRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { alpha: false })
    const W = canvas.width
    const H = canvas.height
    const col = colorsRef.current
    const pd = peakDataRef.current

    ctx.fillStyle = '#0a0a0a'
    ctx.fillRect(0, 0, W, H)

    if (!pd || duration <= 0) return

    const pxPerPeak = W / pd.peaks.length
    const halfH = H / 2

    for (let i = 0; i < pd.peaks.length; i++) {
      const x = i * pxPerPeak
      const peakH = pd.peaks[i] * halfH * 0.9
      const isPlayed = (i / pd.peaks.length) < (position / duration)

      ctx.fillStyle = isPlayed ? col.played : col.unplayed
      ctx.globalAlpha = isPlayed ? 0.8 : 0.35
      ctx.fillRect(x, halfH - peakH, Math.max(0.5, pxPerPeak), peakH * 2)
    }

    ctx.globalAlpha = 1

    // Finestra zoom (rettangolo che mostra cosa è visibile nel canvas principale)
    const visibleSecs = ZOOM_LEVELS[zoomIndexRef.current]
    const halfVisible = visibleSecs / 2
    const startSec = Math.max(0, position - halfVisible)
    const endSec   = Math.min(duration, position + halfVisible)
    const x1 = (startSec / duration) * W
    const x2 = (endSec   / duration) * W

    ctx.strokeStyle = col.played
    ctx.lineWidth = 1
    ctx.globalAlpha = 0.6
    ctx.strokeRect(x1, 0, x2 - x1, H)
    ctx.fillStyle = col.played
    ctx.globalAlpha = 0.08
    ctx.fillRect(x1, 0, x2 - x1, H)
    ctx.globalAlpha = 1

    // Playhead sull'overview
    const playX = (position / duration) * W
    ctx.strokeStyle = col.playhead
    ctx.lineWidth = 1
    ctx.globalAlpha = 0.8
    ctx.beginPath()
    ctx.moveTo(playX, 0)
    ctx.lineTo(playX, H)
    ctx.stroke()
    ctx.globalAlpha = 1
  }, [overviewRef])

  // ── Seek via click sull'overview ───────────────────────────

  const seekFromOverviewClick = useCallback((clientX, duration, onSeek) => {
    const canvas = overviewRef.current
    if (!canvas || duration <= 0) return
    const rect = canvas.getBoundingClientRect()
    const fraction = (clientX - rect.left) / rect.width
    onSeek(Math.max(0, Math.min(1, fraction)) * duration)
  }, [overviewRef])

  return {
    loadBuffer,
    draw,
    drawOverview,
    zoomIn,
    zoomOut,
    zoomIndex,
    visibleSeconds,
    onPinchStart,
    onPinchMove,
    onPinchEnd,
    seekFromOverviewClick,
    ZOOM_LEVELS,
  }
}

// ── Helpers privati ────────────────────────────────────────────

function _drawRuler(ctx, W, H, position, visibleSecs, pxPerSec, col) {
  // Calcola intervallo marcatori in base allo zoom
  let interval = 1  // secondi
  if (visibleSecs > 60)  interval = 30
  else if (visibleSecs > 30) interval = 10
  else if (visibleSecs > 10) interval = 5
  else if (visibleSecs > 4) interval = 2

  const startSec = position - visibleSecs / 2
  const firstMark = Math.ceil(startSec / interval) * interval
  const centerX = W / 2

  ctx.strokeStyle = col.ruler
  ctx.fillStyle = col.rulerText
  ctx.lineWidth = 1
  ctx.font = '9px monospace'
  ctx.globalAlpha = 0.7

  for (let t = firstMark; t <= startSec + visibleSecs; t += interval) {
    const x = centerX + (t - position) * pxPerSec
    if (x < 0 || x > W) continue

    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, 8)
    ctx.stroke()

    const label = _formatTime(Math.max(0, t))
    ctx.textAlign = 'center'
    ctx.fillText(label, x, 18)
  }

  ctx.globalAlpha = 1
}

function _drawPlaceholder(ctx, W, H, col, deckId) {
  ctx.strokeStyle = col.unplayed
  ctx.lineWidth = 1
  ctx.globalAlpha = 0.2

  for (let x = 0; x < W; x += 32) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, H)
    ctx.stroke()
  }

  ctx.globalAlpha = 0.25
  ctx.fillStyle = col.played
  ctx.font = '11px monospace'
  ctx.textAlign = 'center'
  ctx.fillText(`DECK ${deckId} — carica una traccia`, W / 2, H / 2 + 4)
  ctx.globalAlpha = 1
}

function _formatTime(s) {
  if (s < 0) s = 0
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60).toString().padStart(2, '0')
  return `${m}:${sec}`
}
