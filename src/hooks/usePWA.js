/**
 * usePWA — registra il Service Worker e gestisce gli aggiornamenti
 *
 * Quando è disponibile un nuovo SW:
 *  1. Mostra un banner "Nuova versione disponibile"
 *  2. L'utente clicca → skipWaiting → reload automatico
 *
 * Usato una sola volta in App.jsx
 */

import { useEffect, useState, useCallback } from 'react'

export function usePWA() {
  const [updateReady, setUpdateReady] = useState(false)
  const [registration, setRegistration] = useState(null)

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register('./sw.js', {
          scope: './',
          updateViaCache: 'none', // forza controllo aggiornamenti dal network
        })

        setRegistration(reg)

        // SW già in attesa (aggiornamento scaricato ma non attivato)
        if (reg.waiting) {
          setUpdateReady(true)
        }

        // Nuovo SW trovato durante questa sessione
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing
          if (!newWorker) return

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // C'è un nuovo SW pronto — avvisa l'utente
              setUpdateReady(true)
              setRegistration(reg)
            }
          })
        })

        // Controlla aggiornamenti ogni 30 minuti
        setInterval(() => reg.update(), 30 * 60 * 1000)

        // Ricarica la pagina quando il nuovo SW prende controllo
        let refreshing = false
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (!refreshing) {
            refreshing = true
            window.location.reload()
          }
        })

      } catch (err) {
        console.warn('[PWA] SW registration failed:', err)
      }
    }

    register()
  }, [])

  const applyUpdate = useCallback(() => {
    if (!registration?.waiting) return
    // Dice al SW in attesa di attivarsi subito
    registration.waiting.postMessage({ type: 'SKIP_WAITING' })
    setUpdateReady(false)
  }, [registration])

  return { updateReady, applyUpdate }
}
