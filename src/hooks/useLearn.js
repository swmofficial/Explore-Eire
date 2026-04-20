// useLearn.js — hardcoded data source.
// TODO: swap COURSES/CHAPTERS/PAGES for live Supabase queries once schema is seeded.
import { useState, useEffect } from 'react'
import useUserStore from '../store/userStore'

// ─── Hardcoded course catalogue ───────────────────────────────────
const COURSES = [
  {
    id: 'gold-panning-fundamentals',
    title: 'Gold Panning Fundamentals',
    cover_emoji: '⛏️',
    chapter_count: 6,
    module: 'Prospecting',
    is_pro: false,
    description: 'Everything you need to start finding gold in Irish rivers and streams.',
  },
  {
    id: 'reading-geological-maps',
    title: 'Reading Geological Maps',
    cover_emoji: '🗺️',
    chapter_count: 5,
    module: 'Prospecting',
    is_pro: false,
    description: 'Learn to read GSI maps and identify gold-bearing formations across Ireland.',
  },
  {
    id: 'legal-permissions-ireland',
    title: 'Legal & Permissions in Ireland',
    cover_emoji: '⭐',
    chapter_count: 4,
    module: 'Prospecting',
    is_pro: true,
    description: 'The legal framework for prospecting in Ireland — land access, licensing, and reporting.',
  },
]

