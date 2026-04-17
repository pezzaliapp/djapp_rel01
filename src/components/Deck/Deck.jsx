import React, { useCallback, useRef, useEffect } from 'react'
import { flushSync } from 'react-dom'
import JogWheel from '@components/JogWheel/JogWheel.jsx'
import { audioEngine } from '@audio/AudioEngine.js'
import { useDeckStore } from '@store/useDeckStore.js'
import LoopControls from './LoopControls.jsx'
import KeyControls from './KeyControls.jsx'
import HotCues from './HotCues.jsx'
import { useBPMDetector } from '@hooks/useBPMDetector.js'
import { useLibraryStore } from '@store/useLibraryStore.js'
import styles from './Deck.module.css'

// Componente stabile per hot cue - evita closure bug nel map
function HotCueButton({ index, cue, deckColor, onPress, onLongPress }) {
  const timerRef = useRef(null)
  const didLongPress = useRef(false)

  const onDown = useCallback(() => {
    didLongPress.current = false
    timerRef.current = setTimeout(() => {
      didLongPress.current = true
      onLongPress(index)
    }, 600)
  }, [index, onLongPress])

  const onUp = useCallback(() => {
    clearTimeout(timerRef.current)
    if (!didLongPress.current) onPress(index)
  }, [index, onPress])

  useEffect(() => () => clearTimeout(timerRef.current), [])

  return (
    <button
      style={{
        width: 38, height: 38,
        borderRadius: 4,
        border: `1px solid ${cue !== null ? deckColor : 'var(--border-default)'}`,
        background: cue !== null ? deckColor : 'transparent',
        color: cue !== null ? '#000' : 'var(--text-muted)',
        fontFamily: 'var(--font-mono)',
        fontSize: 14,
        fontWeight: 700,
        cursor: 'pointer',
        transition: 'all 80ms ease',
      }}
      onMouseDown={onDown}
      onMouseUp={onUp}
      onTouchStart={(e) => { e.preventDefault(); onDown() }}
      onTouchEnd={(e) => { e.preventDefault(); onUp() }}
    >
      {index + 1}
    </button>
  )
}

