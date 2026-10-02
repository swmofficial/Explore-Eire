import { create } from 'zustand'

const useUserStore = create((set) => ({
  // ── Auth state ────────────────────────────────────────────────
  user: null,
  setUser: (user) => set({ user }),

  isGuest: true,
  setIsGuest: (v) => set({ isGuest: v }),

  // ── Subscription ──────────────────────────────────────────────
  // true = Explorer subscriber, false = free tier
  isPro: false,
  setIsPro: (v) => set({ isPro: v }),

  // ── Upgrade sheet ─────────────────────────────────────────────
  showUpgradeSheet: false,
  setShowUpgradeSheet: (v) => set({ showUpgradeSheet: v }),
}))

export default useUserStore
