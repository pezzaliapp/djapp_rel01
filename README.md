# djApp — by PezzaliApp

**Web DJ Controller professionale** — React + Vite + Web Audio API

🔗 **Live:** https://www.alessandropezzali.it/djapp_rel01/

---

## Feature implementate

| Feature | Stato |
|---|---|
| 2 Deck indipendenti (A/B) | ✅ |
| JogWheel SVG multitouch (Scratch / Nudge) | ✅ |
| Waveform scrollante + Beat Grid + Overview minimap | ✅ |
| BPM Detector (Web Worker, autocorrelazione) | ✅ |
| Loop Engine (auto-loop 1/4→16 beat, IN/OUT, halve/double, beat jump) | ✅ |
| 8 Hot Cue colorati + 4 Bank (32 totali per deck) | ✅ |
| BPM Sync A↔B con correzione fase + Phase Meter | ✅ |
| Beat FX (9 effetti sync al beat) | ✅ |
| Color FX (Reverb / Delay / Filter / Flanger wet) | ✅ |
| Smooth Echo (fade-in/out naturale, stile Pioneer Opus Quad) | ✅ |
| EQ 3 bande + Gain + Crossfader cosinusoidale | ✅ |
| Key Shift ±6 semitoni | ✅ |
| Master Tempo (detune compensation) | ✅ |
| Quantize (aggancio automatico al beat) | ✅ |
| Keyboard Shortcuts + Help overlay (?) | ✅ |
| PWA installabile (iPhone / Android) | ✅ |
| Service Worker offline-first + auto-update | ✅ |
| Layout mobile a schede (DECK A / MIXER / DECK B / LIBRARY) | ✅ |
| iOS Safari + Android Chrome | ✅ |

---

## Stack

| Layer | Tecnologia |
|---|---|
| UI | React 18 + Vite 5 |
| State | Zustand |
| Audio | Web Audio API (AudioContext, BiquadFilter, GainNode) |
| Jog | SVG + Touch API multitouch + Mouse drag |
| Stile | CSS Modules (design system dark premium) |
| Deploy | GitHub Pages |

---

## Avvio in locale

```bash
npm install
npm run dev
# http://localhost:3000
```

## Build produzione

```bash
npm run build
# output in /dist — copia assets/ e index.html nella root del repo
```

---

## Struttura progetto

```
src/
├── audio-engine/
│   ├── AudioEngine.js        ← Singleton AudioContext + routing master
│   ├── DeckEngine.js         ← Catena audio per singolo deck + scratch + nudge
│   ├── LoopEngine.js         ← Loop engine (auto, IN/OUT, halve/double)
│   ├── FXEngine.js           ← Color FX (reverb/delay/filter/flanger)
│   ├── BeatFXEngine.js       ← 9 Beat FX sync al beat
│   ├── SmoothEchoEngine.js   ← Smooth Echo con fade naturale
│   └── SyncEngine.js         ← BPM Sync A↔B con correzione fase
├── components/
│   ├── Deck/
│   │   ├── Deck.jsx          ← Deck completo
│   │   ├── HotCues.jsx       ← 8 hot cue + 4 bank + CLR
│   │   ├── LoopControls.jsx  ← Loop engine UI
│   │   └── KeyControls.jsx   ← Key Shift + Master Tempo
│   ├── FX/                   ← FX strip (Color FX + Beat FX + Smooth Echo)
│   ├── JogWheel/             ← Jog wheel SVG multitouch + mouse
│   ├── Library/              ← Browser tracce + drag & drop
│   ├── Mixer/                ← Crossfader + EQ 3 bande + Phase Meter
│   └── Waveform/             ← Canvas waveform scrollante + beat grid + overview
├── hooks/
│   ├── useBPMDetector.js     ← Web Worker BPM (autocorrelazione)
│   ├── useKeyboardShortcuts.js ← Shortcuts globali
│   ├── useMultitouch.js      ← Routing touch → deck (multitouch iPhone)
│   ├── usePositionSync.js    ← RAF loop posizione audio → store
│   ├── useWaveformRenderer.js ← Canvas draw + zoom + pinch
│   └── usePWA.js             ← SW registration + auto-update banner
├── store/
│   ├── useDeckStore.js       ← Stato UI deck (transport, cue, hotcue, loop, sync)
│   ├── useLibraryStore.js    ← Libreria tracce locale
│   └── useMixerStore.js      ← Crossfader, gain, EQ
├── workers/
│   └── bpmDetector.worker.js ← BPM analysis Web Worker
├── styles/
│   └── global.css            ← Design system + variabili CSS
└── utils/
    ├── angleUtils.js
    └── formatUtils.js
```

---

## Keyboard Shortcuts (Desktop)

| Tasto | Funzione |
|---|---|
| Spazio | Play/Pausa Deck A |
| Z | CUE Deck A |
| Esc | Stop Deck A |
| 1-8 | Hot Cue 1-8 Deck A |
| ← → | Beat Jump Deck A |
| Q / E | Key Shift ♭/♯ Deck A |
| Invio | Play/Pausa Deck B |
| M | CUE Deck B |
| F1-F8 | Hot Cue 1-8 Deck B |
| ↑ ↓ | Beat Jump Deck B |
| O / P | Key Shift ♭/♯ Deck B |
| ? | Apri/chiudi pannello shortcuts |

---

## Note tecniche

**Service Worker**: bypass completo per audio, blob e range requests (fix Chrome).

**Master Tempo**: `detune = -1200 × log₂(playbackRate)` — compensazione pitch esatta.

**Crossfader**: curva cosinusoidale (standard Pioneer DJM) — -3dB al centro.

**Multitouch jog**: ogni touch identifier viene mappato al deck corretto tramite `elementFromPoint`.

---

## Crediti

Sviluppato da **Alessandro Pezzali** — [PezzaliApp](https://alessandropezzali.it)

GitHub: [pezzaliapp/djapp_rel01](https://github.com/pezzaliapp/djapp_rel01)
