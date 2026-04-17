/**
 * FXPanel — pannello FX completo
 *
 * Sezione 1 (Sound Color FX): slider wet per reverb, delay, filter, flanger
 * Sezione 2 (Beat FX): selezione effetto beat-sync + wet + beat division
 */

import React, { useState, useCallback } from 'react'
import { audioEngine } from '@audio/AudioEngine.js'
import { BEAT_FX_LIST } from '@audio/BeatFXEngine.js'
import { SMOOTH_ECHO_BEATS } from '@audio/SmoothEchoEngine.js'
import styles from './FXPanel.module.css'

// ── Sound Color FX ─────────────────────────────────

const COLOR_FX = [
  { id: 'reverb',  label: 'REVERB',  color: '#9b59b6' },
  { id: 'delay',   label: 'DELAY',   color: '#e67e22' },
  { id: 'filter',  label: 'FILTER',  color: '#3498db' },
  { id: 'flanger', label: 'FLANGER', color: '#1abc9c' },
]

const BEAT_DIVS = [
  { label: '1/8', value: 0.125 },
  { label: '1/4', value: 0.25 },
  { label: '1/2', value: 0.5 },
  { label: '1',   value: 1 },
  { label: '2',   value: 2 },
  { label: '4',   value: 4 },
]

function ColorFXSlider({ fxId, label, color }) {
  const [wet, setWet] = useState(0)
  const handleChange = useCallback((e) => {
    const v = parseFloat(e.target.value) / 100
    setWet(parseFloat(e.target.value))
    if (audioEngine.ready && audioEngine.fx) audioEngine.fx.setWet(fxId, v)
  }, [fxId])

  return (
    <div className={styles.colorFxSlot}>
      <span className={styles.colorFxLabel} style={{ color: wet > 0 ? color : 'var(--text-muted)' }}>
        {label}
      </span>
      <input type="range" min="0" max="100" step="1" value={wet}
        onChange={handleChange}
        className={styles.colorFxSlider}
        style={{ accentColor: color }} />
      <span className={styles.colorFxValue} style={{ color: wet > 0 ? color : 'var(--text-muted)' }}>
        {wet}%
      </span>
      {/* Divisore */}
      <div className={styles.divider} />

      {/* Smooth Echo */}
      <SmoothEchoPanel />
    </div>
  )
}

function SmoothEchoPanel() {
  const [active, setActive] = useState(false)
  const [volume, setVolume] = useState(70)
  const [beats, setBeats] = useState(1)
  const [feedback, setFeedback] = useState(60)

  const handleToggle = useCallback(() => {
    if (!audioEngine.ready || !audioEngine.smoothEcho) return
    const next = audioEngine.smoothEcho.toggle()
    setActive(next)
  }, [])

  const handleVolume = useCallback((e) => {
    const v = parseFloat(e.target.value)
    setVolume(v)
    audioEngine.smoothEcho?.setVolume(v / 100)
  }, [])

  const handleBeats = useCallback((b) => {
    setBeats(b)
    audioEngine.smoothEcho?.setBeats(b)
  }, [])

  const handleFeedback = useCallback((e) => {
    const v = parseFloat(e.target.value)
    setFeedback(v)
    audioEngine.smoothEcho?.setFeedback(v / 100)
  }, [])

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--text-muted)', flexShrink: 0 }}>
        SMOOTH ECHO
      </span>

      {/* Beat division */}
      {SMOOTH_ECHO_BEATS.map((b) => (
        <button key={b.value} onClick={() => handleBeats(b.value)} style={{
          height: 20, padding: '0 5px',
          border: `1px solid ${beats === b.value ? '#ff9500' : 'var(--border-default)'}`,
          background: beats === b.value ? '#ff950022' : 'transparent',
          color: beats === b.value ? '#ff9500' : 'var(--text-muted)',
          fontFamily: 'var(--font-mono)', fontSize: 8, fontWeight: 700,
          borderRadius: 3, cursor: 'pointer',
        }}>{b.label}</button>
      ))}

      {/* Volume */}
      <input type="range" min="0" max="100" value={volume} onChange={handleVolume}
        style={{ width: 48, accentColor: '#ff9500' }} />

      {/* Feedback */}
      <input type="range" min="0" max="90" value={feedback} onChange={handleFeedback}
        title="Feedback (durata eco)"
        style={{ width: 40, accentColor: '#e67e22' }} />

      {/* ON button */}
      <button onClick={handleToggle} style={{
        height: 24, padding: '0 10px',
        border: `1px solid ${active ? '#ff9500' : 'var(--border-default)'}`,
        background: active ? '#ff9500' : 'transparent',
        color: active ? '#000' : 'var(--text-secondary)',
        fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700,
        borderRadius: 3, cursor: 'pointer', letterSpacing: '0.08em',
      }}>
        {active ? '● ON' : 'ON'}
      </button>
    </div>
  )
}

