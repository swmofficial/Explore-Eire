// useWaypoints.js — Waypoint CRUD for the current user.
// Loads all waypoints on mount (when user changes), exposes
// addWaypoint and deleteWaypoint that update both Supabase and local state.
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import useUserStore from '../store/userStore'

export function useWaypoints() {
  const { user } = useUserStore()
  const [waypoints, setWaypoints] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!user) {
      setWaypoints([])
      return
    }
    setLoading(true)
    supabase
      .from('waypoints')
      .select('id, name, description, lat, lng, icon, photos')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error('useWaypoints fetch error:', error.message)
        setWaypoints(data ?? [])
        setLoading(false)
      })
  }, [user])

  // addWaypoint({ lat, lng, title, note, photo_url })
  const addWaypoint = useCallback(
    async ({ lat, lng, title, note, photo_url }) => {
      if (!user) return null
      const row = {
        user_id: user.id,
        name: title ?? 'Waypoint',
        description: note ?? null,
        lat,
        lng,
        photos: photo_url ? [photo_url] : [],
      }
      const { data, error } = await supabase
        .from('waypoints')
        .insert(row)
        .select('id, name, description, lat, lng, icon, photos')
        .single()
      if (error) {
        console.error('addWaypoint error:', error.message)
        return null
      }
      setWaypoints((prev) => [data, ...prev])
      return data
    },
    [user],
  )

  const deleteWaypoint = useCallback(async (id) => {
    const { error } = await supabase
      .from('waypoints')
      .delete()
      .eq('id', id)
    if (error) {
      console.error('deleteWaypoint error:', error.message)
      return
    }
    setWaypoints((prev) => prev.filter((w) => w.id !== id))
  }, [])

  return { waypoints, loading, addWaypoint, deleteWaypoint }
}
