/**
 * useBPMDetector — hook per analisi BPM via Web Worker
 *
 * Uso:
 *   const { analyzeBPM } = useBPMDetector()
 *   const bpm = await analyzeBPM(audioBuffer)
 */

import { useRef, useCallback } from 'react'

export function useBPMDetector() {
  const workerRef = useRef(null)

  const getWorker = useCallback(() => {
    if (!workerRef.current) {
      workerRef.current = new Worker(
        new URL('../workers/bpmDetector.worker.js', import.meta.url),
        { type: 'module' }
      )
    }
    return workerRef.current
  }, [])

  const analyzeBPM = useCallback((audioBuffer) => {
    return new Promise((resolve, reject) => {
      if (!audioBuffer) { resolve(null); return }

      const worker = getWorker()
      const channelData = audioBuffer.getChannelData(0)

      const onMessage = (e) => {
        worker.removeEventListener('message', onMessage)
        if (e.data.type === 'RESULT') resolve(e.data.bpm)
        else reject(new Error(e.data.message))
      }

      worker.addEventListener('message', onMessage)
      // Trasferisce il buffer senza copiarlo (più veloce)
      const copy = channelData.slice(0)
      worker.postMessage(
        { type: 'ANALYZE', sampleRate: audioBuffer.sampleRate, channelData: copy },
        [copy.buffer]
      )
    })
  }, [getWorker])

  return { analyzeBPM }
}