export default function FXPanel() {
  const [activeBeatFX, setActiveBeatFX] = useState(null)
  const [beatWet, setBeatWet] = useState(70)
  const [beatDiv, setBeatDiv] = useState(1)
  const [beatFXOn, setBeatFXOn] = useState(false)



  const handleBeatFXToggle = useCallback(() => {
    const next = !beatFXOn
    setBeatFXOn(next)
    if (!audioEngine.ready || !audioEngine.beatFX) return
    if (next && activeBeatFX) {
      audioEngine.beatFX.setBeatDiv(beatDiv)
      audioEngine.beatFX.setEffect(activeBeatFX, beatWet / 100)
    } else {
      audioEngine.beatFX.off()
    }
  }, [beatFXOn, activeBeatFX, beatWet, beatDiv])

  // Quando si cambia effetto con ON già attivo, aggiorna subito
  const handleSelectBeatFX = useCallback((id) => {
    setActiveBeatFX(id)
    if (beatFXOn && audioEngine.ready && audioEngine.beatFX) {
      audioEngine.beatFX.setBeatDiv(beatDiv)
      audioEngine.beatFX.setEffect(id, beatWet / 100)
    }
  }, [beatFXOn, beatWet, beatDiv])

  const handleBeatWet = useCallback((e) => {
    const v = parseFloat(e.target.value)
    setBeatWet(v)
    if (audioEngine.ready && audioEngine.beatFX && beatFXOn) {
      audioEngine.beatFX.setWet(v / 100)
    }
  }, [beatFXOn])

  const handleBeatDiv = useCallback((div) => {
    setBeatDiv(div)
    if (audioEngine.ready && audioEngine.beatFX) {
      audioEngine.beatFX.setBeatDiv(div)
    }
  }, [])

  const activeDef = BEAT_FX_LIST.find(f => f.id === activeBeatFX)

  return (
    <div className={styles.fxPanel}>

      {/* ── Sound Color FX ── */}
      <div className={styles.colorFxSection}>
        <span className={styles.sectionLabel}>COLOR FX</span>
        {COLOR_FX.map((fx) => (
          <ColorFXSlider key={fx.id} fxId={fx.id} label={fx.label} color={fx.color} />
        ))}
      </div>

      {/* ── Divisore ── */}
      <div className={styles.divider} />

      {/* ── Beat FX ── */}
      <div className={styles.beatFxSection}>
        <span className={styles.sectionLabel}>BEAT FX</span>

        {/* Selezione effetto */}
        <div className={styles.beatFxList}>
          {BEAT_FX_LIST.map((fx) => (
            <button
              key={fx.id}
              className={styles.beatFxBtn}
              data-active={activeBeatFX === fx.id}
              style={{
                borderColor: activeBeatFX === fx.id ? fx.color : 'var(--border-default)',
                color: activeBeatFX === fx.id ? fx.color : 'var(--text-muted)',
                background: activeBeatFX === fx.id ? `${fx.color}15` : 'transparent',
              }}
              onClick={() => handleSelectBeatFX(fx.id)}
            >
              {fx.label}
            </button>
          ))}
        </div>

        {/* Beat division */}
        <div className={styles.beatDivRow}>
          {BEAT_DIVS.map((d) => (
            <button
              key={d.value}
              className={styles.beatDivBtn}
              style={{
                borderColor: beatDiv === d.value ? (activeDef?.color ?? 'var(--accent-green)') : 'var(--border-default)',
                color: beatDiv === d.value ? (activeDef?.color ?? 'var(--accent-green)') : 'var(--text-muted)',
              }}
              onClick={() => handleBeatDiv(d.value)}
            >
              {d.label}
            </button>
          ))}
        </div>

        {/* Wet + ON/OFF */}
        <div className={styles.beatFxControls}>
          <input
            type="range" min="0" max="100" step="1"
            value={beatWet}
            onChange={handleBeatWet}
            className={styles.colorFxSlider}
            style={{ accentColor: activeDef?.color ?? 'var(--accent-green)', flex: 1 }}
          />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-secondary)', minWidth: 32 }}>
            {beatWet}%
          </span>
          <button
            className={styles.beatOnOff}
            style={{
              background: beatFXOn ? (activeDef?.color ?? 'var(--accent-green)') : 'transparent',
              borderColor: beatFXOn ? (activeDef?.color ?? 'var(--accent-green)') : 'var(--border-default)',
              color: beatFXOn ? '#000' : 'var(--text-secondary)',
            }}
            onClick={handleBeatFXToggle}
            disabled={!activeBeatFX}
          >
            ON
          </button>
        </div>
      </div>
    </div>
  )
}
