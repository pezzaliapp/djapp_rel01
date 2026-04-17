/**
 * SyncEngine — Beat Sync automatico A↔B
 *
 * Il deck MASTER mantiene BPM e fase.
 * Il deck SLAVE aggiusta il playbackRate per matchare il master.
 * La fase viene corretta con un seek preciso al beat più vicino.
 */

export class SyncEngine {
  constructor(audioEngine) {
    this.audio = audioEngine
    this._masterId = 'A'
    this._syncedDecks = new Set()
  }

  setMaster(deckId) {
    this._masterId = deckId
    this._syncedDecks.delete(deckId)
  }

  /**
   * Sincronizza deckId al master.
   * @param {string} deckId
   * @param {number} masterBPM
   * @param {number} slaveBPM
   */
  syncDeck(deckId, masterBPM, slaveBPM) {
    if (!this.audio.ready) return false
    const master = this.audio.deck(this._masterId)
    const slave  = this.audio.deck(deckId)

    if (masterBPM && slaveBPM && masterBPM > 0 && slaveBPM > 0) {
      // Aggiusta playback rate
      const rate = masterBPM / slaveBPM
      slave.setPlaybackRate(rate)
      slave.loop?.setBPM(masterBPM)

      // Correzione fase: allinea al beat del master
      const beatLen = 60 / masterBPM
      const masterPhase = master.position % beatLen
      const slavePos = slave.position
      const slavePhase = slavePos % beatLen
      let phaseDiff = masterPhase - slavePhase
      if (phaseDiff > beatLen / 2) phaseDiff -= beatLen
      if (phaseDiff < -beatLen / 2) phaseDiff += beatLen

      // Nudge graduale se fuori fase di più di 5ms
      if (Math.abs(phaseDiff) > 0.005) {
        const nudge = 1 + (phaseDiff / (beatLen * 2))
        slave.nudge(Math.max(0.9, Math.min(1.1, nudge)))
        setTimeout(() => {
          try { slave.nudgeRelease() } catch(_) {}
        }, beatLen * 1000)
      }
    } else {
      // Senza BPM: sync di posizione diretta
      if (master.playing) {
        slave.seek(master.position)
      }
    }

    this._syncedDecks.add(deckId)
    return true
  }

  unsyncDeck(deckId) {
    this._syncedDecks.delete(deckId)
    try { this.audio.deck(deckId).nudgeRelease() } catch(_) {}
  }

  get masterId() { return this._masterId }
  isSynced(deckId) { return this._syncedDecks.has(deckId) }
}
