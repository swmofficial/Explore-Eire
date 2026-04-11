// useGoldSamples.js — Batched load of gold_samples from Supabase
// IMPORTANT: loads in batches of 1000 — do NOT change to single query
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useGoldSamples() {
  const [samples, setSamples] = useState([])
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
          .from('gold_samples')
          .select('id, sample_id, lat, lng, au_ppb, as_mgkg, pb_mgkg, sample_type, survey, easting_ing, northing_ing, rock_type, rock_desc')
          .range(offset, offset + batchSize - 1)

        if (cancelled) return
        if (err) { setError(err); break }
        if (!data || data.length === 0) break

        all.push(...data)
        if (data.length < batchSize) break
        offset += batchSize
      }

      if (!cancelled) {
        setSamples(all)
        setLoading(false)
      }
    }

    loadAll()
    return () => { cancelled = true }
  }, [])

  return { samples, loading, error }
}