export default function Deck({ deckId, side }) {
  const deck = useDeckStore((s) => s.decks[deckId])
  const setPlaying = useDeckStore((s) => s.setPlaying)
  const setTrack = useDeckStore((s) => s.setTrack)
  const setJogMode = useDeckStore((s) => s.setJogMode)
  const setCuePoint = useDeckStore((s) => s.setCuePoint)
  const setHotCue = useDeckStore((s) => s.setHotCue)
  const updateDeck = useDeckStore((s) => s.updateDeck)
  const setQuantize = useDeckStore((s) => s.setQuantize)
  const setSyncMaster = useDeckStore((s) => s.setSyncMaster)
  const selectedTrack = useLibraryStore((s) => s.selectedTrack)
  const fileInputRef = useRef(null)
  // Usa direttamente i valori dallo store — setTrack garantisce sempre valori validi
  const displayTitle = deck.trackTitle
  const displayArtist = deck.trackArtist
  const displayDuration = deck.trackDuration ?? 0

  // Chrome: riprendi AudioContext ad ogni gesto utente
  const resumeCtx = useCallback(async () => {
    try {
      if (audioEngine.ctx?.state === 'suspended') await audioEngine.ctx.resume()
    } catch(_) {}
  }, [])


  const { analyzeBPM } = useBPMDetector()
  const setBPM = useDeckStore((s) => s.setBPM)
  const deckColor = deckId === 'A' ? 'var(--deck-a)' : 'var(--deck-b)'

  const getEng = useCallback(() => {
    if (!audioEngine.ready) return null
    try { return audioEngine.deck(deckId) } catch { return null }
  }, [deckId])

  // ── PLAY / PAUSE ─────────────────────────────────────

  const handlePlay = useCallback(async () => {
    await resumeCtx()
    const eng = getEng()
    if (!eng) return
    try {
      if (eng.playing) { eng.pause(); setPlaying(deckId, false) }
      else { eng.play(); setPlaying(deckId, true) }
    } catch(_) {}
  }, [deckId, setPlaying, getEng, resumeCtx])

  // ── CUE ──────────────────────────────────────────────
  // Press while playing  → torna al cue point e mette in pausa
  // Press while stopped  → imposta il cue point qui
  // Hold while stopped   → riproduce finché tieni premuto (preview)

  const handleCueDown = useCallback(() => {
    const eng = getEng()
    if (!eng || !eng.buffer) return

    if (eng.playing) {
      // Torna al cue e pausa
      eng.seek(deck.cuePoint)
      eng.pause()
      setPlaying(deckId, false)
    } else {
      // Se già al cue point → preview (play finché tieni premuto)
      // Se in posizione diversa → imposta nuovo cue
      const pos = eng.position
      const isAtCue = Math.abs(pos - deck.cuePoint) < 0.05
      if (isAtCue) {
        // Avvia preview
        eng.play()
        setPlaying(deckId, true)
      } else {
        // Imposta nuovo cue qui
        const newCue = eng.position
        eng.seek(newCue)
        setCuePoint(deckId, newCue)
      }
    }
  }, [deckId, deck.cuePoint, setPlaying, setCuePoint, getEng])

  const handleCueUp = useCallback(() => {
    const eng = getEng()
    if (!eng) return
    // Se stava facendo preview (play da cue), torna al cue e pausa
    if (eng.playing) {
      eng.seek(deck.cuePoint)
      eng.pause()
      setPlaying(deckId, false)
    }
  }, [deckId, deck.cuePoint, setPlaying, getEng])

  // ── HOT CUES ─────────────────────────────────────────
  // Prima pressione (slot vuoto) → salva posizione corrente
  // Pressione successiva → salta a quella posizione e riparte

  const handleHotCue = useCallback((index) => {
    const eng = getEng()
    if (!eng || !eng.buffer) return

    const existing = deck.hotCues[index]
    if (existing === null) {
      // Salva posizione corrente
      const pos = eng.position
      setHotCue(deckId, index, pos)
    } else {
      // Salta e riparte
      eng.seek(existing)
      if (!eng.playing) {
        eng.play()
        setPlaying(deckId, true)
      }
    }
  }, [deckId, deck.hotCues, setHotCue, setPlaying, getEng])

  const handleHotCueLongPress = useCallback((index) => {
    // Tieni premuto → cancella hot cue
    setHotCue(deckId, index, null)
  }, [deckId, setHotCue])

  // ── STOP ─────────────────────────────────────────────

  const handleStop = useCallback(() => {
    const eng = getEng()
    if (!eng) return
    eng.stop()
    setPlaying(deckId, false)
  }, [deckId, setPlaying, getEng])

  // ── PITCH ────────────────────────────────────────────

  const handlePitchChange = useCallback((e) => {
    const rate = parseFloat(e.target.value)
    const eng = getEng()
    if (eng) {
      eng.setPlaybackRate(rate)  // setPlaybackRate gestisce già Master Tempo internamente
    }
    updateDeck(deckId, { playbackRate: rate })
  }, [deckId, updateDeck, getEng])

  // ── JOG MODE ─────────────────────────────────────────

  const toggleJogMode = useCallback(() => {
    setJogMode(deckId, deck.jogMode === 'nudge' ? 'scratch' : 'nudge')
  }, [deckId, deck.jogMode, setJogMode])

  // ── SYNC ─────────────────────────────────────────────

  const handleSync = useCallback(() => {
    if (!audioEngine.ready) return
    const otherDeckId = deckId === 'A' ? 'B' : 'A'
    const state = useDeckStore.getState()
    const masterBPM = state.decks[otherDeckId]?.bpm
    const slaveBPM  = state.decks[deckId]?.bpm

    const isSynced = audioEngine.sync?.isSynced(deckId)

    if (isSynced) {
      // Disattiva sync
      audioEngine.sync?.unsyncDeck(deckId)
      updateDeck(deckId, { syncEnabled: false })
    } else {
      // Imposta l'altro deck come master e sincronizza questo
      audioEngine.sync?.setMaster(otherDeckId)
      const ok = audioEngine.sync?.syncDeck(deckId, masterBPM, slaveBPM)
      updateDeck(deckId, { syncEnabled: !!ok })
      // Aggiorna playback rate nello store
      const eng = getEng()
      if (eng) updateDeck(deckId, { playbackRate: eng._playbackRate })
    }
  }, [deckId, updateDeck, getEng])

  // ── QUANTIZE ─────────────────────────────────────────

  const handleQuantize = useCallback(() => {
    const newVal = !deck.quantize
    setQuantize(deckId, newVal)
  }, [deckId, deck.quantize, setQuantize])

  // ── FILE LOAD ────────────────────────────────────────

  const handleFileChange = useCallback(async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Step 1: assicura AudioContext attivo PRIMA di qualsiasi operazione
    if (!audioEngine.ready) {
      await audioEngine.init()
    }
    if (audioEngine.ctx?.state === 'suspended') {
      await audioEngine.ctx.resume()
    }

    // Step 2: decodifica il file audio
    let audioBuffer
    try {
      const arrayBuffer = await file.arrayBuffer()
      audioBuffer = await audioEngine.ctx.decodeAudioData(arrayBuffer)
    } catch (err) {
      console.warn('[load] decode failed:', err.message)
      return
    }

    // Step 3: carica nel DeckEngine
    let eng
    try { eng = audioEngine.deck(deckId) } catch { return }

    // Ferma tutto e carica
    eng._stopSource?.()
    eng.buffer = audioBuffer
    eng._startOffset = 0
    eng._playing = false
    eng._source = null
    if (eng.loop) eng.loop.loopIn = null, eng.loop.loopOut = null, eng.loop.active = false

    // Step 4: aggiorna store con flushSync — forza render immediato in Chrome
    // senza flushSync, Chrome in modalità ottimizzata può differire il re-render
    const title = file.name.replace(/\.[^.]+$/, '')
    flushSync(() => {
      setTrack(deckId, { title, artist: 'Local File', duration: audioBuffer.duration })
    })

    // Step 5: BPM in background — delay 500ms per stabilizzare prima
    const capturedId = deckId
    setTimeout(() => {
      analyzeBPM(audioBuffer).then((bpm) => {
        if (bpm) {
          setBPM(capturedId, bpm)
          try { audioEngine.deck(capturedId).loop?.setBPM(bpm) } catch(_) {}
        }
      }).catch(() => {})
    }, 500)
  }, [deckId, setPlaying, setTrack, analyzeBPM, setBPM])

  const handleLoadFromLibrary = useCallback(async () => {
    if (!selectedTrack?.file) return
    if (!audioEngine.ready) await audioEngine.init()
    const eng = audioEngine.deck(deckId)
    const ok = await eng.loadFile(selectedTrack.file)
    if (ok) {
      flushSync(() => {
        setTrack(deckId, { title: selectedTrack.title, artist: selectedTrack.artist ?? 'Unknown', duration: eng.duration })
      })
      analyzeBPM(eng.buffer).then((bpm) => {
        if (bpm) {
          setBPM(deckId, bpm)
          eng.loop?.setBPM(bpm)
        }
      }).catch(() => {})
    }
  }, [deckId, selectedTrack, setPlaying, setTrack, analyzeBPM, setBPM])

  // ── FORMAT ───────────────────────────────────────────

  const fmt = (s) => {
    if (!s || isNaN(s)) return '0:00'
    return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`
  }

  let isPlaying = false
  try { isPlaying = audioEngine.ready ? (audioEngine.deck(deckId)?.playing ?? false) : false } catch(_) {}

  return (
    <div className={styles.deck} data-side={side}>
      <div className={styles.deckAccent} style={{ background: deckColor }} />

      {/* Track info */}
      <div className={styles.trackInfo}>
        <div className={styles.trackTitle}>{displayTitle ?? '— no track loaded —'}</div>
        <div className={styles.trackArtist}>{displayArtist ?? ''}</div>
        <div className={styles.trackTime}>
          <span className={styles.timeCurrent}>{fmt(deck.position)}</span>
          <span className={styles.timeSep}> / </span>
          <span>-{fmt(displayDuration - (deck.position ?? 0))}</span>
        </div>
      </div>

      {/* BPM */}
      <div className={styles.bpmDisplay} style={{ color: deckColor }}>
        <span className={styles.bpmValue}>{deck.bpm ? deck.bpm.toFixed(1) : '—.—'}</span>
        <span className={styles.bpmLabel}>BPM</span>
      </div>

      {/* Jog wheel */}
      <JogWheel deckId={deckId} side={side} />

      {/* Jog mode */}
      <button
        className={styles.jogModeBtn}
        style={{ borderColor: deckColor, color: deck.jogMode === 'scratch' ? deckColor : 'var(--text-secondary)' }}
        onClick={toggleJogMode}
      >
        {deck.jogMode === 'scratch' ? '⦿ SCRATCH' : '⟳ NUDGE'}
      </button>

      {/* KEY SHIFT + MASTER TEMPO */}
      <KeyControls deckId={deckId} />

      {/* SYNC + QUANTIZE */}
      <div style={{ display: 'flex', gap: 8, width: '100%', padding: '0 4px' }}>
        <button
          onClick={handleSync}
          style={{
            flex: 1, height: 36,
            background: deck.syncEnabled ? deckColor : 'transparent',
            border: `1px solid ${deck.syncEnabled ? deckColor : 'var(--border-default)'}`,
            color: deck.syncEnabled ? '#000' : 'var(--text-secondary)',
            fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700,
            letterSpacing: '0.1em', borderRadius: 4, cursor: 'pointer',
            transition: 'all 80ms ease',
          }}
        >⇌ SYNC</button>
        <button
          onClick={handleQuantize}
          style={{
            flex: 1, height: 36,
            background: deck.quantize ? deckColor : 'transparent',
            border: `1px solid ${deck.quantize ? deckColor : 'var(--border-default)'}`,
            color: deck.quantize ? '#000' : 'var(--text-secondary)',
            fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700,
            letterSpacing: '0.1em', borderRadius: 4, cursor: 'pointer',
            transition: 'all 80ms ease',
          }}
        >◈ QUANTIZE</button>
      </div>

      {/* Pitch */}
      <div className={styles.pitchSection}>
        <span className={styles.pitchLabel}>PITCH</span>
        <input type="range" className={styles.pitchSlider}
          min="0.7" max="1.3" step="0.001"
          value={deck.playbackRate}
          onChange={handlePitchChange}
          style={{ accentColor: deckColor }} />
        <span className={styles.pitchValue} style={{ color: deckColor }}>
          {deck.playbackRate !== 1 ? `${((deck.playbackRate - 1) * 100).toFixed(1)}%` : '±0%'}
        </span>
      </div>

      {/* Transport */}
      <div className={styles.transport}>
        <button
          className={styles.btnCue}
          onMouseDown={handleCueDown}
          onMouseUp={handleCueUp}
          onTouchStart={(e) => { e.preventDefault(); handleCueDown() }}
          onTouchEnd={(e) => { e.preventDefault(); handleCueUp() }}
          style={{ borderColor: deck.cuePoint > 0 ? deckColor : 'var(--border-default)',
                   color: deck.cuePoint > 0 ? deckColor : 'var(--text-secondary)' }}
        >CUE</button>

        <button
          className={styles.btnPlay}
          onClick={handlePlay}
          style={{ borderColor: isPlaying ? deckColor : 'var(--border-default)' }}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>

        <button className={styles.btnStop} onClick={handleStop}>■</button>
      </div>

      {/* Hot cues — 8 colorati + 4 bank */}
      <HotCues deckId={deckId} />

      {/* Loop Controls */}
      <LoopControls deckId={deckId} />

      {/* Loader */}
      <div className={styles.loaderRow}>
        <button className={styles.loadBtn} onClick={async () => {
          // iOS: inizializza AudioContext sul tap, PRIMA di aprire il picker
          try {
            if (!audioEngine.ready) await audioEngine.init()
            else if (audioEngine.ctx?.state === 'suspended') await audioEngine.ctx.resume()
          } catch(_) {}
          fileInputRef.current?.click()
        }}>LOAD FILE</button>
        <button className={styles.loadBtn} onClick={handleLoadFromLibrary} disabled={!selectedTrack}>FROM LIBRARY</button>
        <input ref={fileInputRef} type="file" accept=".mp3,.m4a,.aac,.wav,.ogg,.flac,.aiff,.mp4,audio/*" style={{ display: 'none' }} onChange={handleFileChange} />
      </div>
    </div>
  )
}
