// useNotifications — permission flow, pre-prompts, and notification dispatch.
// Uses the browser Notification API (works on web + Capacitor WebView).
// Native push requires adding @capacitor/push-notifications separately.
import { useState, useCallback } from 'react'
import useUserStore from '../store/userStore'

const LS_ASKED      = 'ee_notif_asked'       // 'true' if ever asked
const LS_SNOOZE     = 'ee_notif_snooze'      // timestamp of "Not Now" snooze
const LS_FIRST_WP   = 'ee_notif_first_wp'    // 'true' after first waypoint notification triggered
const LS_FIRST_CH   = 'ee_notif_first_ch'    // 'true' after first chapter notification triggered
const LS_LEARN_LAST = 'ee_learn_last_open'   // ISO timestamp of last learn hub visit
const LS_APP_LAST   = 'ee_app_last_open'     // ISO timestamp of last app open
const LS_COURSE_CNT = 'ee_last_course_count' // number of courses seen last time
const LS_LEGAL_SENT = 'ee_legal_notif_sent'  // 'true' once legal reminder sent
const SNOOZE_MS     = 7 * 24 * 60 * 60 * 1000 // 7 days

// ── Permission helpers ─────────────────────────────────────────────

export function getNotifPermission() {
  if (!('Notification' in window)) return 'unsupported'
  return Notification.permission // 'default' | 'granted' | 'denied'
}

export function hasNotifPermission() {
  return getNotifPermission() === 'granted'
}

function shouldShowPrePrompt() {
  if (hasNotifPermission()) return false           // already granted
  if (getNotifPermission() === 'denied') return false // already denied
  if (localStorage.getItem(LS_ASKED) === 'true') return false // already asked

  const snooze = localStorage.getItem(LS_SNOOZE)
  if (snooze && Date.now() - Number(snooze) < SNOOZE_MS) return false

  return true
}

// ── Dispatch a local notification ─────────────────────────────────

export function dispatchNotification({ title, body, tag, onClick }) {
  if (!hasNotifPermission()) return
  try {
    const n = new Notification(title, { body, tag, icon: '/icon-192.png' })
    if (onClick) n.onclick = onClick
  } catch (e) {
    console.warn('[useNotifications] dispatch failed:', e)
  }
}

// ── Hook ──────────────────────────────────────────────────────────

