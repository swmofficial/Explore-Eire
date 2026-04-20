// seedCourses.js — Seeds courses and chapters tables.
// Run: SUPABASE_SERVICE_ROLE_KEY=<key> node scripts/seedCourses.js
import { createClient } from '@supabase/supabase-js'

process.loadEnvFile()

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

const COURSES = [
  {
    slug: 'gold-panning-fundamentals',
    title: 'Gold Panning Fundamentals',
    description: 'Master the basics of gold panning in Irish rivers — from reading the landscape to your first colour in the pan.',
    module: 'prospecting',
    is_pro: false,
    cover_emoji: '⛏️',
    chapters: [
      {
        position: 1,
        title: 'Introduction to Placer Gold',
        content: [
          { type: 'text', body: 'Placer gold is gold that has been weathered from its original bedrock source and transported by water. Over thousands of years, Ireland\'s rivers have carried gold particles from the ancient Caledonian mountain belts and deposited them in predictable locations along streambeds.' },
          { type: 'text', body: 'Ireland has a long history of gold finds. The Wicklow gold rush of 1795 saw prospectors recover over 80 ounces of gold in a single week from the Ballinvalley stream. The Gold Mines River in County Wicklow still yields colours to this day.' },
          { type: 'text', body: 'Gold is 19× heavier than water and roughly 7× heavier than the gravel it travels with. This density is the fundamental principle behind every gold recovery technique — from pan to sluice to dredge.' },
          { type: 'text', body: 'Gold travels downstream in two ways: bedload (rolling and sliding along the bottom during floods) and suspension (very fine dust carried in turbulent water). Most recreational prospectors target bedload deposits found in low-energy zones where gold settles out of the current.' },
        ],
        quiz: [
          { question: 'What is placer gold?', options: ['Gold still in its original rock vein', 'Gold transported by water from its source', 'Man-made gold alloy', 'Gold found underground in caves'], answer: 1 },
          { question: 'Approximately how many times heavier than water is gold?', options: ['3×', '7×', '19×', '25×'], answer: 2 },
        ],
      },
      {
        position: 2,
        title: 'Reading a Stream',
        content: [
          { type: 'text', body: 'Understanding stream hydraulics is the single most valuable skill a prospector can develop. Gold settles wherever the current slows — inside bends, behind boulders, in bedrock cracks, and at the downstream end of pools.' },
          { type: 'text', body: 'INSIDE BENDS: As water flows around a curve, centrifugal force pushes heavier material to the inside of the bend. The current is slower here and a gravel bar usually forms. These gravel bars are classic placer deposits.' },
          { type: 'text', body: 'BEDROCK TRAPS: Where bedrock outcrops on the streambed, the natural cracks, joints, and potholes act as perfect gold traps. Gold that rolls along the bottom drops into these cracks and can accumulate over centuries. Always check bedrock potholes — they often hold the richest concentrations.' },
          { type: 'text', body: 'BEHIND BOULDERS: A large boulder creates a hydraulic shadow — a low-velocity zone immediately downstream. Gravel and gold accumulate in this shadow zone. The colour you find here was deposited during the last major flood event.' },
          { type: 'text', body: 'PAYSTREAKS: A paystreak is a concentration of gold running along the ancient course of the stream. Modern streams often cut across ancient paystreaks — look for exposed gravel benches above the current waterline (called "bench gravels") which represent old streambeds.' },
        ],
        quiz: [
          { question: 'Where does gold tend to settle in a river bend?', options: ['Outside of the bend where current is fastest', 'Middle of the river', 'Inside of the bend where current is slowest', 'Evenly distributed throughout'], answer: 2 },
          { question: 'What are "bench gravels"?', options: ['Purpose-built prospecting benches', 'Gravel deposits representing ancient elevated streambeds', 'Gravel below the current waterline', 'Man-made gravel bars'], answer: 1 },
        ],
      },
      {
        position: 3,
        title: 'Equipment Basics',
        content: [
          { type: 'text', body: 'You can start with almost nothing — a plastic pan, a small trowel, and a pair of wellies. As your skills and ambition grow, you\'ll want to add a classifier (sieve), a snuffer bottle, and vials for storing colours.' },
          { type: 'text', body: 'PAN SELECTION: A 14–16 inch plastic pan in green or black is ideal for beginners. The colour contrast helps you spot gold. Avoid metal pans until you\'ve developed technique — they\'re heavier and show rusting over time. The pan should have grooved riffles along the inside edge to help trap fine gold.' },
          { type: 'text', body: 'CLASSIFIER: A 1/4 inch mesh classifier (sieve) speeds up your work dramatically by removing large rocks before you pan. Stack multiple mesh sizes for maximum efficiency. Always classifier your material before panning.' },
          { type: 'text', body: 'SNUFFER BOTTLE: A small squeeze bottle with a narrow nozzle. You suck up gold flakes and dust from the pan. Essential once you start finding regular colours — picking gold from a wet pan with dry fingers is both slow and leads to losses.' },
          { type: 'text', body: 'VIALS: Small glass or plastic vials with tight-fitting caps store your gold. Keep a small amount of water in the vial — dry gold dust is prone to static and can be lost when you open the cap. Gold in water sinks immediately.' },
        ],
        quiz: [
          { question: 'What colour pan is best for a beginner?', options: ['Silver or grey metal pan', 'White plastic pan', 'Green or black plastic pan', 'Any colour works equally well'], answer: 2 },
          { question: 'What does a classifier do?', options: ['Measures gold purity', 'Removes large rocks before panning', 'Detects gold electronically', 'Stores gold for transport'], answer: 1 },
        ],
      },
      {
        position: 4,
        title: 'Panning Technique Step by Step',
        content: [
          { type: 'text', body: 'STEP 1 — LOAD THE PAN: Fill your pan no more than two-thirds full of classified material. Submerge the pan completely in water and break up all clay lumps with your fingers. Clay can coat gold particles and cause them to float off.' },
          { type: 'text', body: 'STEP 2 — BREAK UP CLAYS: With the pan submerged, use vigorous circular motion to loosen all material. Squeeze any clay balls to make sure they disintegrate. Roots, moss, and organics should be removed by hand — they can harbour gold.' },
          { type: 'text', body: 'STEP 3 — STRATIFY: With the pan held level just below the water surface, use a side-to-side shaking motion (not circular). This causes heavy material to sink to the bottom — gold, black sand, and heavy minerals stratify below the lighter gravel.' },
          { type: 'text', body: 'STEP 4 — WASH OFF LIGHT MATERIAL: Tilt the pan slightly away from you (about 30 degrees). Use forward-and-back rocking motions combined with a gentle circular sweep to wash gravel over the far lip. Keep the riffles at the back. Heavy material stays; light gravel washes out.' },
          { type: 'text', body: 'STEP 5 — REPEAT: Continue steps 3 and 4 until you\'re left with a concentrate of black sand (magnetite and other heavy minerals) and hopefully gold. This concentrate should be about a tablespoon of material.' },
          { type: 'text', body: 'STEP 6 — CLEAN THE CONCENTRATE: Tilt the pan at a steeper angle and use tiny swirling motions to spread the black sand into a thin crescent. Gold, being heaviest, will appear as bright yellow flakes or fine dust at the leading edge of the crescent.' },
        ],
        quiz: [
          { question: 'Why should you break up clay lumps in your pan?', options: ['To make panning faster', 'Clay can coat gold and cause it to float off', 'Clay damages the pan surface', 'Clay contains no gold'], answer: 1 },
          { question: 'What should you do with roots and organic material found in your pan?', options: ['Pan them normally', 'Discard immediately — they contain no gold', 'Remove by hand — they can harbour gold', 'Dry them out first'], answer: 2 },
        ],
      },
      {
        position: 5,
        title: 'Identifying Your Find',
        content: [
          { type: 'text', body: 'Congratulations — you have a colour in your pan. But is it real gold? Three common imposters fool beginners every time: pyrite (fool\'s gold), chalcopyrite, and mica.' },
          { type: 'text', body: 'PYRITE: Cubic crystal structure, brass-yellow colour with a greenish tint. It is brittle and will crush to a black powder with a knife point. It does not flatten — it shatters. Pyrite is common in Irish stream gravels, especially near black shales.' },
          { type: 'text', body: 'CHALCOPYRITE: Brassy yellow-gold with an iridescent (rainbow) tarnish surface. Harder than pyrite, also brittle. The iridescent tarnish is the tell — real gold never shows rainbow colours.' },
          { type: 'text', body: 'MICA: Silvery or golden flakes that are extremely light. Mica floats and dances in the pan — it will wash off with almost no water motion. Real gold stays glued to the pan bottom due to its density.' },
          { type: 'text', body: 'REAL GOLD TESTS: (1) Malleability — real gold flattens when pressed with a knife; imposters shatter or crumble. (2) Colour — pure gold is bright yellow with no green or rainbow tint. (3) Shape — placer gold is rounded and often has a hammered, angular appearance from tumbling. (4) It stays in the pan — gravity keeps it there.' },
        ],
        quiz: [
          { question: 'How can you tell real gold from pyrite?', options: ['Gold is lighter than pyrite', 'Gold flattens when pressed; pyrite shatters', 'Gold has a rainbow tarnish; pyrite does not', 'Pyrite sinks in water; gold floats'], answer: 1 },
          { question: 'Why does mica wash out of the pan easily?', options: ['Mica dissolves in water', 'Mica is very lightweight and floats', 'Mica repels water', 'Mica is magnetic'], answer: 1 },
        ],
      },
      {
        position: 6,
        title: 'Recording and Reporting Your Find',
        content: [
          { type: 'text', body: 'Ireland\'s Minerals Development Act 2017 requires you to report any significant gold find to the Geological Survey Ireland (GSI). This isn\'t just legal compliance — it actively contributes to our understanding of Ireland\'s mineral wealth.' },
          { type: 'text', body: 'WHAT TO RECORD: Always note your exact GPS coordinates, the date, and a description of where you found the material (e.g., "inside bend gravel bar, left bank, 15m downstream of the stone bridge"). Record the colour and approximate size of any gold found.' },
          { type: 'text', body: 'PHOTOGRAPH YOUR FIND: Take a clear photo of the gold in your pan before collecting it. Photograph the location — the stream, the feature you were sampling (e.g., the bedrock crack or gravel bar). This documentation helps you replicate the find and provides evidence if you want to return with equipment.' },
          { type: 'text', body: 'LOG IN THE APP: Use the Field Log (camera button) to log your find with GPS coordinates and a photo. Your finds are private, stored in your account, and accessible offline.' },
          { type: 'text', body: 'THE TWO-DAY RULE: Under the Minerals Development Act 2017, recreational prospectors are permitted to prospect for up to two consecutive days on any area without a prospecting licence, provided you are using hand tools only (pan, sluice, small hand tools). Mechanical equipment requires a licence.' },
        ],
        quiz: [
          { question: 'Under the two-day rule, how long can you prospect in one area without a licence?', options: ['One day', 'Two consecutive days', 'One week', 'No time limit for hand tools'], answer: 1 },
          { question: 'What is the most important thing to record when you find gold?', options: ['The price of gold that day', 'Exact GPS coordinates, date, and location description', 'Your equipment list', 'The river name only'], answer: 1 },
        ],
      },
    ],
  },
  {
    slug: 'reading-geological-maps',
    title: 'Reading Geological Maps',
    description: 'Understand how to read and use Ireland\'s geological maps to find prospecting targets before you leave home.',
    module: 'prospecting',
    is_pro: false,
    cover_emoji: '🗺️',
    chapters: [
      {
        position: 1,
        title: 'Introduction to Irish Geology',
        content: [
          { type: 'text', body: 'Ireland\'s bedrock tells a story spanning over 1.8 billion years. The oldest rocks in the country — the Lewisian-equivalent Inishtrahull Gneiss in County Donegal — formed during the Precambrian. Understanding this ancient history is key to finding gold.' },
          { type: 'text', body: 'Ireland was assembled by the collision of two continents along the ancient Iapetus Ocean. This collision (the Caledonian Orogeny, 490–420 million years ago) crumpled the rocks into folds, created fault zones, and forced hot fluids through the crust — the same fluids that deposited gold in quartz veins.' },
          { type: 'text', body: 'The Caledonian Fold Belt runs from northeast to southwest across Ireland — from County Down through Wicklow, into Wexford and across to Mayo and Donegal. This belt hosts the majority of Ireland\'s known gold occurrences.' },
          { type: 'text', body: 'GSI MAPS: The Geological Survey Ireland publishes 1:100,000 and 1:500,000 bedrock geology maps freely available on their website and accessible via the WMS layers in this app. The maps use the standard colour convention: different colours represent different rock types and ages.' },
        ],
        quiz: [
          { question: 'What geological event concentrated gold in Irish rocks?', options: ['The Ice Age glaciation', 'The Caledonian Orogeny continental collision', 'Volcanic activity in Antrim', 'Limestone formation'], answer: 1 },
          { question: 'In which direction does the Caledonian Fold Belt trend across Ireland?', options: ['East to west', 'North to south', 'Northeast to southwest', 'Circular around the Irish Sea'], answer: 2 },
        ],
      },
      {
        position: 2,
        title: 'Understanding Map Symbology',
        content: [
          { type: 'text', body: 'Geological maps use colour to show rock types. The GSI 1:100,000 maps use a standardised colour scheme: reds and pinks for granites, greens for metamorphic rocks (schists, gneisses), blues and greys for sedimentary rocks (shales, sandstones), and yellows for limestones.' },
          { type: 'text', body: 'CONTACTS: The lines between different coloured units are called contacts. Contacts are where one rock type meets another. Mineralisation often occurs along or near contacts — the interface between different rocks is a chemical boundary where mineralising fluids can precipitate metals.' },
          { type: 'text', body: 'FAULTS: Shown as solid or dashed black lines, often with tick marks showing displacement direction. Faults are high-priority prospecting targets — they were ancient fluid pathways. Look for where faults cross contacts for maximum prospecting potential.' },
          { type: 'text', body: 'STRIKE AND DIP: Small symbols on the map showing the orientation of rock layers. The long bar shows strike (the horizontal direction the rock layers run). The short tick shows dip direction (which way the layers slope down). Important for understanding the 3D structure.' },
        ],
        quiz: [
          { question: 'What colour typically represents granite on GSI maps?', options: ['Green', 'Blue', 'Red or pink', 'Yellow'], answer: 2 },
          { question: 'Why are faults important for gold prospecting?', options: ['Faults contain gold themselves', 'Faults were ancient fluid pathways where gold may have precipitated', 'Faults make the ground easier to dig', 'Faults increase stream gradients'], answer: 1 },
        ],
      },
      {
        position: 3,
        title: 'Identifying Gold-Prospective Areas',
        content: [
          { type: 'text', body: 'Not all geology is created equal for gold prospecting. Certain rock associations are consistently more prospective than others in the Irish context.' },
          { type: 'text', body: 'SCHIST BELTS: Pelitic schists (meta-mudstones formed during the Caledonian collision) are the host rock for much of Ireland\'s known gold mineralisation. Look for areas mapped as schist on the GSI bedrock map, particularly where intrusive granites have contacted them.' },
          { type: 'text', body: 'GRANITE MARGINS: Gold often occurs along the margins of granitic intrusions — the contact aureole where hot granite melts baked the surrounding rocks and fluids circulated. The inner 2–3km of schist adjacent to a granite contact is highly prospective.' },
          { type: 'text', body: 'QUARTZ VEINS: Gold in Ireland is almost always associated with quartz. Outcrops of white quartz veins cutting through schist are direct indicators of the hydrothermal system that may have carried gold. If you see quartz veins, you are in the right geological environment.' },
          { type: 'text', body: 'GSI GEOCHEMISTRY DATA: The GSI\'s stream sediment survey (accessible as a layer in this app) sampled the fine fraction of stream gravels across Ireland and analysed them for gold. The gold ppb (parts per billion) layer shows you where gold has already been detected in stream sediments — the highest-value starting point for targeting new areas.' },
        ],
        quiz: [
          { question: 'What type of rock hosts most of Ireland\'s known gold?', options: ['Limestone', 'Granite', 'Pelitic schist', 'Basalt'], answer: 2 },
          { question: 'What is the significance of quartz veins for prospecting?', options: ['Quartz contains gold directly', 'Quartz veins indicate the hydrothermal system that may have carried gold', 'Quartz makes panning easier', 'Quartz veins are easy to see on aerial photos'], answer: 1 },
        ],
      },
      {
        position: 4,
        title: 'Using Digital Geology Layers',
        content: [
          { type: 'text', body: 'The Explore Eire app integrates three GSI WMS layers that give you direct access to the geological data most relevant to prospecting: Bedrock Geology, Geochemistry (gold stream sediment data), and Boreholes.' },
          { type: 'text', body: 'BEDROCK GEOLOGY LAYER: Accessed via the Layers panel → Geology section. Shows the GSI 1:100,000 bedrock map overlaid on the satellite or topo basemap. You can zoom in to individual river sections and assess the underlying geology before visiting.' },
          { type: 'text', body: 'GEOCHEMISTRY LAYER: The most directly useful layer for gold prospectors. Each point represents a stream sediment sample site — the colour indicates the gold concentration in ppb. Use the Data Sheet at the bottom of the map screen to filter by gold tier and find the highest-concentration areas near you.' },
          { type: 'text', body: 'WORKFLOW: Start with the geochemistry layer to identify high-gold stream sediment areas. Switch to the bedrock layer to understand the underlying geology. Cross-reference with the satellite view to identify accessible stream sections. Save waypoints at your target sites before you visit.' },
        ],
        quiz: [
          { question: 'What does each point on the Geochemistry layer represent?', options: ['A known gold mine', 'A stream sediment sample site showing gold concentration', 'A GPS waypoint saved by another user', 'A geological borehole'], answer: 1 },
          { question: 'What is the recommended workflow before a prospecting trip?', options: ['Visit first, check maps later', 'Check geochemistry → bedrock geology → satellite → save waypoints', 'Only use the satellite view', 'Check boreholes first'], answer: 1 },
        ],
      },
      {
        position: 5,
        title: 'Putting It All Together — Planning a Trip',
        content: [
          { type: 'text', body: 'You now have the tools to plan a targeted prospecting trip from your phone. Here is the complete planning workflow.' },
          { type: 'text', body: 'STEP 1 — TARGET SELECTION: Open the app, activate the Geochemistry layer. Look for tier 1–3 gold anomalies (highest concentrations). Filter the Data Sheet to show only these samples. Note which river catchments they occur in.' },
          { type: 'text', body: 'STEP 2 — GEOLOGICAL ASSESSMENT: Activate the Bedrock layer. Check that your target area sits within a prospective geological environment (schist belt, granite margin). Look for faults or contacts running through your target stream.' },
          { type: 'text', body: 'STEP 3 — ACCESS RESEARCH: Switch to satellite view and trace the river from the anomaly downstream. Identify road access points, parking, and walking distances. Check the 1:50,000 OSI map (outdoor basemap layer) for rights of way and land ownership boundaries.' },
          { type: 'text', body: 'STEP 4 — PERMISSION: Contact the landowner before visiting. In Ireland, all land above the high-water mark is privately owned. The two-day prospecting rule under the Minerals Act does not override the requirement to be on land lawfully. A polite phone call almost always results in permission being granted.' },
          { type: 'text', body: 'STEP 5 — LOG YOUR TRIP: When you arrive, save a waypoint at your start point. Use Go & Track to record your route. Log any finds in the Field Log with GPS coordinates and photos. Your data contributes to your personal prospecting intelligence over time.' },
        ],
        quiz: [
          { question: 'What is the first step in planning a prospecting trip with the app?', options: ['Check the weather layer', 'Target selection using the Geochemistry layer', 'Save waypoints at random locations', 'Look up land ownership records'], answer: 1 },
          { question: 'In Ireland, is land above the high-water mark privately owned?', options: ['No — all riparian land is public', 'Yes — all land above the high-water mark is privately owned', 'Only land farther than 50m from water', 'Only agricultural land'], answer: 1 },
        ],
      },
    ],
  },
  {
    slug: 'legal-permissions-ireland',
    title: 'Legal & Permissions in Ireland',
    description: 'Everything you need to know about prospecting law, land access rights, and reporting obligations in the Republic of Ireland.',
    module: 'prospecting',
    is_pro: true,
    cover_emoji: '⚖️',
    chapters: [
      {
        position: 1,
        title: 'The Minerals Development Act 2017',
        content: [
          { type: 'text', body: 'The Minerals Development Act 2017 is the primary legislation governing mineral exploration and extraction in Ireland. It replaced the Minerals Development Acts 1940–1999 and brought Irish mining law into the 21st century.' },
          { type: 'text', body: 'Under the Act, all minerals in the ground in Ireland are the property of the State, regardless of who owns the surface land. This means even if you own a farm with a gold-bearing stream on it, the gold in the ground belongs to the State.' },
          { type: 'text', body: 'The Act creates a tiered licensing system: Prospecting Licence (exploration), Retention Licence (holding a discovery), Mining Licence (extraction), and State Mining Facilities (major projects). All are administered by the Department of the Environment, Climate and Communications.' },
          { type: 'text', body: 'RECREATIONAL EXEMPTION: The Act explicitly exempts recreational prospecting using hand tools from the licensing requirement, subject to the two-day rule. This is the legal basis for all recreational gold panning in Ireland.' },
        ],
        quiz: [
          { question: 'Who owns the minerals in the ground in Ireland?', options: ['The surface landowner', 'The State', 'The finder', 'The local council'], answer: 1 },
          { question: 'What legislation governs mineral prospecting in Ireland?', options: ['The Mining Act 1963', 'The Minerals Development Act 2017', 'The Geological Survey Act 1845', 'The Environmental Protection Act 1992'], answer: 1 },
        ],
      },
      {
        position: 2,
        title: 'The Two-Day Rule Explained',
        content: [
          { type: 'text', body: 'Section 9 of the Minerals Development Act 2017 creates what is commonly called the "two-day rule" for recreational prospectors. Understanding its exact scope is critical.' },
          { type: 'text', body: 'WHAT IT PERMITS: A person may prospect for minerals on any land for no more than two consecutive days without a prospecting licence, provided they use hand tools only. Hand tools means pan, classifier, shovel, trowel, and pick — not mechanical equipment, pumps, or dredges.' },
          { type: 'text', body: 'WHAT IT DOES NOT PERMIT: The two-day rule is a minerals licensing exemption — it does not grant access rights. You still need the landowner\'s permission to be on private land. It does not permit you to dam streams, divert water courses, remove significant quantities of sediment, or cause environmental damage.' },
          { type: 'text', body: 'THE RESET: After two consecutive days on any one area, you must move to a different area before returning. There is no legal minimum distance for "different area" defined in the Act, but common sense and respect for the spirit of the law suggest moving to a different catchment or at minimum a significantly different location on the same river.' },
          { type: 'text', body: 'SIGNIFICANT FINDS: If you make a significant discovery — a gold nugget, a substantial quantity of gold dust, or a potential bedrock mineralisation — you have a legal obligation to notify the GSI and the Department of DECC. Failure to report a significant find is an offence under the Act.' },
        ],
        quiz: [
          { question: 'Does the two-day rule grant access rights to private land?', options: ['Yes — it is a complete right of access for prospectors', 'No — it is only a minerals licensing exemption; landowner permission is still required', 'Yes, but only for streams and riverbanks', 'Only on Sundays'], answer: 1 },
          { question: 'What must you do after prospecting an area for two consecutive days?', options: ['Apply for a prospecting licence', 'Move to a different area before returning', 'Report to the GSI', 'Stop prospecting entirely that season'], answer: 1 },
        ],
      },
      {
        position: 3,
        title: 'Land Access Rights',
        content: [
          { type: 'text', body: 'Ireland has one of the most restrictive land access regimes in Europe. Unlike Scotland (which has statutory right to roam) or many continental European countries, there is no general right of public access to private land in Ireland.' },
          { type: 'text', body: 'ALL LAND IS PRIVATE: In Ireland, virtually all land above the high-water mark is privately owned. Rivers, lakeshores, and coastal areas are typically in private ownership. There is no equivalent of England\'s "access land" or Scotland\'s Land Reform Act.' },
          { type: 'text', body: 'RIGHTS OF WAY: Formal rights of way (public footpaths and roads) exist and are shown on OSI maps. However, walking along a riverbank even where a public right of way exists does not give you the right to dig, dam, or otherwise interfere with the land.' },
          { type: 'text', body: 'PRACTICAL ACCESS: In practice, most Irish landowners are happy to grant access for responsible recreational prospecting. A polite introduction — in person, by phone, or by letter — explaining what you are doing (recreational gold panning, no machinery, no damage) almost always succeeds. Always leave gates as you find them, take your litter, and fill in any holes.' },
          { type: 'text', body: 'TRESPASS: Entering land without permission is a civil wrong (trespass) in Ireland, not a criminal offence in most circumstances. However, if you cause damage, the landowner can sue for damages. If you are asked to leave, you must do so promptly.' },
        ],
        quiz: [
          { question: 'Is there a general right to roam on private land in Ireland?', options: ['Yes — all rivers and lakeshores are public', 'No — virtually all land above the high-water mark is privately owned', 'Yes, for recreational activities only', 'Only in national parks'], answer: 1 },
          { question: 'Is trespass in Ireland typically a criminal offence?', options: ['Yes — it carries a fine', 'No — it is usually a civil wrong, not a criminal offence', 'Only when near water', 'Yes, under the Minerals Act'], answer: 1 },
        ],
      },
      {
        position: 4,
        title: 'Environmental Obligations',
        content: [
          { type: 'text', body: 'Beyond mineral law and land access, prospectors must comply with Irish and EU environmental law. Several key pieces of legislation are directly relevant.' },
          { type: 'text', body: 'WATER FRAMEWORK DIRECTIVE (EU): Transposed into Irish law as the European Communities (Water Policy) Regulations 2003. This prohibits activities that would cause deterioration of water body status. Significant disturbance of streambeds, particularly spawning gravels, can breach this regulation.' },
          { type: 'text', body: 'SALMONID RIVERS: Many of Ireland\'s best gold-bearing rivers are designated salmonid rivers under the Fisheries Acts. Disturbance of spawning gravels (redds) is an offence. Salmon and sea trout spawning season runs roughly October to February — avoid disturbing gravel beds during this period.' },
          { type: 'text', body: 'HABITATS DIRECTIVE: Ireland has an extensive network of SACs (Special Areas of Conservation) and SPAs (Special Protection Areas) under the EU Habitats and Birds Directives. Many rivers and upland areas fall within these designations. Check the NPWS mapping before visiting — significant disturbance within an SAC may require Appropriate Assessment.' },
          { type: 'text', body: 'BEST PRACTICE: Keep disturbance to a minimum. Work in one pool at a time. Return all material to the water. Never dam a stream. Never prospect in or near spawning redds (look for disturbed gravels in shallow water). If in doubt, move on. Responsible prospectors are the best advertisement for the hobby.' },
        ],
        quiz: [
          { question: 'When is salmon spawning season in Irish rivers?', options: ['April to June', 'July to September', 'October to February', 'March to May'], answer: 2 },
          { question: 'What should you do with material you remove from the streambed during panning?', options: ['Take it home for further processing', 'Return all material to the water', 'Dispose of it on the bank', 'Report it to the GSI'], answer: 1 },
        ],
      },
    ],
  },
]

async function seed() {
  console.log('Seeding courses...')

  for (const course of COURSES) {
    const { chapters, ...courseData } = course
    courseData.chapter_count = chapters.length

    // Delete existing course + chapters (cascade)
    const { data: existing } = await supabase
      .from('courses')
      .select('id')
      .eq('slug', course.slug)
      .single()

    if (existing) {
      await supabase.from('courses').delete().eq('id', existing.id)
      console.log(`Deleted existing: ${course.slug}`)
    }

    // Insert course
    const { data: inserted, error: courseErr } = await supabase
      .from('courses')
      .insert(courseData)
      .select('id')
      .single()

    if (courseErr) { console.error('Course insert error:', courseErr); continue }

    console.log(`Inserted course: ${course.title} (${inserted.id})`)

    // Insert chapters
    const chapterRows = chapters.map(ch => ({
      ...ch,
      course_id: inserted.id,
    }))

    const { error: chapErr } = await supabase.from('chapters').insert(chapterRows)
    if (chapErr) { console.error('Chapter insert error:', chapErr); continue }

    console.log(`  Inserted ${chapters.length} chapters`)
  }

  console.log('Done.')
}

seed()
