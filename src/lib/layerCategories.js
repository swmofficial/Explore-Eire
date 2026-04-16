// layerCategories.js — Module → layer panel section mapping

export const LAYER_CATEGORIES = {
  prospecting: [
    {
      id: 'gold_occurrences',
      label: 'Gold Occurrences',
      layers: [
        { id: 'stream_sediment', label: 'Stream sediment samples', pro: false },
        { id: 'rock_samples',    label: 'Rock samples',            pro: false },
      ],
    },
    {
      id: 'gsi_geochemistry',
      label: 'GSI Geochemistry',
      layers: [
        { id: 'gold_heatmap', label: 'Gold heatmap', pro: true },
        { id: 'arsenic',      label: 'Arsenic',      pro: true },
        { id: 'lead',         label: 'Lead',         pro: true },
      ],
    },
    {
      id: 'gsi_geology',
      label: 'GSI Geology',
      layers: [
        { id: 'bedrock',   label: 'Bedrock geology',  pro: true },
        { id: 'geo_lines', label: 'Geological lines', pro: true },
        { id: 'boreholes', label: 'Boreholes',        pro: true },
      ],
    },
    {
      id: 'minerals',
      label: 'Minerals',
      layers: [
        { id: 'gold',      label: 'Gold localities',      pro: false, mineralCategory: true },
        { id: 'copper',    label: 'Copper localities',    pro: false, mineralCategory: true },
        { id: 'lead',      label: 'Lead localities',      pro: false, mineralCategory: true },
        { id: 'uranium',   label: 'Uranium localities',   pro: false, mineralCategory: true },
        { id: 'quartz',    label: 'Quartz localities',    pro: false, mineralCategory: true },
        { id: 'silver',    label: 'Silver localities',    pro: false, mineralCategory: true },
        { id: 'marble',    label: 'Marble localities',    pro: false, mineralCategory: true },
        { id: 'fluorspar', label: 'Fluorspar localities', pro: false, mineralCategory: true },
        { id: 'amethyst',  label: 'Amethyst localities',  pro: false, mineralCategory: true },
        { id: 'jasper',    label: 'Jasper localities',    pro: false, mineralCategory: true },
      ],
    },
  ],

  field_sports: [
    {
      id: 'fishing',
      label: 'Fishing',
      layers: [
        { id: 'fishing_rivers',    label: 'Fishing rivers',     pro: false },
        { id: 'salmon_beats',      label: 'Salmon beats',       pro: false },
        { id: 'coarse_lakes',      label: 'Coarse fishing lakes', pro: false },
        { id: 'water_access',      label: 'Water access points', pro: false },
      ],
    },
    {
      id: 'hunting',
      label: 'Hunting',
      layers: [
        { id: 'land_boundaries',  label: 'Public/private land', pro: false },
        { id: 'game_land',        label: 'Game land',           pro: false },
        { id: 'shooting_areas',   label: 'Licensed shooting',   pro: false },
      ],
    },
    {
      id: 'regulations',
      label: 'Regulations',
      layers: [
        { id: 'seasons_calendar', label: 'Seasons calendar', pro: false },
      ],
    },
  ],

  hiking: [
    {
      id: 'trails',
      label: 'Trails',
      layers: [
        { id: 'looped_walks',   label: 'Looped walks',         pro: false },
        { id: 'long_distance',  label: 'Long distance routes', pro: false },
        { id: 'greenways',      label: 'Greenways',            pro: false },
      ],
    },
    {
      id: 'facilities',
      label: 'Facilities',
      layers: [
        { id: 'trailheads',  label: 'Trailheads / car parks', pro: false },
        { id: 'campsites',   label: 'Campsites',              pro: false },
        { id: 'picnic_areas', label: 'Picnic areas',          pro: false },
      ],
    },
    {
      id: 'difficulty',
      label: 'Difficulty',
      layers: [
        { id: 'slope_angle', label: 'Trail slope angle', pro: false },
      ],
    },
  ],

  archaeology: [
    {
      id: 'monuments',
      label: 'Monuments',
      layers: [
        { id: 'recorded_monuments', label: 'Recorded Monuments', pro: false },
        { id: 'ring_forts',         label: 'Ring forts',         pro: false },
        { id: 'standing_stones',    label: 'Standing stones',    pro: false },
        { id: 'megalithic_tombs',   label: 'Megalithic tombs',  pro: false },
        { id: 'holy_wells',         label: 'Holy wells',         pro: false },
      ],
    },
    {
      id: 'historic',
      label: 'Historic',
      layers: [
        { id: 'historic_mines',  label: 'Historic mines',    pro: false },
        { id: 'burial_sites',    label: 'Burial sites',      pro: false },
        { id: 'heritage_trails', label: 'Heritage trails',   pro: false },
      ],
    },
    {
      id: 'protected',
      label: 'Protected',
      layers: [
        { id: 'aca', label: 'Architectural Conservation Areas', pro: false },
      ],
    },
  ],

  coastal: [
    {
      id: 'access',
      label: 'Access',
      layers: [
        { id: 'beach_access',  label: 'Beach access points', pro: false },
        { id: 'foreshore',     label: 'Foreshore zones',     pro: false },
        { id: 'boat_ramps',    label: 'Boat ramps',          pro: false },
        { id: 'coastal_walks', label: 'Coastal walks',       pro: false },
      ],
    },
    {
      id: 'discovery',
      label: 'Discovery',
      layers: [
        { id: 'rock_pooling', label: 'Rock pooling sites',        pro: false },
        { id: 'fossils',      label: 'Fossil locations',          pro: false },
        { id: 'sea_glass',    label: 'Sea glass / mineral beaches', pro: false },
      ],
    },
    {
      id: 'safety',
      label: 'Safety',
      layers: [
        { id: 'tidal', label: 'Tidal information', pro: false },
      ],
    },
  ],
}
