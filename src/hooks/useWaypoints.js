// useWaypoints.js — Waypoint CRUD + offline queue
// TODO: load waypoints for current user, create/update/delete, offline queue sync
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import useUserStore from '../store/userStore'

export function useWaypoints() {
  const { user } = useUserStore()
  const [waypoints, setWaypoints] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // TODO: fetch waypoints for user, subscribe to realtime changes
  }, [user])

  async function addWaypoint(data) {
    // TODO: insert waypoint, handle offline queue
  }

  async function deleteWaypoint(id) {
    // TODO: delete waypoint
  }

  return { waypoints, loading, addWaypoint, deleteWaypoint }
}
