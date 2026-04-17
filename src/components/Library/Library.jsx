/**
 * Library — browser tracce locale
 *
 * Feature:
 *  - Import via drag & drop o file picker
 *  - Ricerca in tempo reale
 *  - Selezione traccia → caricabile su qualsiasi deck
 *  - Lista con titolo, artista, durata
 */

import React, { useCallback, useRef } from 'react'
import { useLibraryStore } from '@store/useLibraryStore.js'
import styles from './Library.module.css'

function formatDuration(s) {
  if (!s) return '--:--'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60).toString().padStart(2, '0')
  return `${m}:${sec}`
}

export default function Library() {
  const tracks = useLibraryStore((s) => s.getFilteredTracks())
  const selectedTrack = useLibraryStore((s) => s.selectedTrack)
  const searchQuery = useLibraryStore((s) => s.searchQuery)
  const importFiles = useLibraryStore((s) => s.importFiles)
  const setSelectedTrack = useLibraryStore((s) => s.setSelectedTrack)
  const setSearchQuery = useLibraryStore((s) => s.setSearchQuery)
  const removeTrack = useLibraryStore((s) => s.removeTrack)

  const fileInputRef = useRef(null)
  const dropZoneRef = useRef(null)

  // ── Import ────────────────────────────────────────

  const handleFiles = useCallback((fileList) => {
    importFiles(fileList)
  }, [importFiles])

  const handleFileInput = (e) => {
    if (e.target.files?.length) handleFiles(e.target.files)
    e.target.value = ''
  }

  // ── Drag & Drop ───────────────────────────────────

  const onDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    dropZoneRef.current?.classList.add(styles.dragOver)
  }

  const onDragLeave = () => {
    dropZoneRef.current?.classList.remove(styles.dragOver)
  }

  const onDrop = (e) => {
    e.preventDefault()
    dropZoneRef.current?.classList.remove(styles.dragOver)
    if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files)
  }

  return (
    <div
      className={styles.library}
      ref={dropZoneRef}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* ── Toolbar ─────────────────────────────────── */}
      <div className={styles.toolbar}>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Search tracks..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        <button
          className={styles.importBtn}
          onClick={() => fileInputRef.current?.click()}
        >
          + IMPORT
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".mp3,.m4a,.aac,.wav,.ogg,.flac,.aiff,.mp4,audio/*"
          multiple
          style={{ display: 'none' }}
          onChange={handleFileInput}
        />

        <span className={styles.trackCount}>
          {tracks.length} {tracks.length === 1 ? 'track' : 'tracks'}
        </span>
      </div>

      {/* ── Track list ──────────────────────────────── */}
      <div className={styles.trackList}>
        {tracks.length === 0 && (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>◎</span>
            <span>Drop audio files here or click IMPORT</span>
          </div>
        )}

        {tracks.map((track) => (
          <div
            key={track.id}
            className={styles.trackRow}
            data-selected={track.id === selectedTrack?.id}
            onClick={() => setSelectedTrack(track)}
            onDoubleClick={() => setSelectedTrack(track)}
          >
            <div className={styles.trackIndex}>
              {track.id === selectedTrack?.id ? '▶' : '·'}
            </div>

            <div className={styles.trackMeta}>
              <span className={styles.trackTitle}>{track.title}</span>
              <span className={styles.trackArtist}>{track.artist}</span>
            </div>

            <div className={styles.trackStats}>
              {track.bpm && (
                <span className={styles.trackBpm}>{track.bpm.toFixed(0)}</span>
              )}
              <span className={styles.trackDur}>
                {formatDuration(track.duration)}
              </span>
            </div>

            <button
              className={styles.removeBtn}
              onClick={(e) => {
                e.stopPropagation()
                removeTrack(track.id)
                if (selectedTrack?.id === track.id) setSelectedTrack(null)
              }}
              title="Remove from library"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
