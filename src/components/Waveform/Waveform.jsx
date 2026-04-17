/**
 * Waveform — visualizzazione professionale
 *
 * Features:
 *  - Waveform scrollante: playhead FISSO al centro, waveform scorre
 *  - Overview minimap: full-track con finestra di zoom visibile
 *  - Zoom: bottoni +/- e pinch-to-zoom su iPhone, scroll trackpad
 *  - Time ruler con marcatori dinamici adattativi
 *  - Click su overview → seek assoluto
 *  - Click su waveform principale → seek relativo al playhead
 *  - Peak + RMS separati per look professionale
 *  - HiDPI / Retina aware (devicePixelRatio)
 *
 * Props:
 *  deckId — 'A' | 'B'
 */

import React, { useRef, useEffect, useCallback } from 'react'
import { useDeckStore } from '@store/useDeckStore.js'
import { audioEngine } from '@audio/AudioEngine.js'
import { useWaveformRenderer } from '@hooks/useWaveformRenderer.js'
import styles from './Waveform.module.css'

export default function Waveform({ deckId }) {
  const canvasRef   = useRef(null)
  const overviewRef = useRef(null)
  const wrapRef     = useRef(null)
  const animRef     = useRef(null)
  const lastBufferRef = useRef(null)

  const deck = useDeckStore((s) => s.decks[deckId])
  const cuePoint = useDeckStore((s) => s.decks[deckId]?.cuePoint ?? 0)
  const hotCues = useDeckStore((s) => s.decks[deckId]?.hotCues ?? [])
  const hotCueColors = useDeckStore((s) => s.decks[deckId]?.hotCueColors ?? [])
  const bpm = useDeckStore((s) => s.decks[deckId]?.bpm ?? null)

  const {
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
  } = useWaveformRenderer({ deckId, canvasRef, overviewRef })

  // ── Carica peaks quando arriva un nuovo buffer ───────────────

  useEffect(() => {
    if (!audioEngine.ready) return
    try {
      const eng = audioEngine.deck(deckId)
      if (eng.buffer && eng.buffer !== lastBufferRef.current) {
        lastBufferRef.current = eng.buffer
        loadBuffer(eng.buffer)
      }
    } catch (_) {}
  }, [deck.trackTitle, deckId, loadBuffer])

  // ── RAF loop ─────────────────────────────────────────────────

  // Leggi posizione direttamente dall'engine (no store updates ogni frame)
  useEffect(() => {
    const tick = () => {
      let pos = 0, dur = deck.trackDuration ?? 0
      try {
        if (audioEngine.ready) {
          const eng = audioEngine.deck(deckId)
          pos = eng.position ?? 0
          if (!dur && eng.duration) dur = eng.duration
        }
      } catch(_) {}
      draw(pos, dur, cuePoint, hotCues, bpm, hotCueColors)
      drawOverview(pos, dur)
      animRef.current = requestAnimationFrame(tick)
    }
    animRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animRef.current)
  }, [deck.trackDuration, draw, drawOverview, deckId, cuePoint, hotCues, bpm, hotCueColors])

  // ── Resize → canvas HiDPI ────────────────────────────────────

  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return
    const dpr = window.devicePixelRatio || 1

    const sizeCanvas = (canvas) => {
      if (!canvas) return
      const { clientWidth: w, clientHeight: h } = canvas
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width  = w * dpr
        canvas.height = h * dpr
        const ctx = canvas.getContext('2d')
        ctx.scale(dpr, dpr)
      }
    }

    const ro = new ResizeObserver(() => {
      sizeCanvas(canvasRef.current)
      sizeCanvas(overviewRef.current)
      if (lastBufferRef.current) loadBuffer(lastBufferRef.current)
    })
    ro.observe(wrap)

    // Dimensionamento iniziale
    sizeCanvas(canvasRef.current)
    sizeCanvas(overviewRef.current)

    return () => ro.disconnect()
  }, [loadBuffer])

  // ── Click canvas principale → seek relativo ──────────────────

  const handleMainClick = useCallback((e) => {
    if (!audioEngine.ready) return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const relX = e.clientX - rect.left
    const W = rect.width
    const pxPerSec = W / visibleSeconds
    const deltaSec = (relX - W / 2) / pxPerSec
    try {
      const eng = audioEngine.deck(deckId)
      if (!eng.buffer) return
      eng.seek(eng.position + deltaSec)
    } catch (_) {}
  }, [deckId, visibleSeconds])

  // ── Click overview → seek assoluto ──────────────────────────

  const handleOverviewClick = useCallback((e) => {
    if (!audioEngine.ready) return
    try {
      const eng = audioEngine.deck(deckId)
      if (!eng.buffer) return
      seekFromOverviewClick(e.clientX, eng.duration, (pos) => eng.seek(pos))
    } catch (_) {}
  }, [deckId, seekFromOverviewClick])

  // ── Touch pinch ──────────────────────────────────────────────

  const handleTouchStart = useCallback((e) => {
    if (e.touches.length === 2) { e.preventDefault(); onPinchStart(e.touches) }
  }, [onPinchStart])

  const handleTouchMove = useCallback((e) => {
    if (e.touches.length === 2) { e.preventDefault(); onPinchMove(e.touches) }
  }, [onPinchMove])

  const handleTouchEnd = useCallback((e) => {
    if (e.touches.length < 2) onPinchEnd()
  }, [onPinchEnd])

  // ── Scroll trackpad / wheel → zoom ──────────────────────────

  const handleWheel = useCallback((e) => {
    e.preventDefault()
    if (e.deltaY < 0) zoomIn()
    else              zoomOut()
  }, [zoomIn, zoomOut])

  const accentColor = deckId === 'A' ? 'var(--deck-a)' : 'var(--deck-b)'

  return (
    <div className={styles.outer} ref={wrapRef} data-deck={deckId}>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <span className={styles.deckTag} style={{ color: accentColor }}>{deckId}</span>
        <span className={styles.trackName}>{deck.trackTitle ?? '—'}</span>
        <div className={styles.zoomControls}>
          <button
            className={styles.zoomBtn}
            onClick={zoomIn}
            disabled={zoomIndex === 0}
            style={{ color: accentColor }}
          >+</button>
          <span className={styles.zoomLabel} style={{ color: accentColor }}>
            {visibleSeconds}s
          </span>
          <button
            className={styles.zoomBtn}
            onClick={zoomOut}
            disabled={zoomIndex === ZOOM_LEVELS.length - 1}
            style={{ color: accentColor }}
          >−</button>
        </div>
      </div>

      {/* Canvas principale */}
      <div className={styles.mainWrap}>
        <canvas
          ref={canvasRef}
          className={styles.mainCanvas}
          onClick={handleMainClick}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onWheel={handleWheel}
          style={{ touchAction: 'none', cursor: 'crosshair' }}
        />
      </div>

      {/* Overview minimap */}
      <div className={styles.overviewWrap}>
        <canvas
          ref={overviewRef}
          className={styles.overviewCanvas}
          onClick={handleOverviewClick}
          style={{ cursor: 'pointer' }}
        />
        <span className={styles.overviewLabel}>OVERVIEW</span>
      </div>

    </div>
  )
}
