// userStore.js — Zustand store: auth, subscription, legal
import { create } from 'zustand'

const useUserStore = create((set) => ({
  // Auth state
  user: null,
  setUser: (user) => set({ user }),

  // Guest mode — browsing without an account (t6/t7 only, no waypoints)
  isGuest: false,
  setIsGuest: (v) => set({ isGuest: v }),

  // Subscription state
  isPro: false,
  setIsPro: (isPro) => set({ isPro }),

  subscriptionStatus: 'free', // 'free' | 'active' | 'cancelled' | 'past_due'
  setSubscriptionStatus: (status) => set({ subscriptionStatus: status }),

  // Legal disclaimer
  legalAccepted: false,
  setLegalAccepted: (accepted) => set({ legalAccepted: accepted }),

  // UI state
  showLegalDisclaimer: false,
  setShowLegalDisclaimer: (show) => set({ showLegalDisclaimer: show }),

  showAuthModal: false,
  setShowAuthModal: (show) => set({ showAuthModal: show }),

  showUpgradeSheet: false,
  setShowUpgradeSheet: (show) => set({ showUpgradeSheet: show }),

  showOnboarding: false,
  setShowOnboarding: (show) => set({ showOnboarding: show }),

  // Colour theme — 'dark' | 'light' | 'eire'
  theme: 'dark',
  setTheme: (t) => set({ theme: t }),
}))

export default useUserStore
