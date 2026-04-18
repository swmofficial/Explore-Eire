// moduleConfig.js — Module definitions, accent colours, icons

export const MODULES = [
  {
    id: 'prospecting',
    label: 'Prospecting',
    shortLabel: 'Gold',
    accent: '#E8C96A',
    icon: '⛏',
    description: 'Gold & Minerals',
    available: true,
  },
  {
    id: 'field_sports',
    label: 'Field Sports',
    shortLabel: 'Hunt & Fish',
    accent: '#4A9E6B',
    icon: '🎣',
    description: 'Hunt & Fish',
    available: false, // data sourcing required
  },
  {
    id: 'hiking',
    label: 'Hiking',
    shortLabel: 'Trails',
    accent: '#5B8FD4',
    icon: '🥾',
    description: 'Looped Walks',
    available: false, // data sourcing required
  },
  {
    id: 'discover',
    label: 'Discover',
    shortLabel: 'Explore',
    accent: '#C47AC0',
    icon: '🧭',
    description: 'Restaurants, Bars & Attractions',
    available: false, // Google Places integration — build last
  },
  {
    id: 'coastal',
    label: 'Coastal',
    shortLabel: 'Beach',
    accent: '#3AACB8',
    icon: '🌊',
    description: 'Foreshore Access',
    available: false, // data sourcing required
  },
]

export function getModule(id) {
  return MODULES.find((m) => m.id === id) || null
}
