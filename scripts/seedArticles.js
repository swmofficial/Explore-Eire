import { createClient } from '@supabase/supabase-js'

// Auto-load .env — Node 22+ built-in, no dotenv package required
try { process.loadEnvFile(new URL('../.env', import.meta.url).pathname) } catch {}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing env vars. Add to .env or pass inline:')
  console.error('  SUPABASE_SERVICE_ROLE_KEY=<key> node scripts/seedArticles.js')
  console.error('SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗ missing')
  console.error('SUPABASE_SERVICE_ROLE_KEY:', SERVICE_ROLE_KEY ? '✓' : '✗ missing')
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

You don't need much to start. The core kit is a 12-inch gold pan, a classifier (mesh sieve — 1/8" is a good all-rounder), a trowel or small hand shovel, waterproof boots, and a handful of zip-lock sample bags. A snuffer bottle — a small squeeze bottle for sucking up fine gold from the pan — is cheap and worth having from day one. Bring snacks and water. You'll lose track of time.

Wear layers. Irish rivers are cold year-round, the weather changes fast, and you'll be kneeling on wet gravel for hours at a stretch. A pair of rubber gloves keeps your hands functional when the water is near freezing.

An OS 1:50,000 map of your area is worth printing. Mobile signal near good streams is often poor.

## Where to Start

Open the Explore Eire map and switch on the GSI Geochemistry heatmap layer. Look for the orange and red high-grade gold anomaly clusters — these mark stream sediment survey samples where the GSI recorded elevated gold values in the catchment. Wicklow, Mayo, and Donegal have the densest concentrations, but anomalies exist across many counties.

Stream sediment surveys work by sampling active stream beds across a grid. The data tells you what's eroding out of the hills above. Find a stream that drains through a high-anomaly zone and work your way upstream from the lowest accessible point. The gold has been travelling downhill for thousands of years — you're following it back toward its source.

## What to Do at the Stream

Start at the inside bend of any curve — this is where fast water slows and drops heavy material. Scoop gravel from the base of the gravel bar, classify it through your sieve into the pan (discard the large rocks), and pan the fines.

The panning motion is a controlled circular swirl with intermittent forward tilts to wash light material over the lip. It takes 20–30 minutes to develop the feel. Work down to the black sand layer — magnetite and hematite. This is where gold hides. Tilt the pan gently and inspect the leading edge of the black sand.

## What Success Looks Like

A flash of colour on your first day is a genuine win. A few specks of fine gold the size of a grain of sand — sometimes smaller — is a real find. Don't expect nuggets. Build your skill reading the stream first; the gold follows once you know where to look. Most beginners find colour within three sessions in a well-chosen zone.

