/**
 * useLibraryStore — libreria tracce locale
 *
 * In questa versione: filesystem locale via File System Access API.
 * Struttura predisposta per future integrazioni cloud.
 */

import { create } from 'zustand'

export const useLibraryStore = create((set, get) => ({
  tracks: [],          // array di TrackEntry
  selectedTrack: null,
  searchQuery: '',
  sortBy: 'title',     // 'title' | 'artist' | 'bpm' | 'duration'
  sortDir: 'asc',

  // ── Import ───────────────────────────────────

  /**
   * Importa file da input <input type="file"> o drag-and-drop.
   * Crea oggetti URL temporanei per ogni file.
   */
  importFiles: (fileList) => {
    const newTracks = Array.from(fileList)
      .filter((f) => f.type.startsWith('audio/'))
      .map((file) => ({
        id: crypto.randomUUID(),
        title: file.name.replace(/\.[^.]+$/, ''),
        artist: 'Unknown',
        bpm: null,
        key: null,
        duration: null,
        file,
        objectUrl: URL.createObjectURL(file),
        loaded: false,
      }))

    set((state) => ({ tracks: [...state.tracks, ...newTracks] }))
  },

  /** Rimuove un brano (revoca URL) */
  removeTrack: (id) => {
    const track = get().tracks.find((t) => t.id === id)
    if (track?.objectUrl) URL.revokeObjectURL(track.objectUrl)
    set((state) => ({ tracks: state.tracks.filter((t) => t.id !== id) }))
  },

  /** Aggiorna metadati (es. dopo analisi BPM) */
  updateTrackMeta: (id, meta) =>
    set((state) => ({
      tracks: state.tracks.map((t) => (t.id === id ? { ...t, ...meta } : t)),
    })),

  // ── UI ───────────────────────────────────────

  setSelectedTrack: (track) => set({ selectedTrack: track }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setSort: (by, dir) => set({ sortBy: by, sortDir: dir }),

  /** Tracce filtrate e ordinate */
  getFilteredTracks: () => {
    const { tracks, searchQuery, sortBy, sortDir } = get()
    const q = searchQuery.toLowerCase()
    const filtered = q
      ? tracks.filter(
          (t) =>
            t.title.toLowerCase().includes(q) ||
            t.artist.toLowerCase().includes(q),
        )
      : tracks

    return [...filtered].sort((a, b) => {
      const va = a[sortBy] ?? ''
      const vb = b[sortBy] ?? ''
      const cmp = String(va).localeCompare(String(vb))
      return sortDir === 'asc' ? cmp : -cmp
    })
  },
}))
