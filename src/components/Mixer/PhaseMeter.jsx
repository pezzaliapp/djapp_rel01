/**
 * PhaseMeter — indicatore visivo di fase tra Deck A e Deck B
 *
 * Mostra quanto il battito di B è avanti/indietro rispetto ad A.
 * Senza BPM reale usa la posizione relativa come approssimazione.
 * Con BPM calcola l'offset in millisecondi sul beat.
 */

import React, { useRef, useEffect } from 'react'
import { useDeckStore } from '@store/useDeckStore.js'

export default function PhaseMeter() {
  const canvasRef = useRef(null)
  const posA = useDeckStore((s) => s.decks.A?.position ?? 0)
  const posB = useDeckStore((s) => s.decks.B?.position ?? 0)
  const bpmA = useDeckStore((s) => s.decks.A?.bpm)
  const bpmB = useDeckStore((s) => s.decks.B?.bpm)
  const playingA = useDeckStore((s) => s.decks.A?.playing)
  const playingB = useDeckStore((s) => s.decks.B?.playing)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const W = canvas.width
    const H = canvas.height
    const cx = W / 2

    ctx.clearRect(0, 0, W, H)

    // Sfondo
    ctx.fillStyle = '#0a0a0a'
    ctx.fillRect(0, 0, W, H)

    // Se almeno un deck non è in play, mostra neutro
    if (!playingA && !playingB) {
      ctx.fillStyle = '#222'
      ctx.fillRect(cx - 1, 2, 2, H - 4)
      return
    }

    // Calcola offset fase
    // Se abbiamo BPM: offset = (posA mod beatLength) - (posB mod beatLength)
    // Altrimenti: differenza di posizione normalizzata
    let offset = 0
    let beatLen = null

    if (bpmA && bpmB) {
      const avgBPM = (bpmA + bpmB) / 2
      beatLen = 60 / avgBPM
      const phaseA = posA % beatLen
      const phaseB = posB % beatLen
      offset = phaseA - phaseB
      // Normalizza nell'intervallo [-beatLen/2, beatLen/2]
      if (offset > beatLen / 2) offset -= beatLen
      if (offset < -beatLen / 2) offset += beatLen
      offset = offset / (beatLen / 2) // -1 ... +1
    } else {
      // Senza BPM: offset piccolo basato su posizione
      offset = Math.sin((posA - posB) * 2) * 0.5
    }

    const clampedOffset = Math.max(-1, Math.min(1, offset))
    const barX = cx + clampedOffset * (cx - 20)

    // Range indicator
    const gradient = ctx.createLinearGradient(20, 0, W - 20, 0)
    gradient.addColorStop(0, '#0099ff')
    gradient.addColorStop(0.5, '#00e599')
    gradient.addColorStop(1, '#0099ff')
    ctx.fillStyle = gradient
    ctx.globalAlpha = 0.15
    ctx.fillRect(20, H / 2 - 2, W - 40, 4)
    ctx.globalAlpha = 1

    // Tacche beat
    for (let i = -4; i <= 4; i++) {
      const tx = cx + (i / 4) * (cx - 20)
      ctx.fillStyle = i === 0 ? '#444' : '#222'
      ctx.fillRect(tx - 0.5, H / 2 - 4, 1, 8)
    }

    // Indicatore posizione
    const inSync = Math.abs(clampedOffset) < 0.05
    const barColor = inSync ? '#00e599' : (Math.abs(clampedOffset) < 0.3 ? '#ff9500' : '#ff3b30')

    ctx.fillStyle = barColor
    ctx.shadowBlur = inSync ? 8 : 4
    ctx.shadowColor = barColor
    ctx.beginPath()
    ctx.arc(barX, H / 2, 5, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0

    // Label
    ctx.fillStyle = barColor
    ctx.font = '8px monospace'
    ctx.textAlign = 'center'
    const label = inSync ? 'SYNC' : (clampedOffset > 0 ? `+${(clampedOffset * 100).toFixed(0)}` : `${(clampedOffset * 100).toFixed(0)}`)
    ctx.fillText(label, cx, H - 1)

  }, [posA, posB, bpmA, bpmB, playingA, playingB])

  return (
    <div style={{ width: '100%', padding: '4px 0' }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-muted)', textAlign: 'center', letterSpacing: '0.1em', marginBottom: 2 }}>
        PHASE
      </div>
      <canvas
        ref={canvasRef}
        width={240}
        height={24}
        style={{ width: '100%', height: 24, display: 'block' }}
      />
    </div>
  )
}
