// useWaypoints.js — Waypoint CRUD for the current user.
// Fetches persisted waypoints from Supabase on mount (authenticated users).
// Guest users get in-memory state only — nothing is persisted.
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import useUserStore from '../store/userStore'

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
        if (error) console.error('useWaypoints fetch error:', error.message)
        setSavedWaypoints(data ?? [])
        setLoading(false)
      })
  }, [user?.id, isGuest]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── ADD ───────────────────────────────────────────────────────────
  const addWaypoint = useCallback(
    async (waypointObj) => {
      if (!user || isGuest) {
        // Guest: keep in local state only
        const localWp = { ...waypointObj, id: crypto.randomUUID() }
        setSavedWaypoints((prev) => [localWp, ...prev])
        return localWp
      }
      const { data, error } = await supabase
        .from('waypoints')
        .insert([{ ...waypointObj, user_id: user.id }])
        .select()
        .single()
      if (error) {
        console.error('addWaypoint error:', error.message)
        return null
      }
      setSavedWaypoints((prev) => [data, ...prev])
      return data
    },
    [user, isGuest],
  )

  // ── DELETE ────────────────────────────────────────────────────────
  const deleteWaypoint = useCallback(
    async (id) => {
      if (!user || isGuest) {
        setSavedWaypoints((prev) => prev.filter((w) => w.id !== id))
        return
      }
      const { error } = await supabase
        .from('waypoints')
        .delete()
        .eq('id', id)
      if (error) {
        console.error('deleteWaypoint error:', error.message)
        return
      }
      setSavedWaypoints((prev) => prev.filter((w) => w.id !== id))
    },
    [user, isGuest],
  )

  return { savedWaypoints, addWaypoint, deleteWaypoint, loading }
}
