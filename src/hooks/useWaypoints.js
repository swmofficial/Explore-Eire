// useWaypoints.js — Waypoint CRUD for the current user.
// Fetches persisted waypoints from Supabase on mount (authenticated users).
// Guest users get in-memory state only — nothing is persisted.
// Photo uploads go to Supabase Storage bucket 'waypoint-photos'.
// GPS coords come from navigator.geolocation ONLY — never EXIF.
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import useUserStore from '../store/userStore'
import useMapStore from '../store/mapStore'

// ── Photo upload helper ────────────────────────────────────────────
async function uploadWaypointPhoto(file, userId) {
  if (!file) return null
  const ext      = file.name?.split('.').pop() ?? 'jpg'
  const filename = `${userId}/${Date.now()}.${ext}`
  const { error } = await supabase.storage
    .from('waypoint-photos')
    .upload(filename, file, { contentType: file.type || 'image/jpeg', upsert: false })
  if (error) {
    console.warn('[useWaypoints] photo upload failed:', error.message)
    return null
  }
  const { data: urlData } = supabase.storage
    .from('waypoint-photos')
    .getPublicUrl(filename)
  return urlData?.publicUrl ?? null
}

export function useWaypoints() {
  const { user, isGuest } = useUserStore()
  const [savedWaypoints, setSavedWaypoints] = useState([])
  const [loading, setLoading] = useState(false)

  // ── READ — fetch on mount / user change ───────────────────────────
  useEffect(() => {
    if (!user || isGuest) {
      setSavedWaypoints([])
      return
    }
    setLoading(true)
    supabase
      .from('waypoints')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error('[useWaypoints] fetch error:', error.message)
        setSavedWaypoints(data ?? [])
        setLoading(false)
      })
  }, [user?.id, isGuest]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── ADD ───────────────────────────────────────────────────────────
  const addWaypoint = useCallback(
    async (waypointObj) => {
      const { addToast } = useMapStore.getState()

      if (!user || isGuest) {
        // Guest: keep in local state only
        const localWp = { ...waypointObj, id: crypto.randomUUID(), photos: [] }
        setSavedWaypoints((prev) => [localWp, ...prev])
        return localWp
      }

      // Upload photo if provided (File object in waypointObj.photo)
      const { photo, ...fields } = waypointObj
      let photos = []
      if (photo) {
        const url = await uploadWaypointPhoto(photo, user.id)
        if (url) photos = [url]
      }

      const { data, error } = await supabase
        .from('waypoints')
        .insert([{ ...fields, user_id: user.id, photos }])
        .select()
        .single()
      if (error) {
        console.error('[useWaypoints] add error:', error.message)
        addToast({ message: 'Could not save waypoint', type: 'error' })
        return null
      }
      setSavedWaypoints((prev) => [data, ...prev])
      addToast({ message: 'Waypoint saved', type: 'success' })
      return data
    },
    [user, isGuest],
  )

  // ── DELETE ────────────────────────────────────────────────────────
  const deleteWaypoint = useCallback(
    async (id) => {
      const { addToast } = useMapStore.getState()

      if (!user || isGuest) {
        setSavedWaypoints((prev) => prev.filter((w) => w.id !== id))
        return
      }
      const { error } = await supabase
        .from('waypoints')
        .delete()
        .eq('id', id)
      if (error) {
        console.error('[useWaypoints] delete error:', error.message)
        addToast({ message: 'Could not delete waypoint', type: 'error' })
        return
      }
      setSavedWaypoints((prev) => prev.filter((w) => w.id !== id))
      addToast({ message: 'Waypoint deleted', type: 'success' })
    },
    [user, isGuest],
  )

  return { savedWaypoints, addWaypoint, deleteWaypoint, loading }
}