export function useNotifications() {
  const [prePromptVisible, setPrePromptVisible] = useState(false)

  // Show pre-prompt if conditions are met (call after trigger events)
  const maybeShowPrePrompt = useCallback(() => {
    if (shouldShowPrePrompt()) {
      setPrePromptVisible(true)
    }
  }, [])

  // User tapped "Enable" in pre-prompt
  async function handleEnable() {
    setPrePromptVisible(false)
    localStorage.setItem(LS_ASKED, 'true')
    if ('Notification' in window) {
      await Notification.requestPermission()
    }
  }

  // User tapped "Not Now"
  function handleSnooze() {
    setPrePromptVisible(false)
    localStorage.setItem(LS_SNOOZE, String(Date.now()))
  }

  // Called after saving first waypoint
  function notifyAfterWaypointSave(waypointCount) {
    try {
      if (waypointCount === 1 && !localStorage.getItem(LS_FIRST_WP)) {
        localStorage.setItem(LS_FIRST_WP, 'true')
        maybeShowPrePrompt()
      }
    } catch (_) {}
  }

  // Called after completing a chapter
  function notifyAfterChapterComplete(isFirstChapter) {
    try {
      if (isFirstChapter && !localStorage.getItem(LS_FIRST_CH)) {
        localStorage.setItem(LS_FIRST_CH, 'true')
        maybeShowPrePrompt()
      }
    } catch (_) {}
  }

  // Run on app open — checks multiple trigger types
  function runOnOpenChecks({ user, isPro, tracks = [], courses = [], waypoints = [] }) {
    try {
      if (!hasNotifPermission()) return

      const now = Date.now()

      // Re-engagement: user absent for 7+ days
      const lastOpen = localStorage.getItem(LS_APP_LAST)
      if (lastOpen && now - Number(lastOpen) > 7 * 24 * 3600 * 1000) {
        const firstName = user?.user_metadata?.display_name?.split(' ')[0] || 'Explorer'
        dispatchNotification({
          title: 'Explore Éire',
          body: `It's been a while, ${firstName}. New gold data may have been added near your saved spots.`,
          tag: 'reengagement',
        })
      }
      localStorage.setItem(LS_APP_LAST, String(now))

      // Course nudge: in-progress but no learn visit for 5 days
      const lastLearn = localStorage.getItem(LS_LEARN_LAST)
      if (lastLearn && courses.some(c => c.inProgress)) {
        const daysSince = (now - Number(lastLearn)) / (24 * 3600 * 1000)
        if (daysSince >= 5) {
          const inProgress = courses.find(c => c.inProgress)
          dispatchNotification({
            title: 'Explore Éire',
            body: `Pick up where you left off — ${inProgress?.nextChapterTitle || 'your course'} is waiting.`,
            tag: 'course-nudge',
          })
        }
      }

      // Monthly summary: first open of a new calendar month
      const thisMonth = new Date().toISOString().slice(0, 7) // "YYYY-MM"
      const lastSummaryMonth = localStorage.getItem('ee_last_summary_month')
      if (lastSummaryMonth !== thisMonth && tracks.length > 0) {
        const prevMonthTracks = tracks.filter(t => {
          const d = new Date(t.created_at)
          const m = d.toISOString().slice(0, 7)
          return m === lastSummaryMonth
        })
        if (prevMonthTracks.length > 0) {
          const totalKm = (prevMonthTracks.reduce((s, t) => s + (t.distance_m || 0), 0) / 1000).toFixed(1)
          const monthName = new Date(lastSummaryMonth + '-01').toLocaleString('en-IE', { month: 'long' })
          dispatchNotification({
            title: 'Monthly Summary',
            body: `You tracked ${totalKm}km prospecting in ${monthName}. Keep it up!`,
            tag: 'monthly-summary',
          })
        }
      }
      localStorage.setItem('ee_last_summary_month', thisMonth)

      // New course available
      const lastCount = Number(localStorage.getItem(LS_COURSE_CNT) || 0)
      if (courses.length > lastCount && lastCount > 0) {
        dispatchNotification({
          title: 'New Course Available',
          body: 'A new course has been added to the Learning Hub — check it out.',
          tag: 'new-course',
        })
      }
      localStorage.setItem(LS_COURSE_CNT, String(courses.length))

      // Waypoint revisit: waypoint saved ~7 days ago, no nearby session
      const sevenDaysAgo = now - 7 * 24 * 3600 * 1000
      const eligibleWp = waypoints.find(wp => {
        const created = new Date(wp.created_at).getTime()
        return Math.abs(created - sevenDaysAgo) < 24 * 3600 * 1000
      })
      if (eligibleWp) {
        const nearbySession = tracks.some(t => {
          if (!t.trail || !eligibleWp.lat) return false
          const pts = Array.isArray(t.trail) ? t.trail : []
          return pts.some(p => {
            const dlat = p[1] - eligibleWp.lat
            const dlng = p[0] - eligibleWp.lng
            return Math.sqrt(dlat * dlat + dlng * dlng) < 0.005 // ~500m
          })
        })
        if (!nearbySession) {
          dispatchNotification({
            title: 'Waypoint Reminder',
            body: `You saved "${eligibleWp.name || 'a waypoint'}" 7 days ago — have you visited it yet?`,
            tag: `wp-revisit-${eligibleWp.id}`,
          })
        }
      }

      // Legal reminder: after 5 sessions, fire once
      if (tracks.length >= 5 && !localStorage.getItem(LS_LEGAL_SENT)) {
        localStorage.setItem(LS_LEGAL_SENT, 'true')
        dispatchNotification({
          title: 'Land Access Reminder',
          body: 'Reminder: always verify land access permissions before prospecting. Stay legal, stay safe.',
          tag: 'legal-reminder',
        })
      }
    } catch (e) {
      console.warn('[useNotifications] onOpen checks failed:', e)
    }
  }

  // Nearby mineral alert (call from Map when re-centered)
  function notifyNearbyMineral(localityName, distanceKm) {
    try {
      const lastKey = `ee_notif_locality_${localityName}`
      const lastFired = Number(localStorage.getItem(lastKey) || 0)
      if (Date.now() - lastFired < 24 * 3600 * 1000) return
      localStorage.setItem(lastKey, String(Date.now()))
      dispatchNotification({
        title: 'Gold Locality Detected',
        body: `Gold locality "${localityName}" detected ${Math.round(distanceKm)}km away — tap to view on map.`,
        tag: `nearby-${localityName}`,
      })
    } catch (_) {}
  }

  return {
    prePromptVisible,
    handleEnable,
    handleSnooze,
    maybeShowPrePrompt,
    notifyAfterWaypointSave,
    notifyAfterChapterComplete,
    runOnOpenChecks,
    notifyNearbyMineral,
    permission: getNotifPermission(),
  }
}

export function recordLearnHubVisit() {
  localStorage.setItem(LS_LEARN_LAST, String(Date.now()))
}

// Standalone trigger — safe to call from hook callbacks / async functions.
// Uses Zustand getState() which is valid outside React render cycle.
export function triggerNotifPrePromptIfNeeded() {
  try {
    if (shouldShowPrePrompt()) {
      useUserStore.getState().setShowNotifPrePrompt(true)
    }
  } catch (_) {}
}
