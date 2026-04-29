// userStore.js — Zustand store: auth, subscription, legal
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useUserStore = create(
  persist(
    (set) => ({
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

      // Auth modal config — set before calling setShowAuthModal(true)
      authModalDefaultTab: 'signin', // 'signin' | 'signup'
      setAuthModalDefaultTab: (tab) => set({ authModalDefaultTab: tab }),

      authModalOnSuccess: null, // optional callback fired after successful auth
      setAuthModalOnSuccess: (fn) => set({ authModalOnSuccess: fn }),

      showUpgradeSheet: false,
      setShowUpgradeSheet: (show) => set({ showUpgradeSheet: show }),

      showOnboarding: false,
      setShowOnboarding: (show) => set({ showOnboarding: show }),

      // Notification pre-prompt (shown after trigger events)
      showNotifPrePrompt: false,
      setShowNotifPrePrompt: (show) => set({ showNotifPrePrompt: show }),

      // Colour theme — 'dark' | 'light'
      // Persisted via ee_theme (manual pattern — Zustand persist not reliable
      // for this field in the deployed environment; see task-008 notes).
      theme: (() => {
        try { return localStorage.getItem('ee_theme') || 'dark' } catch { return 'dark' }
      })(),
      setTheme: (t) => {
        try { localStorage.setItem('ee_theme', t) } catch {}
        set({ theme: t })
      },
    }),
    {
      name: 'ee-user-prefs',
      version: 1,
      // Strip stale theme field written by pre-task-008 code. Without this migration,
      // Zustand's hydration merges { theme: 'dark' } from the old stored state over
      // the IIFE-set value, defeating the manual ee_theme persistence pattern.
      migrate: (persistedState, version) => {
        if (version < 1) {
          const { theme: _theme, ...rest } = persistedState
          return rest
        }
        return persistedState
      },
      // Persist only preference/subscription fields — never UI open-states,
      // callbacks, or auth objects (user contains tokens).
      partialize: (state) => ({
        isPro: state.isPro,
        subscriptionStatus: state.subscriptionStatus,
      }),
    },
  ),
)

export default useUserStore