// ─── Hardcoded chapters per course ───────────────────────────────
const CHAPTERS = {
  'gold-panning-fundamentals': [
    { id: 'gp-1', title: 'Your First Prospecting Trip', position: 1, course_id: 'gold-panning-fundamentals', content: [
      { type: 'text', body: 'Planning your first prospecting trip in Ireland requires some preparation. The most important first step is identifying legal access land — most of Ireland is privately owned, so you need permission or must use designated public areas.' },
      { type: 'text', body: 'Essential kit for a beginner: a gold pan (10–12 inch), a classifier screen, a snuffer bottle for collecting fine gold, rubber boots, and a small trowel. You do not need expensive equipment to start.' },
      { type: 'text', body: 'Safety basics: always tell someone where you are going, carry a fully charged phone, be aware of river levels before wading, and never prospect alone in remote areas.' },
    ], quiz: [] },
    { id: 'gp-2', title: 'How Gold Forms in Irish Geology', position: 2, course_id: 'gold-panning-fundamentals', content: [
      { type: 'text', body: "Ireland's gold deposits are primarily associated with the Caledonian fold belts — ancient mountain ranges formed 400–500 million years ago. The counties of Wicklow, Mayo, and Donegal are the most historically productive." },
      { type: 'text', body: 'Gold in Ireland occurs in two forms: lode gold (found in quartz veins in bedrock) and placer gold (eroded from lode sources and deposited in river gravels downstream).' },
      { type: 'text', body: 'The Goldmines River in Wicklow is named for good reason — gold was panned there commercially in the 18th century. Understanding the geology helps you predict where gold will concentrate.' },
    ], quiz: [] },
    { id: 'gp-3', title: 'Reading a Stream — Where Gold Settles', position: 3, course_id: 'gold-panning-fundamentals', content: [
      { type: 'text', body: 'Gold is 19 times heavier than water. This means it settles wherever water slows down — on the inside of river bends, behind large boulders, at the tail end of gravel bars, and in bedrock crevices.' },
      { type: 'text', body: 'The inside bend rule: as a river curves, water on the outside moves faster and erodes. Water on the inside moves slower and deposits heavy material. Always check inside bends first.' },
      { type: 'text', body: 'Bedrock is your best friend. When you can see or feel bedrock beneath the gravel, work it. Gold sinks through gravel over time and collects on the bedrock surface, especially in cracks and depressions.' },
    ], quiz: [] },
    { id: 'gp-4', title: "Fool's Gold and Common Misconceptions", position: 4, course_id: 'gold-panning-fundamentals', content: [
      { type: 'text', body: "Pyrite (iron sulphide) is the classic fool's gold — brassy yellow, cubic crystals, and it shatters when you hit it. Real gold is malleable: it flattens when struck rather than breaking." },
      { type: 'text', body: 'Chalcopyrite and mica (especially muscovite) also fool beginners. The key test: real gold retains its colour when wet and in shade. Pyrite and mica lose their sparkle in shadow.' },
      { type: 'text', body: 'The scratch test: gold is soft (2.5 on Mohs scale) and will leave a yellow streak on unglazed ceramic. Pyrite leaves a greenish-black streak.' },
    ], quiz: [] },
    { id: 'gp-5', title: 'The Legal Framework', position: 5, course_id: 'gold-panning-fundamentals', content: [
      { type: 'text', body: 'The Minerals Development Act 2017 governs prospecting in Ireland. All minerals in the ground are owned by the State, regardless of who owns the surface land.' },
      { type: 'text', body: 'The two-day rule: recreational prospecting (panning with hand tools) is generally tolerated but you must not prospect on the same ground for more than two days without a prospecting licence from the Department of the Environment.' },
      { type: 'text', body: 'Reporting significant finds: if you discover a significant mineral deposit or archaeological artefact, you are legally required to report it. Failure to do so can result in prosecution.' },
    ], quiz: [] },
    { id: 'gp-6', title: 'Planning Your Route with Geological Maps', position: 6, course_id: 'gold-panning-fundamentals', content: [
      { type: 'text', body: 'The GSI (Geological Survey of Ireland) publishes free geological maps at gsi.ie. Look for areas marked with quartz veins, shear zones, or historical mine workings — these are prospecting hotspots.' },
      { type: 'text', body: 'In the Explore Éire app, use the Layers panel on the map to toggle the GSI geological overlay. Gold sample locations from the national database are shown as coloured dots — red indicates higher concentrations.' },
      { type: 'text', body: 'Cross-reference the map layers with satellite imagery to find accessible streams that pass through gold-bearing geological formations. Plan your access route before leaving home.' },
    ], quiz: [] },
  ],
  'reading-geological-maps': [
    { id: 'rgm-1', title: 'Introduction to GSI Maps', position: 1, course_id: 'reading-geological-maps', content: [
      { type: 'text', body: 'The Geological Survey of Ireland has mapped the entire country at 1:100,000 scale. These maps show rock types, fault lines, and mineral deposits — essential reading for any prospector.' },
      { type: 'text', body: 'Colours on geological maps represent different rock types. In Ireland, pink/red typically indicates granite, green shows volcanic rocks, and grey represents sedimentary sequences.' },
    ], quiz: [] },
    { id: 'rgm-2', title: 'Rock Types and Symbols', position: 2, course_id: 'reading-geological-maps', content: [
      { type: 'text', body: 'Igneous rocks (granite, basalt) form from cooled magma. They are often associated with mineralisation where hot fluids carrying dissolved metals cooled and deposited ore minerals in veins.' },
      { type: 'text', body: 'Sedimentary rocks (limestone, sandstone, shale) dominate much of central Ireland. While less commonly gold-bearing, they can contain significant base metal deposits.' },
    ], quiz: [] },
    { id: 'rgm-3', title: 'Fault Lines and Mineralisation', position: 3, course_id: 'reading-geological-maps', content: [
      { type: 'text', body: "Fault lines are fractures in the Earth's crust. They are critically important to prospectors because they are pathways for hydrothermal (hot water) fluids that deposit minerals." },
      { type: 'text', body: 'Where fault lines intersect, or where they cut through certain rock types, mineralisation is most likely. These intersection points are priority targets.' },
    ], quiz: [] },
    { id: 'rgm-4', title: 'Using the Explore Éire Layer Panel', position: 4, course_id: 'reading-geological-maps', content: [
      { type: 'text', body: 'Open the layer panel using the stack icon on the map. Toggle the GSI Bedrock layer to see rock types beneath the landscape.' },
      { type: 'text', body: 'The gold sample density layer shows historical sampling data from the GSI. Clusters of high-value samples indicate areas worth investigating on the ground.' },
    ], quiz: [] },
    { id: 'rgm-5', title: 'Planning a Prospecting Route', position: 5, course_id: 'reading-geological-maps', content: [
      { type: 'text', body: 'Once you have identified a target area on the geological map, switch to satellite view to assess terrain and access.' },
      { type: 'text', body: 'Identify the stream network within your target area. Plan to work upstream from known gold sample points — you are looking for the source.' },
    ], quiz: [] },
  ],
  'legal-permissions-ireland': [
    { id: 'lp-1', title: 'Land Access Law', position: 1, course_id: 'legal-permissions-ireland', content: [
      { type: 'text', body: 'Ireland has no general right to roam. Unlike Scotland, you cannot cross private land without permission.' },
      { type: 'text', body: 'Always seek landowner permission before prospecting. Most farmers are receptive if approached respectfully and you explain what you are doing.' },
    ], quiz: [] },
    { id: 'lp-2', title: 'The Two-Day Rule Explained', position: 2, course_id: 'legal-permissions-ireland', content: [
      { type: 'text', body: 'The two-day rule is an informal tolerance, not a legal right. It means the State generally does not prosecute recreational prospectors who pan by hand on a site for no more than two consecutive days.' },
      { type: 'text', body: 'It does NOT apply to mechanical excavation, diverting watercourses, or repeated visits to the same site across weeks.' },
    ], quiz: [] },
    { id: 'lp-3', title: 'Reporting Significant Finds', position: 3, course_id: 'legal-permissions-ireland', content: [
      { type: 'text', body: 'Under the National Monuments Act, archaeological objects must be reported to the National Museum of Ireland within 96 hours of discovery.' },
      { type: 'text', body: 'Gold objects of any kind found in the ground are considered potential archaeological artefacts. Do not clean, alter, or sell them before reporting.' },
    ], quiz: [] },
    { id: 'lp-4', title: 'Insurance and Liability', position: 4, course_id: 'legal-permissions-ireland', content: [
      { type: 'text', body: 'You are personally liable for any damage caused while prospecting — to land, fences, watercourses, or third parties.' },
      { type: 'text', body: 'The Irish Geological Association and some prospecting clubs offer public liability insurance to members. Consider joining before undertaking serious fieldwork.' },
    ], quiz: [] },
  ],
}

