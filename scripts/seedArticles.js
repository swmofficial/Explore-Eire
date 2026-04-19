import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL (or VITE_SUPABASE_URL) and/or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

const articles = [
  {
    slug: 'first-prospecting-trip',
    module_id: 'prospecting',
    sort_order: 1,
    title: 'Your First Prospecting Trip',
    teaser: 'Everything you need before you head out — equipment, locations, and what to realistically expect on your first day.',
    body: `## What to Bring

You don't need much to start. The essential kit is a 12-inch gold pan, a classifier (mesh sieve — 1/8" is a good all-rounder), a trowel or small hand shovel, waterproof boots, and a handful of zip-lock sample bags. A snuffer bottle (a small squeeze bottle for sucking up fine gold) is cheap and worth having from day one.

Wear layers. Irish rivers are cold, the weather changes fast, and you'll be kneeling on wet gravel for hours. A pair of rubber gloves keeps your hands functional.

## Where to Start

Open the Explore Eire map and switch on the GSI Geochemistry heatmap layer. Look for high-grade gold anomaly zones — the orange and red clusters. Wicklow, Mayo, and Donegal have the densest concentrations.

Once you've identified a zone, find a stream that drains through it. Gold travels downhill with water over thousands of years and concentrates in stream gravels. The heatmap shows you where it came from; the stream shows you where it ended up.

## What to Do at the Stream

Work from the water's edge. Scoop gravel from the inside bend of a curve — this is where fast water slows and drops heavy material. Classify it first (shake through the sieve into your pan, discard the large rocks), then pan the fines.

The panning motion is a controlled circular swirl with intermittent forward tilts to wash light material over the lip. It takes 20–30 minutes to learn the feel. Gold stays at the bottom; everything else floats away. Work down to black sand — magnetite and hematite — and inspect carefully.

## What Success Looks Like

On your first day, colour in the pan is a win. A few specks of fine gold the size of a grain of sand is a real find. Don't expect nuggets. Build your skill reading the stream first — the gold follows from that.

**Before you go: check the two-day rule.** You may not prospect the same piece of land for more than two consecutive days without landowner permission. Plan accordingly.`,
  },
  {
    slug: 'gold-irish-geology',
    module_id: 'prospecting',
    sort_order: 2,
    title: 'How Gold Forms in Irish Geology',
    teaser: 'Ireland\'s gold is ancient — formed 400 million years ago during the Caledonian orogeny. Here\'s why certain counties hold far more than others.',
    body: `## Primary vs Secondary Gold

Gold in Ireland occurs in two forms. **Primary gold** sits in the original rock — in quartz veins and shear zones formed deep in the crust under intense heat and pressure. **Secondary (alluvial) gold** is what prospectors work with: primary gold that has been freed by millions of years of erosion, carried by water, and deposited in stream gravels and riverbanks.

You don't need to find the primary source to find gold. You need to find where the stream has concentrated the eroded material.

## The Caledonian Orogeny

Around 400 million years ago, the ancient continent of Laurentia collided with Avalonia, crumpling the crust and driving hot fluids rich in dissolved minerals — including gold — into fractures in the rock. This event, the Caledonian orogeny, created the structural framework that controls where Ireland's gold sits today.

The fold belts run northeast to southwest, which is why Wicklow, Donegal, and Mayo align as Ireland's primary gold counties. The geology doesn't change at county borders — it follows the ancient structures underneath.

## What the GSI Layers Tell You

Switch on the Bedrock layer in the app. Granite intrusions (shown in pink/red) are often associated with gold mineralisation — the heat that drove gold-bearing fluids came from these magma bodies cooling underground.

The Geochemistry heatmap shows stream sediment samples taken by the GSI across Ireland. The samples were taken from active stream beds; the gold, arsenic, and lead readings reflect what's eroding out of the catchment above.

## Pathfinder Elements

Gold is often invisible in the geochemistry data at low concentrations, but its companion elements are not. **Arsenic** and **lead** are reliable pathfinder indicators — they travel with gold in the same hydrothermal fluids and show up at higher concentrations in the data. If you see elevated arsenic in the heatmap without obvious gold values, look closely at the surrounding geology. The gold may be there at below-detection levels upstream.

**The practical takeaway:** cross-reference the gold heatmap with bedrock geology. High anomalies over granite contacts or northeast-trending shear zones are your best targets.`,
  },
  {
    slug: 'reading-a-stream',
    module_id: 'prospecting',
    sort_order: 3,
    title: 'Reading a Stream — Where Gold Settles',
    teaser: 'Gold is 19x heavier than water. Once you understand how a stream moves, you\'ll know exactly where to dig.',
    body: `## Specific Gravity: Why Gold Sinks

Gold has a specific gravity of 19.3 — meaning it is 19.3 times heavier than the same volume of water. Quartz, by contrast, is about 2.6. This enormous density difference is what makes panning work and what controls where gold deposits in a stream.

When fast water slows, it loses energy and drops the heaviest material first. Gold falls out of suspension almost immediately when flow velocity drops. Lighter material — sand, silt, organic matter — travels much further before settling. Understanding this is the whole game.

## Where to Dig

**Inside bends (point bars).** As a stream curves, the water on the inside of the bend travels slower than the outside. Heavy material — including gold — swings toward the inside and drops. The gravel bar on the inside of a bend is your first priority.

**Behind large boulders.** A boulder creates a hydraulic shadow — a low-velocity zone directly downstream of it. Gold settles in this dead water pocket. Dig immediately behind and slightly to the side of any large stationary rock in the stream bed.

**Bedrock cracks.** When stream gravels are removed down to bedrock, inspect every crack and crevice carefully. Gold sinks until it hits something it can't pass through. Cracks in bedrock are natural gold traps that accumulate material over centuries. A crevice tool (or a stiff brush) to clean these out is worth carrying.

**False bedrock.** Clay layers within the gravel profile act the same way as bedrock — gold sits on top of them. If you're digging a test hole and hit a dense clay layer, sample just above it.

## A Simple Stream Map

```
          ↓ flow direction ↓

    ╭─────────────────────╮
    │  FAST WATER         │  ← outside bend, erosion, no gold
    │      ╭──────────────╯
    │  ●●● │  ← INSIDE BEND (point bar) — HIGH probability
    ╰──────╯
         [boulder] ●  ← hydraulic shadow — HIGH probability
```

## Working Upstream from a Find

If you get colour in one location, don't pan the same spot all day. Move **upstream** in increments — 10 metres at a time — panning a sample at each stop. The gold concentration will increase as you approach the source. When it drops off, you've passed it. Work back to the peak concentration zone and dig deeper.`,
  },
  {
    slug: 'fools-gold',
    module_id: 'prospecting',
    sort_order: 4,
    title: "Fool's Gold and What to Look For",
    teaser: 'Pyrite, mica, and chalcopyrite have fooled beginners for centuries. Here\'s how to tell them apart from the real thing in seconds.',
    body: `## The Three Imposters

Every beginner sees something shiny in their pan and feels a surge of excitement. It's almost never gold. The three most common culprits are pyrite, mica, and chalcopyrite — and once you know how to read them, you'll never be fooled again.

## Pyrite — Iron Pyrite ("Fool's Gold")

Pyrite is the classic imposter. It forms in perfect cubic crystals and has a brassy, pale-yellow colour that catches light dramatically. It looks more like gold than gold does — which is exactly the problem.

**How to tell:** Pyrite is brittle. Press it firmly with a pin or the tip of a knife — it will crumble or crack into powder. Real gold is malleable: it will flatten and smear, not shatter. Pyrite also has sharp, geometric crystal faces and edges. Real alluvial gold is rounded, worn smooth by millions of years of tumbling in water.

The **streak test**: drag it across unglazed white ceramic (the back of a tile). Pyrite leaves a black or greenish-black streak. Gold leaves a gold-yellow streak.

## Mica

Mica is flat, reflective, and catches light intensely in the pan. It looks like tiny mirrors or silver flakes. It is not gold.

**How to tell:** Mica is almost weightless. It floats, drifts in the water, and never settles cleanly to the bottom of the pan. Gold, at 19× the weight of water, sinks fast and stays down. If it's moving around in your pan, it's not gold.

## Chalcopyrite

Chalcopyrite (copper iron sulfide) has an iridescent, multi-coloured surface — blues, purples, and golds mixed together. It's actually more interesting than gold to look at, which helps.

**How to tell:** The colours are a giveaway — real gold is uniform yellow, not iridescent. Chalcopyrite is also lighter and more brittle than gold.

## What Real Gold Looks Like

Alluvial gold is **dull yellow**, not shiny. It's been tumbled in a stream for thousands of years and has a matte, worn surface. It sits dead-still at the bottom of your pan while everything else moves. It doesn't float. It doesn't break. If you press it with a pin, it dents rather than cracks.

**The pan test is definitive:** real gold stays when everything else is gone.`,
  },
  {
    slug: 'legal-framework',
    module_id: 'prospecting',
    sort_order: 5,
    title: 'The Legal Framework — What You Need to Know',
    teaser: 'Prospecting in Ireland is legal and encouraged — but there are two rules every prospector must follow. Here\'s what they are and why they matter.',
    body: `## The Short Version

Recreational prospecting in Ireland is legal, widely practised, and encouraged by the Geological Survey of Ireland. The rules are simple: respect land access, and don't prospect the same land for more than two consecutive days without permission. That's the core of it.

## The Two-Day Rule

Under the Minerals Development Act 2017, any person may prospect land for up to two consecutive days without the landowner's permission. On the third consecutive day — or if you want to return to the same parcel of land within a short period — you need to ask.

In practice, this means you can spend a full weekend on a productive stream without needing permission. If you find a good spot and want to return regularly, a brief conversation with the landowner is both legally required and almost always warmly received. Most farmers are happy to have someone respectful working their land, particularly if you explain what you're doing.

## Land Access

Ireland does not have a general right to roam. Most agricultural land is privately owned, and crossing it without permission is technically trespass. The two-day rule is a specific exception for mineral prospecting — it does not apply to other activities.

**Practical guidance:** approach landowners directly and honestly. Explain that you're recreational gold panning, that you'll leave no trace, and that you're not digging or disturbing the land beyond hand-panning in the stream. This conversation almost always goes well.

## The Foreshore

Land below the high water mark — beaches, tidal estuaries, and the seabed — is owned by the state (managed by the Land Development Agency and the Department of Housing). No private landowner permission is required for the foreshore. Check relevant local authority byelaws for any specific restrictions in your area.

## GSI Data is Public Domain

All GSI geochemistry and bedrock data is published under Creative Commons Attribution 4.0 (CC BY 4.0). You are free to use it for any purpose, including commercial prospecting, provided you attribute the source. The data in this app is derived directly from those public datasets.

## What "Prospecting" Means Legally

Prospecting means searching for minerals using hand tools, panning, and surface sampling. It does not include drilling, blasting, or any mechanical excavation — those activities require a State Mining Licence from the Department of the Environment.

**NMI Reporting:** If you find a significant archaeological object (coins, artefacts, worked metal), you are legally required to report it to the National Museum of Ireland within 96 hours. Gold nuggets and alluvial gold are not archaeological objects — they're mineralogical finds and are yours to keep.`,
  },
]

async function seed() {
  console.log(`Seeding ${articles.length} articles into learn_articles…`)

  const { data, error } = await supabase
    .from('learn_articles')
    .upsert(articles, { onConflict: 'slug' })
    .select('slug, title')

  if (error) {
    console.error('Seed failed:', error.message)
    process.exit(1)
  }

  console.log('Inserted/updated:')
  data.forEach((a) => console.log(`  ✓ [${a.slug}] ${a.title}`))
  console.log('Done.')
}

seed()
