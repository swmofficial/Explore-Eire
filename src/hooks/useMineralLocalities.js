// useMineralLocalities.js — Batched load of mineral_localities from Supabase
// IMPORTANT: loads in batches of 1000 — do NOT change to single query
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useMineralLocalities() {
  const [localities, setLocalities] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function loadAll() {
      setLoading(true)
      const batchSize = 1000
      let offset = 0
      const all = []

      while (true) {
        const { data, error: err } = await supabase
          .from('mineral_localities')
          .select('id, minlocno, mineral, mineral_category, lat, lng, townland, county, description, notes')
          .range(offset, offset + batchSize - 1)

        if (cancelled) return
        if (err) { setError(err); break }
        if (!data || data.length === 0) break

        all.push(...data)
        if (data.length < batchSize) break
        offset += batchSize
      }

      if (!cancelled) {
        setLocalities(all)
        setLoading(false)
      }
    }

    loadAll()
    return () => { cancelled = true }
  }, [])

  return { localities, loading, error }
}
