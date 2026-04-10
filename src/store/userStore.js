// userStore.js — Zustand store: auth, subscription, legal
import { create } from 'zustand'

const useUserStore = create((set) => ({
  // Auth state
  user: null,
  setUser: (user) => set({ user }),

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
}))

export default useUserStore