**Before you go: check the two-day rule.** Under Irish law you may not prospect the same parcel of land for more than two consecutive days without the landowner's written consent. Plan your trip accordingly.`,
  },
  {
    slug: 'gold-irish-geology',
    module_id: 'prospecting',
    sort_order: 2,
    title: 'How Gold Forms in Irish Geology',
    teaser: "Ireland's gold is ancient — formed 400 million years ago during the Caledonian orogeny. Here's why certain counties hold far more than others.",
    body: `## Primary vs Secondary Gold

Gold in Ireland occurs in two forms. **Primary (lode) gold** sits locked in the original rock — in quartz veins and shear zones created deep in the crust under intense heat and pressure. **Secondary (alluvial) gold** is what recreational prospectors work with: primary gold that has been freed by millions of years of weathering and erosion, carried downhill by rivers, and concentrated in stream gravels, riverbanks, and flood plains.

You don't need to find the primary source to find gold. You need to find where the stream has done the concentrating work for you.

## The Caledonian Orogeny

Around 400 million years ago, two ancient continents collided — crumpling the crust of what would become Ireland and driving hot, mineral-rich fluids deep into fractures in the rock. Gold, dissolved in those fluids, crystallised out as the pressure dropped, forming gold-bearing quartz veins along shear zones and fault structures.

This event — the Caledonian orogeny — created the structural framework that controls where Ireland's gold sits today. The fold belts run northeast to southwest, which is why Wicklow, Mayo, and Donegal align as Ireland's primary gold counties. The geology doesn't follow county boundaries; it follows the ancient structures buried beneath.

## Reading the GSI Bedrock Layer

Switch on the Bedrock layer in the app. Granite intrusions (typically shown in pink and red tones) are closely associated with gold mineralisation — the heat that drove gold-bearing hydrothermal fluids into the surrounding rock came from these cooling magma bodies. Target the contacts between granite and the surrounding metamorphic rocks, and look for northeast-southwest trending structures.

The **Croagh Patrick district** in Mayo and the **Avoca district** in Wicklow are two of the most historically significant gold-producing areas in Ireland. Avoca has been mined since the Bronze Age; Croagh Patrick's streams have yielded alluvial gold finds within living memory. Both sit on Caledonian-age geology with the right structural controls.

## Pathfinder Elements

Gold is often present below the detection limit in the raw geochemistry data, but its companion elements are not. **Arsenic** and **lead** are reliable pathfinder indicators — they were dissolved in the same hydrothermal fluids as gold and behave similarly during erosion and transport.

If you see elevated arsenic values in the GSI heatmap without obvious gold readings, look carefully at the catchment geology upstream. The gold may be there at sub-detection concentrations — or the geochemistry sample may simply have missed a narrow vein. Cross-reference the heatmap with the bedrock layer, and take note of high-anomaly zones that fall on granite contacts or northeast-trending fault lines. These are your best targets.`,
  },
  {
    slug: 'reading-a-stream',
    module_id: 'prospecting',
    sort_order: 3,
    title: 'Reading a Stream — Where Gold Settles',
    teaser: "Gold is 19x heavier than water. Once you understand how a stream moves, you'll know exactly where to dig.",
    body: `## Specific Gravity: Why Gold Sinks

Gold has a specific gravity of 19.3 — meaning it is 19.3 times denser than the same volume of water. Quartz, the most common stream material, is about 2.6. This enormous density difference is what makes panning work and what controls where gold deposits in a stream.

When fast-moving water slows, it loses energy and drops the heaviest particles first. Gold falls out of suspension almost immediately when flow velocity decreases. Lighter material — sand, silt, organic matter — travels much further before settling. Understanding this principle is the whole game. You're not looking for gold; you're looking for places where water slows down.

## Where to Dig

**Inside bends (point bars).** As a stream curves, water on the inside of the bend travels slower than the outside. Heavy material swings inward and drops onto the gravel bar that forms there. The inside bend is your first target at any new location.

**Behind large boulders.** A boulder creates a hydraulic shadow — a zone of slow or recirculating water directly downstream. Gold settles in this dead water pocket. Dig immediately behind large stationary rocks in the stream bed, and slightly to each side where eddies form.

**Bedrock cracks and crevices.** When you've dug down to the underlying bedrock, inspect every crack carefully. Gold sinks until it hits something it cannot pass through. Crevices in bedrock are natural traps that have been accumulating gold for centuries. A crevice tool or stiff brush to clean them out is worth carrying.

**False bedrock.** Dense clay layers within the gravel profile behave identically to bedrock — gold sits on top of them. If you're sinking a test hole and hit an unexpectedly hard clay layer, sample the material directly above it before you dig through.

## A Simple Stream Map

\`\`\`
        ↓  flow direction  ↓

  ╭──────────────────────────╮
  │  FAST, DEEP WATER        │  ← outside bend
  │  LOW PROBABILITY         │     erosion, scour, no gold
  │        ╭─────────────────╯
  │  ●●●●  │  ← inside bend / point bar
  │  HIGH  │     slow water, gold drops here
  ╰────────╯
      [boulder]
         ●  ← hydraulic shadow
         HIGH PROBABILITY
\`\`\`

## Sampling Upstream from a Find

If you get colour at a particular spot, don't work the same location all day. Move **upstream** in 10–15 metre increments, panning a sample at each stop. The gold concentration will increase as you approach the source and drop off once you've passed it. When the concentration falls, work back downstream to the peak zone and dig deeper — you're close to where the gold is coming from.

The depth of overburden matters too. If you're sampling at the surface and getting only trace colour, try a deeper sample from the base of the gravel layer. Gold sinks over time and is often richest where it has had the longest to settle.`,
  },
  {
    slug: 'fools-gold',
    module_id: 'prospecting',
    sort_order: 4,
    title: "Fool's Gold and What to Look For",
    teaser: "Pyrite, mica, and chalcopyrite have fooled beginners for centuries. Here's how to tell them apart from the real thing in seconds.",
    body: `## The Three Imposters

Every beginner sees something shiny in their pan and feels a surge of excitement. Almost every time, it is not gold. The three most common culprits are pyrite, mica, and chalcopyrite. Once you know how to read them, you will never be fooled again.

## Pyrite — Iron Pyrite ("Fool's Gold")

Pyrite is the classic imposter. It forms in perfect cubic crystals with sharp edges and flat faces, and has a brassy, pale-yellow colour that catches sunlight dramatically — more aggressively shiny than real gold, which is part of the problem.

**The pin test:** press a pin or knife tip firmly against it. Pyrite is brittle. It will crack or crumble into black powder. Real gold is malleable — it will flatten and smear without breaking. This test is definitive and takes three seconds.

**The streak test:** drag the sample across the back of an unglazed white ceramic tile. Pyrite leaves a black or greenish-black streak. Gold leaves a gold-yellow streak.

Pyrite also tends to form in angular, geometric shapes. Alluvial gold is rounded and worn — tumbled smooth by millions of years in a river.

## Mica

Mica forms in thin, flat, reflective sheets that look like mirrors or shimmering gold flakes in the pan. In bright sunlight they are genuinely spectacular. They are not gold.

**How to tell:** mica is almost weightless. It floats on the water surface, drifts around with any movement, and will never settle cleanly to the bottom of the pan. Gold, at 19× the density of water, drops immediately and stays there. If it moves when you tilt the pan, it is not gold.

## Chalcopyrite

Chalcopyrite (copper iron sulfide) has an iridescent, multi-coloured surface — blues, purples, and golds swirled together. It is actually more interesting-looking than gold, which helps with identification.

**How to tell:** the rainbow tarnish is the giveaway. Real gold is a uniform, matte yellow. It has no iridescence and no colour variation. Chalcopyrite is also lighter and more brittle than gold.

## What Real Gold Looks Like in the Pan

Alluvial gold is **dull yellow** — not brassy, not shiny, not iridescent. It has been tumbled in a river for thousands of years and has a matte, slightly rough surface. It sits as a tiny, unmistakeable bright yellow point at the very bottom of your pan. It does not move when you tilt. It does not float. It does not break. When everything else has washed away, it is still there.

**The pan test is definitive.** When you are down to the last thin smear of black sand and you see a still, yellow point that refuses to move — that is colour. That is gold.`,
  },
  {
    slug: 'legal-framework',
    module_id: 'prospecting',
    sort_order: 5,
    title: 'The Legal Framework — What You Need to Know',
    teaser: "Prospecting in Ireland is legal and encouraged — but there are two rules every prospector must follow. Here's what they are and why they matter.",
    body: `## The Short Version

Recreational gold prospecting in Ireland is legal, widely practised, and actively supported by the Geological Survey of Ireland, which publishes all of its survey data as open access. The rules are simple and designed to be workable. Learn them, follow them, and you will have no issues.

## The Two-Day Rule

Under the **Minerals Development Act 2017**, any person may prospect a piece of land for up to two consecutive days without the landowner's permission. On the third consecutive day — or if you wish to return to the same land parcel repeatedly — you need to ask.

In practice, this means you can spend a full weekend on a productive stream without needing any prior arrangement. If you find a good spot and want to work it regularly, a conversation with the landowner is both legally required and almost always well received. Explain what you're doing honestly. Most farmers are curious, some are genuinely interested, and very few will refuse. Bring a small sample to show them if you have one.

The rule exists to protect agricultural land from sustained disruption — not to restrict casual prospecting.

## Land Access

Ireland does not have a general right to roam across private land. The two-day rule is a specific statutory exception for mineral prospecting and does not apply to other activities. When crossing agricultural land to reach a stream, the practical guidance is to approach landowners in advance, explain your intentions, and keep the interaction brief and friendly.

## The Foreshore

Land below the high water mark — beaches, tidal estuaries, sea inlets — is owned by the Irish state. No private landowner permission is required to prospect the foreshore. Many of Ireland's most accessible alluvial gold deposits are in coastal and estuarine environments for precisely this reason. Check local authority byelaws for any specific restrictions in your area before going.

## GSI Data is Public Domain

All GSI geochemistry and bedrock data used in this app is published under **Creative Commons Attribution 4.0 (CC BY 4.0)**. You are free to use it for any purpose, including locating and working productive areas, provided you attribute the source. The data belongs to the Irish public — and to you.

## Prospecting vs Mining

**Prospecting** means searching for minerals using hand tools — panning, sampling, surface inspection. It does not include mechanical excavation, drilling, or blasting. Those activities require a State Mining Licence from the Department of the Environment.

**NMI Reporting:** if you find a significant archaeological object — coins, worked metal, artefacts — you are legally required to report it to the National Museum of Ireland within 96 hours. Alluvial gold and gold nuggets are mineralogical finds, not archaeological objects, and are yours to keep.

The prospecting community in Ireland is small and genuinely friendly. If you have any doubts about a specific location or situation, ask on the **Irish Prospectors Association** forum before you go. Someone will know the answer.`,
  },
]

async function seed() {
  // Delete all existing prospecting articles before inserting to avoid duplicates
  console.log('Clearing existing prospecting articles…')
  const { error: deleteError } = await supabase
    .from('learn_articles')
    .delete()
    .eq('module_id', 'prospecting')

  if (deleteError) {
    console.error('Delete failed:', deleteError.message)
    process.exit(1)
  }
  console.log('Cleared.')

  console.log(`Inserting ${articles.length} articles…`)
  const { data, error } = await supabase
    .from('learn_articles')
    .insert(articles)
    .select('slug, title')

  if (error) {
    console.error('Insert failed:', error.message)
    process.exit(1)
  }

  console.log('Inserted:')
  data.forEach((a) => console.log(`  ✓ [${a.slug}] ${a.title}`))
  console.log('Done.')
}

seed()
