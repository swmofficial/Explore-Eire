// Map.jsx — Full screen MapLibre GL map. Base layer for all map views.
// GPS dot via GeolocateControl (button hidden, dot visible on map).
import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import useMapStore from '../store/mapStore'

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY

const SATELLITE_STYLE = `https://api.maptiler.com/maps/satellite/style.json?key=${MAPTILER_KEY}`

export default function Map() {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const geolocateRef = useRef(null)
  const { setMapInstance } = useMapStore()

  useEffect(() => {
    if (mapRef.current) return

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: SATELLITE_STYLE,
      center: [-8.0, 53.5],
      zoom: 7,
      attributionControl: false, // add custom positioned below
    })

    // Custom attribution — bottom-right, unobtrusive
    map.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      'bottom-right',
    )

    // GPS dot — hidden button, dot renders on map automatically
    const geolocate = new maplibregl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
      showUserHeading: true,
    })
    map.addControl(geolocate, 'bottom-right')
    geolocateRef.current = geolocate

    map.on('load', () => {
      setMapInstance(map)

      // Request GPS — will prompt permission if not yet granted
      try {
        geolocate.trigger()
      } catch {
        // GPS unavailable or denied — dot simply won't appear
      }
    })

    mapRef.current = map

    return () => {
      setMapInstance(null)
      map.remove()
      mapRef.current = null
    }
  }, [setMapInstance])

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
      }}
    />
  )
}
