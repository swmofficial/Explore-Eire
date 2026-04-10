// useTracks.js — GPS recording + save tracks
// TODO: start/pause/stop GPS recording, build GeoJSON LineString, save to tracks table
import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import useUserStore from '../store/userStore'

export function useTracks() {
  const { user } = useUserStore()
  const [isTracking, setIsTracking] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [currentTrack, setCurrentTrack] = useState(null)
  const watchIdRef = useRef(null)

  function startTracking() {
    // TODO: navigator.geolocation.watchPosition, build coordinate array
  }

  function pauseTracking() {
    // TODO: pause watch
  }

  function stopTracking() {
    // TODO: stop watch, return track data for naming + saving
  }

  async function saveTrack(name, module) {
    // TODO: save GeoJSON LineString to tracks table
  }

  return { isTracking, isPaused, currentTrack, startTracking, pauseTracking, stopTracking, saveTrack }
}
