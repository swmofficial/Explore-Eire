// useUserTier — single source of truth for tier capability checks.
// Returns tier ('guest' | 'free' | 'pro') and a canDo() helper.
import useUserStore from '../store/userStore'

const LIMITS = {
  guest: { waypoints: 0, finds: 0, sessions: 0 },
  free:  { waypoints: 5, finds: 10, sessions: 3 },
  pro:   { waypoints: Infinity, finds: Infinity, sessions: Infinity },
}

export function useUserTier() {
  const { user, isGuest, isPro } = useUserStore()

  const tier = (isGuest || !user) ? 'guest' : isPro ? 'pro' : 'free'
  const limits = LIMITS[tier]

  function canDo(action, currentCount = 0) {
    const limit = limits[action]
    if (limit === undefined) return tier !== 'guest'
    if (limit === Infinity) return true
    return currentCount < limit
  }

  function getLimit(action) {
    return limits[action] ?? Infinity
  }

  return {
    tier,
    limits,
    canDo,
    getLimit,
    isGuest: tier === 'guest',
    isFree: tier === 'free',
    isPro: tier === 'pro',
  }
}
