// useGoldSamples.js — Batched load of gold_samples from Supabase
// IMPORTANT: loads in batches of 1000 — do NOT change to single query
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useGoldSamples() {
  const [samples, setSamples] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    // TODO: batch load gold_samples in pages of 1000 using .range()
    // Merge batches into single samples array
    // gold_samples has RLS: public read (anon + authenticated)
  }, [])

  return { samples, loading, error }
}