// ─── Hook implementations ─────────────────────────────────────────

export function useCourses() {
  return { courses: COURSES, loading: false }
}

export function useChapters(courseId) {
  const chapters = CHAPTERS[courseId] ?? []
  return { chapters, loading: false }
}

export function useProgress() {
  const { user } = useUserStore()
  const [completedIds, setCompletedIds] = useState(() => {
    try {
      const stored = localStorage.getItem('ee_progress')
      return stored ? new Set(JSON.parse(stored)) : new Set()
    } catch { return new Set() }
  })
  const [certificates, setCertificates] = useState(() => {
    try {
      const stored = localStorage.getItem('ee_certificates')
      return stored ? JSON.parse(stored) : []
    } catch { return [] }
  })

  async function markChapterComplete(chapterId, courseId) {
    const next = new Set([...completedIds, chapterId])
    setCompletedIds(next)
    localStorage.setItem('ee_progress', JSON.stringify([...next]))

    // Auto-issue certificate if all chapters in course are done
    const courseChapters = CHAPTERS[courseId] ?? []
    const allDone = courseChapters.every(ch => next.has(ch.id))
    if (allDone && !certificates.includes(courseId)) {
      const nextCerts = [...certificates, courseId]
      setCertificates(nextCerts)
      localStorage.setItem('ee_certificates', JSON.stringify(nextCerts))
    }
  }

  async function issueCertificate(courseId) {
    if (certificates.includes(courseId)) return
    const nextCerts = [...certificates, courseId]
    setCertificates(nextCerts)
    localStorage.setItem('ee_certificates', JSON.stringify(nextCerts))
  }

  return { completedIds, certificates, markChapterComplete, issueCertificate }
}
