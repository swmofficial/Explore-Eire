// useOffline.js — Tile download management for offline maps
// TODO: manage offline regions via IndexedDB tile store, track download state
import { useState, useEffect } from 'react'

export function useOffline() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [regions, setRegions] = useState([])
  const [downloading, setDownloading] = useState(null)

  useEffect(() => {
    const handleOnline  = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online',  handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online',  handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  async function downloadRegion(bbox, resolution, name) {
    // TODO: estimate tile count, download tiles to IndexedDB, save metadata to Supabase
  }

  async function deleteRegion(id) {
    // TODO: remove tiles from IndexedDB, delete metadata from Supabase
  }

  return { isOnline, regions, downloading, downloadRegion, deleteRegion }
}
