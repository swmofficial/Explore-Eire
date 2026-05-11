/*
create table if not exists finds_log (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) on delete cascade,
  module_id     text not null default 'prospecting',
  title         text not null,
  description   text,
  photo_url     text,
  lat           double precision,
  lng           double precision,
  weight_g      numeric,
  size_mm       numeric,
  found_at      timestamptz default now(),
  created_at    timestamptz default now()
);
alter table finds_log enable row level security;
create policy "Users own their finds" on finds_log
  for all using (auth.uid() = user_id);
*/
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import useUserStore from '../store/userStore'
import useMapStore from '../store/mapStore'
import { useOfflineQueue } from './useOfflineQueue'

async function uploadFindPhoto(file, userId) {
  if (!file) return null
  const uuid = crypto.randomUUID()
  const path = `${userId}/${uuid}.jpg`
  const { error } = await supabase.storage
    .from('finds-photos')
    .upload(path, file, { contentType: file.type || 'image/jpeg', upsert: false })
  if (error) {
    console.warn('[useFindsLog] photo upload failed:', error.message)
    return null
  }
  const { data } = supabase.storage.from('finds-photos').getPublicUrl(path)
  return data?.publicUrl ?? null
}

export function useFindsLog() {
  const { user, isGuest } = useUserStore()
  const [finds, setFinds] = useState([])
  const [loading, setLoading] = useState(false)
  const { queueWrite } = useOfflineQueue()

  // ── READ ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user || isGuest) {
      setFinds([])
      return
    }
    setLoading(true)
    supabase
      .from('finds_log')
      .select('*')
      .eq('user_id', user.id)
      .order('found_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error('[useFindsLog] fetch error:', error.message)
        setFinds(data ?? [])
        setLoading(false)
      })
  }, [user?.id, isGuest]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── ADD ───────────────────────────────────────────────────────────
  const addFind = useCallback(
    async ({ title, description, lat, lng, weight_g, size_mm, photoFile }) => {
      const { addToast } = useMapStore.getState()
      if (!user || isGuest) return

      const { isPro } = useUserStore.getState()

      if (!isPro && finds.length >= 10) {
        addToast({
          message: 'Find limit reached — upgrade to Pro for unlimited',
          type: 'warning',
        })
        return
      }

      const photo_url = await uploadFindPhoto(photoFile, user.id)

      const row = {
        user_id: user.id,
        module_id: 'prospecting',
        title,
        description: description || null,
        photo_url,
        lat: lat ?? null,
        lng: lng ?? null,
        weight_g: weight_g ?? null,
        size_mm: size_mm ?? null,
      }

      // Optimistic prepend
      const optimisticId = crypto.randomUUID()
      const optimistic = { ...row, id: optimisticId, found_at: new Date().toISOString(), created_at: new Date().toISOString() }
      setFinds((prev) => [optimistic, ...prev])

      const { data, error, offline } = await queueWrite('finds_log', 'insert', row)

      if (offline) {
        return { data, error: null, offline: true }
      }

      if (error) {
        console.error('[useFindsLog] insert error:', error.message)
        setFinds((prev) => prev.filter((f) => f.id !== optimisticId))
        addToast({ type: 'error', message: 'Failed to save find.' })
        return { data: null, error, offline: false }
      }

      setFinds((prev) => prev.map((f) => (f.id === optimisticId ? data : f)))
      return { data, error: null, offline: false }
    },
    [user, isGuest, finds.length, queueWrite],
  )

  // ── DELETE ────────────────────────────────────────────────────────
  const deleteFind = useCallback(
    async (id) => {
      const { addToast } = useMapStore.getState()
      setFinds((prev) => prev.filter((f) => f.id !== id))
      const { error } = await supabase.from('finds_log').delete().eq('id', id)
      if (error) {
        console.error('[useFindsLog] delete error:', error.message)
        addToast({ type: 'error', message: 'Failed to delete find.' })
      }
    },
    [],
  )

  return { finds, loading, addFind, deleteFind }
}
