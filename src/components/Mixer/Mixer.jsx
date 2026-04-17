/**
 * Mixer — mixer centrale
 *
 * Contiene:
 *  - Channel strips per deck A e B (gain + EQ 3 bande)
 *  - Crossfader
 *  - Master volume (placeholder)
 */

import React, { useCallback } from 'react'
import { useMixerStore } from '@store/useMixerStore.js'
import PhaseMeter from './PhaseMeter.jsx'
import { useDeckStore } from '@store/useDeckStore.js'
import { audioEngine } from '@audio/AudioEngine.js'
import styles from './Mixer.module.css'

function EQKnob({ label, value, onChange, color }) {
  return (
    <div className={styles.eqKnob}>
      <span className={styles.eqLabel}>{label}</span>
      <input
        type="range"
        className={styles.vertSlider}
        min="-12"
        max="12"
        step="0.5"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ accentColor: color }}
      />
      <span className={styles.eqValue} style={{ color }}>
        {value > 0 ? `+${value}` : value}
      </span>
    </div>
  )
}

function ChannelStrip({ deckId }) {
  const channel = useMixerStore((s) => s.channels[deckId])
  const setChannelGain = useMixerStore((s) => s.setChannelGain)
  const setEQ = useMixerStore((s) => s.setEQ)

  const color = deckId === 'A' ? 'var(--deck-a)' : 'var(--deck-b)'

  const handleGain = useCallback((v) => {
    setChannelGain(deckId, v)
    if (audioEngine.ready) {
      try { audioEngine.deck(deckId).setGain(v) } catch (_) {}
    }
  }, [deckId, setChannelGain])

  const handleEQ = useCallback((band, v) => {
    setEQ(deckId, band, v)
    if (audioEngine.ready) {
      try { audioEngine.deck(deckId).setEQ(band.toLowerCase(), v) } catch (_) {}
    }
  }, [deckId, setEQ])

  return (
    <div className={styles.channelStrip}>
      <div className={styles.channelLabel} style={{ color }}>{deckId}</div>

      {/* EQ */}
      <EQKnob label="HI" value={channel.eqHigh} onChange={(v) => handleEQ('High', v)} color={color} />
      <EQKnob label="MID" value={channel.eqMid} onChange={(v) => handleEQ('Mid', v)} color={color} />
      <EQKnob label="LO" value={channel.eqLow} onChange={(v) => handleEQ('Low', v)} color={color} />

      {/* Channel Gain (fader verticale) */}
      <div className={styles.gainSection}>
        <span className={styles.gainLabel}>GAIN</span>
        <input
          type="range"
          className={styles.vertFader}
          min="0"
          max="1"
          step="0.01"
          value={channel.gain}
          onChange={(e) => handleGain(parseFloat(e.target.value))}
          style={{ accentColor: color }}
          orient="vertical"
        />
        <span className={styles.gainValue} style={{ color }}>
          {Math.round(channel.gain * 100)}
        </span>
      </div>
    </div>
  )
}

function BPMDisplay() {
  const bpmA = useDeckStore((s) => s.decks.A?.bpm)
  const bpmB = useDeckStore((s) => s.decks.B?.bpm)

  const fmt = (b) => b ? b.toFixed(1) : '—.—'
  const diff = bpmA && bpmB ? Math.abs(bpmA - bpmB).toFixed(1) : null

  return (
    <div style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', lineHeight: 1.3 }}>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: 'var(--deck-a)', fontSize: 13, fontWeight: 700 }}>{fmt(bpmA)}</span>
        <span style={{ color: 'var(--text-muted)', fontSize: 9 }}>BPM</span>
        <span style={{ color: 'var(--deck-b)', fontSize: 13, fontWeight: 700 }}>{fmt(bpmB)}</span>
      </div>
      {diff && (
        <div style={{ fontSize: 9, color: parseFloat(diff) < 0.5 ? 'var(--accent-green)' : 'var(--accent-orange)', marginTop: 1 }}>
          {parseFloat(diff) < 0.1 ? '✓ IN SYNC' : `Δ ${diff}`}
        </div>
      )}
    </div>
  )
}

export default function Mixer({ deckIds }) {
  const crossfader = useMixerStore((s) => s.crossfader)
  const setCrossfader = useMixerStore((s) => s.setCrossfader)

  const handleCrossfader = useCallback((e) => {
    const val = parseFloat(e.target.value)
    setCrossfader(val)
    // Applica gains crossfader all'audio engine
    if (audioEngine.ready) {
      const gains = useMixerStore.getState().getCrossfaderGains()
      try {
        deckIds.forEach((id) => {
          // Moltiplica gain canale × gain crossfader
          const ch = useMixerStore.getState().channels[id]
          audioEngine.deck(id).setGain(ch.gain * gains[id])
        })
      } catch (_) {}
    }
  }, [deckIds, setCrossfader])

  return (
    <div className={styles.mixer}>
      <div className={styles.mixerTitle}>MIXER</div>
      <BPMDisplay />
      <PhaseMeter />

      {/* Channel strips */}
      <div className={styles.channels}>
        {deckIds.map((id) => (
          <ChannelStrip key={id} deckId={id} />
        ))}
      </div>

      {/* Crossfader */}
      <div className={styles.crossfaderSection}>
        <span className={styles.cfLabel} style={{ color: 'var(--deck-a)' }}>A</span>
        <input
          type="range"
          className={styles.crossfader}
          min="0"
          max="1"
          step="0.01"
          value={crossfader}
          onChange={handleCrossfader}
        />
        <span className={styles.cfLabel} style={{ color: 'var(--deck-b)' }}>B</span>
      </div>

      <div className={styles.cfCenter}>
        {crossfader === 0.5 ? 'CENTER' : crossfader < 0.5 ? `← A ${Math.round((0.5 - crossfader) * 200)}%` : `B ${Math.round((crossfader - 0.5) * 200)}% →`}
      </div>
    </div>
  )
}
