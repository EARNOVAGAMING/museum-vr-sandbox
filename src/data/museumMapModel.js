// Museum 3D Map — the canonical 1:1 data model of the *physical* Asian Operatic
// Museum, rendered as a walkable virtual twin. This is SEPARATE from the
// template-driven Experience Builder (three-d-world-*): instead of an abstract
// gallery, every level here is the real floorplan from the architectural
// blueprint (R1B), traced to scale.
//
// Units are METRES. Plan coordinates: +x runs left→right, +z runs back→front
// (the entrance/visitor side is +z, the far/back wall is -z) — exactly how the
// blueprint reads top-to-bottom. The renderer maps plan (x,z) straight to world
// (x,z) with y up, so a top-down view matches the printed plan.
//
// A map is { id, name, scaleNote, levels: [...] }. Each level is a footprint
// POLYGON (so we keep the real angled walls), a set of interior PARTITION walls
// that carve the labelled zones, the ZONES themselves (label + tint), and the
// placed OBJECTS (exhibits, LED panels, vitrines, statues, merch, stairs). The
// pure scene builder (museum-map-scene.js) turns one level into three.js-ready
// geometry; the same data drives the public viewer and the tenant editor.

// Bump this whenever the canonical hand-authored layout (createAomMuseumMap)
// changes, so stored configs saved against an OLDER layout are regenerated from
// the new canonical code instead of being frozen at the old geometry. v3 = the
// reworked L1 entrance (reception platform + flush U-staircase, 1.5x scale).
export const MUSEUM_MAP_VERSION = 3;

// Object kinds the renderer knows how to draw. Kept deliberately small and
// physical (this is a building twin, not the 30-type experience library), but
// each maps onto a clear real-world fixture in the blueprint renders.
export const MUSEUM_MAP_OBJECT_TYPES = [
  { type: "wall_frame", label: "Framed panel / poster", surface: "wall" },
  { type: "led_panel", label: "LED display / screen", surface: "wall" },
  { type: "video_wall", label: "Projection / video wall", surface: "wall" },
  { type: "vitrine", label: "Glass display case", surface: "floor" },
  { type: "plinth", label: "Artefact plinth", surface: "floor" },
  { type: "hologram", label: "Hologram figure", surface: "floor" },
  { type: "mannequin", label: "Costume mannequin", surface: "floor" },
  { type: "merch_shelf", label: "Merch slat-wall shelf", surface: "wall" },
  { type: "desk", label: "Reception / POS counter", surface: "floor" },
  { type: "vr_station", label: "VR / interactive station", surface: "floor" },
  { type: "bench", label: "Bench / seat", surface: "floor" },
  { type: "stairs", label: "Staircase (level link)", surface: "floor" },
  { type: "platform", label: "Raised landing / platform", surface: "floor" },
  { type: "railing", label: "Glass railing / balustrade", surface: "floor" },
  { type: "doorway", label: "Doorway marker", surface: "floor" },
];
export const MUSEUM_MAP_OBJECT_TYPE_SET = new Set(MUSEUM_MAP_OBJECT_TYPES.map((o) => o.type));

// Surface palettes — intentionally aligned with the 3D Museum Engine's look
// (dark museum walls, warm wood floors) so the twin matches the published
// experience. These are the blueprint renders: near-black walls, warm timber.
export const MUSEUM_MAP_WALL_STYLES = [
  { style: "dark_museum_wall", label: "Dark museum wall", color: "#1c1c22" },
  { style: "charcoal_slat_wall", label: "Charcoal slat wall", color: "#26242a" },
  { style: "warm_plaster_wall", label: "Warm plaster", color: "#3a342e" },
  { style: "heritage_timber_wall", label: "Heritage timber", color: "#4a3826" },
  { style: "white_gallery_wall", label: "White gallery", color: "#ece9e2" },
];
export const MUSEUM_MAP_FLOOR_STYLES = [
  { style: "warm_wood_floor", label: "Warm wood", color: "#5a3c24" },
  { style: "dark_wood_floor", label: "Dark walnut", color: "#3f2a1a" },
  { style: "polished_concrete", label: "Polished concrete", color: "#2c2a28" },
  { style: "stone_floor", label: "Stone", color: "#6e6862" },
];
export const WALL_COLOR_BY_STYLE = Object.fromEntries(MUSEUM_MAP_WALL_STYLES.map((s) => [s.style, s.color]));
export const FLOOR_COLOR_BY_STYLE = Object.fromEntries(MUSEUM_MAP_FLOOR_STYLES.map((s) => [s.style, s.color]));

// Map our physical-museum styles onto the 3D Museum Engine's shipped PBR texture
// keys (public/textures via three-d-world-textures.js), so the twin reuses the
// same generated wood/plaster/slat/stone surfaces the published experience uses
// — matching the look of the blueprint renders.
export const WALL_TEXTURE_KEY = {
  dark_museum_wall: "dark_museum_wall",
  charcoal_slat_wall: "timber_wainscot_wall",
  warm_plaster_wall: "fresco_plaster_wall",
  heritage_timber_wall: "carved_teak_wall",
  white_gallery_wall: "white_gallery_wall",
};
export const FLOOR_TEXTURE_KEY = {
  warm_wood_floor: "wood_floor",
  dark_wood_floor: "wood_floor",
  polished_concrete: "polished_gallery_floor",
  stone_floor: "stone_floor",
};

// Layout scaling — the hand-authored blueprint coordinates are at true building
// scale (metres). We render the museum LARGER so it feels spacious to walk while
// staying perfectly proportional to the floor plan (uniform scale preserves the
// shape). Footprint/positions scale most; rooms grow taller modestly; exhibits
// grow least so the extra floor area reads as breathing room, not bigger props.
export const LAYOUT_SCALE = 2.7;        // footprint, wall + object XZ, openings, spawn
export const HEIGHT_SCALE = 1.8;        // wall/ceiling heights + object Y
export const OBJECT_SIZE_SCALE = 1.95;  // exhibit footprints (also applied to type defaults)

// Default vertical placement (metres, object base on floor unless noted) and
// footprint per type, so a freshly added object renders sensibly before it is
// dragged into place.
export const OBJECT_DEFAULTS = {
  wall_frame: { y: 1.5, w: 1.4, h: 1.0 },
  led_panel: { y: 1.55, w: 2.0, h: 1.15 },
  video_wall: { y: 1.6, w: 3.2, h: 1.9 },
  vitrine: { y: 0, w: 1.1, h: 1.7, d: 0.6 },
  plinth: { y: 0, w: 0.6, h: 1.05, d: 0.6 },
  hologram: { y: 0, w: 0.9, h: 1.9, d: 0.9 },
  mannequin: { y: 0, w: 0.55, h: 1.75, d: 0.55 },
  merch_shelf: { y: 1.2, w: 1.6, h: 1.8 },
  desk: { y: 0, w: 1.6, h: 1.05, d: 0.7 },
  vr_station: { y: 0, w: 1.8, h: 0.6, d: 0.7 },
  bench: { y: 0, w: 1.6, h: 0.45, d: 0.5 },
  stairs: { y: 0, w: 1.3, h: 1.2, d: 2.4 },
  platform: { y: 0, w: 2.0, h: 0.45, d: 1.6 },
  railing: { y: 0, w: 1.6, h: 1.0, d: 0.1 },
  doorway: { y: 0, w: 1.1, h: 2.1, d: 0.2 },
};

let _idSeq = 0;
function uid(prefix = "obj") {
  _idSeq += 1;
  return `${prefix}_${_idSeq.toString(36)}`;
}

function obj(type, x, z, extra = {}) {
  const d = OBJECT_DEFAULTS[type] || {};
  return {
    id: extra.id || uid(type),
    type,
    title: extra.title || "",
    zone: extra.zone || "",
    position: { x, y: extra.y ?? d.y ?? 0, z },
    rotationY: extra.rotationY ?? 0, // degrees
    size: extra.size || null, // {w,h,d} override, else type default
    mediaUrl: extra.mediaUrl || "",
    color: extra.color || "",
    locked: !!extra.locked,
    note: extra.note || "",
    linkLevelId: extra.linkLevelId || "", // for stairs/doorway → destination level
  };
}

// A wall segment in plan coords, with optional doorway openings expressed as
// {at: 0..1 fraction of the segment, width: metres}. interior walls default to
// a slightly lower height so the level reads as one connected volume.
function wall(ax, az, bx, bz, openings = [], height = null) {
  return { a: { x: ax, z: az }, b: { x: bx, z: bz }, openings, height };
}

// ---------------------------------------------------------------------------
// LEVEL 01 — ENTRANCE (blueprint envelope 3.27m × 5.52m; inner room 2.70m wide).
// A compact arrival vestibule: welcome LED, reception/POS, the Sang Nila Utama
// hologram, a merch slat-wall, and the staircase up to Level 02.
// ---------------------------------------------------------------------------
function buildLevel01() {
  const W = 3.27;
  const D = 5.52;
  const hx = W / 2; // 1.635
  const hz = D / 2; // 2.76
  const H = 3.0;
  // The unit is NOT a plain rectangle: the upper room is 2700 wide, and the
  // lower-right (the Welcome-LED bay by the entrance) PROTRUDES out to the full
  // 3270 width. So the footprint is an L — the upper-right corner is cut in.
  const mainRightX = hx - 0.57; // = 1.065, the 2700-wide main room's right wall
  const bayZ = hz - 1.85;       // = 0.91, where the lower-right bay protrudes out
  const footprint = [
    { x: -hx, z: -hz },         // NW
    { x: mainRightX, z: -hz },  // NE of the 2700 main room
    { x: mainRightX, z: bayZ }, // down to the bay
    { x: hx, z: bayZ },         // OUT into the protruding Welcome bay
    { x: hx, z: hz },           // SE
    { x: -hx, z: hz },          // SW
  ];
  // Layout from the floorplan's WALKING FLOW (pink arrows) + the video. You enter
  // and the reception faces you. The WELCOME lightbox is CLOSE on the right. The
  // FIRST flight climbs on the LEFT to a back landing; you TURN RIGHT and the
  // SECOND flight climbs back south on the RIGHT, BEHIND the welcome wall, up to
  // Level 02 — an L into a U.
  const RECEP = 0.4;         // reception platform height
  const MIDLAND = 1.5;        // U-stair landing height
  const entranceCenterX = 0.5;
  const entranceAt = (entranceCenterX + hx) / W;
  const welcomeZ = 1.0;      // welcome wall — CLOSE to the entrance, in the bay
  // The reception platform + U-staircase FILL the room flush to the walls (no
  // floor gaps): the platform fills the south-left to the front + left walls; the
  // LEFT flight fills the left half flush to the left wall; the landing spans the
  // back wall; the RIGHT flight fills the right half behind the welcome wall. The
  // central stringer (midX) closes the seam between the two flights.
  const midX = -0.125;
  const stairBackZ = -1.6;   // where the flights meet the back landing
  const stairFrontZ = 0.4;   // where the lower flight meets the reception platform
  const walls = [
    wall(-hx, -hz, mainRightX, -hz),                          // back (main room)
    wall(mainRightX, -hz, mainRightX, bayZ),                  // main-room right wall
    wall(mainRightX, bayZ, hx, bayZ),                         // bay north wall (step-out)
    wall(hx, bayZ, hx, hz),                                   // bay right wall
    wall(hx, hz, -hx, hz, [{ at: 1 - entranceAt, width: 1.1 }]), // front (entrance)
    wall(-hx, hz, -hx, -hz),                                  // left wall
    // WELCOME WALL — close, in the right bay, facing the door. Extended WEST to
    // the RIGHT flight's edge (x -0.1) so it covers the full width of the second-
    // floor stairs behind it — a seamless wall with no gap at the stair edge.
    wall(-0.1, welcomeZ, hx, welcomeZ),
    // Central stringer closing the U-stair's stairwell seam between the flights.
    wall(midX, stairBackZ, midX, stairFrontZ, [], MIDLAND),
  ];
  const zones = [
    { id: "l1_lobby", name: "Entrance — Welcome", tint: "#e7c789", center: { x: 0.7, z: 1.95 } },
    { id: "l1_recep", name: "Reception", tint: "#a0d0ff", center: { x: -1.2, z: 1.85 } },
    { id: "l1_stair", name: "Staircase to Level 02", tint: "#8fb2ff", center: { x: midX, z: -0.7 } },
  ];
  const objects = [
    // WELCOME lightbox — CLOSE ahead in the right bay, on the entrance-facing
    // (south) face of the welcome wall.
    obj("led_panel", 0.75, welcomeZ + 0.12, { y: 0.88, rotationY: 0, color: "#6e4a26", title: "Welcome — Asian Operatic Museum", zone: "l1_lobby", size: { w: 1.3, h: 0.85 } }),
    // Map kiosk — left wall by the entrance (the floorplan screen in the video).
    obj("led_panel", -hx + 0.1, 1.6, { y: 1.05, rotationY: 90, title: "Museum Guide — Map", zone: "l1_recep", size: { w: 0.8, h: 1.5 } }),
    // Reception PLATFORM — raised, FILLING the south-left corner flush to the
    // LEFT and FRONT walls (x[-hx,-0.1], z[+0.35,front]); the LEFT flight rises
    // straight off its north edge.
    obj("platform", -0.8675, 1.555, { title: "Reception", zone: "l1_recep", size: { w: 1.535, h: RECEP, d: 2.41 } }),
    // Steps up onto the platform along its WHOLE EAST edge (FACING THE WELCOME):
    // span the full platform depth so the stepped front blends seamlessly into
    // the platform, flush to the front + back walls.
    obj("stairs", -0.4, 1.555, { rotationY: 90, title: "Steps up to Reception", zone: "l1_recep", size: { w: 2.41, h: RECEP, d: 0.6 } }),
    // Reception desk — against the LEFT wall, ROTATED 90° (faces into the room),
    // a touch shorter, on the platform.
    obj("desk", -hx + 0.32, 1.6, { y: RECEP, rotationY: 90, title: "Reception / POS", zone: "l1_recep", size: { w: 1.1, h: 0.82, d: 0.5 } }),
    // STAIRCASE — L into U, FILLING the room flush to the walls. LEFT flight fills
    // the left half (flush to the left wall), rising FROM the reception platform.
    obj("stairs", -0.8925, -0.6, { y: RECEP, rotationY: 0, title: "Staircase — lower flight (left)", zone: "l1_stair", size: { w: 1.485, h: MIDLAND - RECEP, d: 2.0 } }),
    // …back landing spanning the BACK WALL flush to the side walls (turn RIGHT)…
    obj("platform", -0.285, -2.13, { title: "Stair landing", zone: "l1_stair", size: { w: 2.7, h: MIDLAND, d: 1.26 } }),
    // …RIGHT flight fills the right half (flush to the right wall), climbing back
    // south behind the welcome wall — extended all the way to the WELCOME WALL so
    // the stair top is flush against it (no gap).
    obj("stairs", 0.4825, -0.3, { y: MIDLAND, rotationY: 180, title: "Stairs up to Level 02", zone: "l1_stair", linkLevelId: "level_02", size: { w: 1.165, h: 1.4, d: 2.6 } }),
  ];
  // Cinematic fixtures — recessed warm ceiling spots, a ceiling spot + floor
  // baseboard uplight washing the welcome lightbox, and an entrance pool.
  const lights = [
    { x: 0.85, y: H - 0.22, z: 1.3, color: "#ffd2a0", intensity: 9, range: 3.4 },   // over welcome
    { x: 0.85, y: 0.25, z: welcomeZ + 0.18, color: "#ffc090", intensity: 7, range: 2.4 }, // baseboard glow
    { x: 0.3, y: H - 0.22, z: 2.0, color: "#ffd9a8", intensity: 7, range: 3.4 },   // entrance
    { x: -0.89, y: H - 0.22, z: -0.6, color: "#ffe1b0", intensity: 8, range: 4.2 }, // over left flight
    { x: -0.285, y: H - 0.22, z: -2.0, color: "#ffe1b0", intensity: 8, range: 4.4 }, // over landing
    { x: 0.48, y: H - 0.22, z: -0.3, color: "#ffe1b0", intensity: 8, range: 4.2 }, // over right flight
    { x: -1.0, y: H - 0.3, z: 1.7, color: "#ffe1b0", intensity: 6, range: 3.0 }, // reception
  ];
  return {
    id: "level_01",
    name: "Level 01 — Entrance",
    blueprintLabel: "LEVEL 01, ENTRANCE",
    order: 1,
    footprint,
    height: H,
    ridgeHeight: null,
    wallStyle: "dark_museum_wall",
    floorStyle: "warm_wood_floor",
    wallRoughness: 0.7,   // smooth charcoal walls (video look)
    floorRoughness: 0.4,  // warm wood with a soft sheen
    mood: { ambient: 0.3, accent: "#ffcaa0", background: "#0a0807" },
    // Spawn right at the door, facing up the corridor at the welcome lightbox.
    spawn: { x: entranceCenterX, z: hz - 0.35, rotationY: 180 },
    walls,
    zones,
    objects,
    lights,
  };
}

// ---------------------------------------------------------------------------
// LEVEL 02 — CONJOINED UNITS (envelope 11.745m × ~15.0m, angled bottom-right).
// The main hall: Tactile Studio A, back-of-house (Staff Office + Server), the
// central "Immersive Visual Narratives of the 5 Kings" room (Area B), the King
// 1–5 LED wall (Area C), Areas A & D, and the artefact / costume / hologram
// stations. Stairs arrive from L1 (bottom-left) and rise to L3.
// ---------------------------------------------------------------------------
function buildLevel02() {
  const H = 3.2;
  // Centred footprint with the real angled bottom-right corner (the 3.875m
  // diagonal on the plan). x:[-5.87,5.87], z:[-7.5,7.5].
  const footprint = [
    { x: -5.87, z: -7.5 }, // back-left
    { x: 5.87, z: -7.5 },  // back-right
    { x: 5.87, z: 4.0 },   // right wall down
    { x: 2.6, z: 7.5 },    // angled cut to bottom
    { x: -5.87, z: 7.5 },  // bottom-left
  ];
  const walls = [
    wall(-5.87, -7.5, 5.87, -7.5),  // back
    wall(5.87, -7.5, 5.87, 4.0),    // right
    wall(5.87, 4.0, 2.6, 7.5),      // angled
    wall(2.6, 7.5, -5.87, 7.5, [{ at: 0.62, width: 1.4 }]), // front (entry from stair lobby)
    wall(-5.87, 7.5, -5.87, -7.5),  // left

    // Back-of-house box (Staff Office + Server) — top-left, staff only.
    wall(-5.87, -3.4, -2.0, -3.4, [{ at: 0.82, width: 1.0 }], 2.7), // its front wall w/ a door
    wall(-2.0, -3.4, -2.0, -7.5, [], 2.7),                          // its right wall
    wall(-4.0, -3.4, -4.0, -7.5, [], 2.7),                          // divider: office | server

    // Tactile Studio A — left-centre room.
    wall(-5.87, 1.2, -2.7, 1.2, [{ at: 0.2, width: 1.1 }], 2.8),    // front wall + door
    wall(-2.7, 1.2, -2.7, -3.0, [{ at: 0.5, width: 1.1 }], 2.8),    // right wall + door

    // Area B — central immersive "5 Kings" room (wrap-around projection).
    wall(-1.2, -1.6, 2.7, -1.6, [], 2.9),                           // back of room
    wall(2.7, -1.6, 2.7, 3.0, [], 2.9),                             // right of room
    wall(2.7, 3.0, -1.2, 3.0, [{ at: 0.5, width: 1.6 }], 2.9),      // front w/ wide doorway
    wall(-1.2, 3.0, -1.2, -1.6, [], 2.9),                           // left of room
  ];
  const zones = [
    { id: "l2_staff", name: "Staff Office", tint: "#7c8a99", center: { x: -3.0, z: -5.4 }, staff: true },
    { id: "l2_server", name: "Server Area", tint: "#7c8a99", center: { x: -4.9, z: -5.4 }, staff: true },
    { id: "l2_studio_a", name: "Tactile Studio A", tint: "#8fb2ff", center: { x: -4.2, z: -1.0 } },
    { id: "l2_area_c", name: "Area C — The 5 Kings", tint: "#e7c789", center: { x: 3.6, z: -4.6 } },
    { id: "l2_area_b", name: "Area B — Immersive Narratives", tint: "#ff9d6a", center: { x: 0.75, z: 0.7 } },
    { id: "l2_area_a", name: "Area A", tint: "#a0d0ff", center: { x: -4.4, z: 5.4 } },
    { id: "l2_area_d", name: "Area D — Artefacts & Costumes", tint: "#d0a0ff", center: { x: -0.6, z: 5.4 } },
  ];
  const objects = [
    // Area C: the five King LED portraits along the back (north) wall.
    obj("led_panel", -1.4, -7.5 + 0.16, { title: "Sang Nila Utama", zone: "l2_area_c" }),
    obj("led_panel", 0.9, -7.5 + 0.16, { title: "Sri Wikrama Wira", zone: "l2_area_c" }),
    obj("led_panel", 3.2, -7.5 + 0.16, { title: "Sri Rana Wikrama", zone: "l2_area_c" }),
    obj("led_panel", 5.87 - 0.16, -6.0, { rotationY: -90, title: "Sri Maharaja", zone: "l2_area_c" }),
    obj("led_panel", 5.87 - 0.16, -3.6, { rotationY: -90, title: "Sri Iskandar Shah", zone: "l2_area_c" }),
    obj("plinth", 1.2, -5.6, { title: "Royal regalia", zone: "l2_area_c" }),
    obj("plinth", 3.4, -5.6, { title: "Royal regalia", zone: "l2_area_c" }),

    // Area B: wrap-around projection on three inner walls (the 5-Kings room).
    obj("video_wall", 0.75, -1.6 + 0.14, { title: "Founding of Singapura", zone: "l2_area_b", size: { w: 3.4, h: 2.0 } }),
    obj("video_wall", 2.7 - 0.14, 0.7, { rotationY: -90, title: "Voyage of the Lion", zone: "l2_area_b", size: { w: 3.6, h: 2.0 } }),
    obj("video_wall", -1.2 + 0.14, 0.7, { rotationY: 90, title: "Arrival at Temasek", zone: "l2_area_b", size: { w: 3.6, h: 2.0 } }),

    // Tactile Studio A.
    obj("vr_station", -4.2, -1.0, { title: "Tactile interaction table", zone: "l2_studio_a" }),
    obj("wall_frame", -5.87 + 0.16, -1.0, { rotationY: 90, title: "Studio brief", zone: "l2_studio_a" }),

    // Area D — costumes (mannequins) + artefact vitrines + water hologram.
    obj("mannequin", -2.3, 5.4, { title: "Operatic costume", zone: "l2_area_d" }),
    obj("mannequin", -1.7, 5.4, { title: "Operatic costume", zone: "l2_area_d" }),
    obj("mannequin", -1.1, 5.4, { title: "Operatic costume", zone: "l2_area_d" }),
    obj("vitrine", 0.4, 4.8, { title: "Operatic artefacts", zone: "l2_area_d" }),
    obj("vitrine", 1.6, 4.8, { title: "Tactile operatic costumes", zone: "l2_area_d" }),
    // The two named holograms along the bottom (Sang Nila Utama + Mulan) and the
    // Mulan Hologram Artefacts case between them, per the blueprint.
    obj("hologram", -0.6, 6.5, { title: "Sang Nila Utama Hologram", zone: "l2_area_d" }),
    obj("vitrine", 0.7, 6.6, { title: "Mulan Hologram Artefacts", zone: "l2_area_d" }),
    obj("hologram", 1.8, 6.5, { title: "Mulan Hologram", zone: "l2_area_d" }),
    // "LED Wall: Mulan Storytelling" runs along the angled bottom-right wall
    // (the 3875 diagonal from (5.87,4.0) to (2.6,7.5)), facing into the hall.
    obj("video_wall", 3.95, 5.55, { rotationY: -133, title: "LED Wall — Mulan Storytelling", zone: "l2_area_d", size: { w: 4.0, h: 2.1 } }),

    // Area A — merch + museum guide near the stair lobby.
    obj("merch_shelf", -5.87 + 0.16, 5.2, { rotationY: 90, title: "Merch slat-wall", zone: "l2_area_a" }),
    obj("desk", -4.6, 6.3, { title: "Museum guide", zone: "l2_area_a" }),

    // Stairs: down to L1 and up to L3 (bottom-left lobby).
    obj("stairs", -4.9, 6.6, { rotationY: 0, title: "Stairs down to Level 01", zone: "l2_area_a", linkLevelId: "level_01" }),
    obj("stairs", -3.4, 6.6, { rotationY: 0, title: "Stairs up to Level 03", zone: "l2_area_a", linkLevelId: "level_03" }),
  ];
  return {
    id: "level_02",
    name: "Level 02 — Conjoined Units",
    blueprintLabel: "LEVEL 02, CONJOINED UNITS",
    order: 2,
    footprint,
    height: H,
    ridgeHeight: null,
    wallStyle: "dark_museum_wall",
    floorStyle: "warm_wood_floor",
    mood: { ambient: 0.45, accent: "#e7c789", background: "#080808" },
    spawn: { x: -4.0, z: 6.6, rotationY: 0 }, // arrive at the stair lobby, face in
    walls,
    zones,
    objects,
  };
}

// ---------------------------------------------------------------------------
// LEVEL 03 — CONJOINED ATTICS (envelope ~5.09m × 5.7m, angled right + bottom).
// Pitched attic ceilings. Area E (5-Kings video room), the Sang Nila Utama
// Stand-up VR area, Tactile Studio B (the big angled room), Storage, Merch
// Retail and the Museum Guide. Stairs arrive from L2.
// ---------------------------------------------------------------------------
function buildLevel03() {
  const H = 2.1;        // eaves height
  const RIDGE = 3.3;    // ridge (peak) height for the pitched attic
  const footprint = [
    { x: -2.8, z: -2.85 }, // back-left
    { x: 1.0, z: -2.85 },  // back-right (before top diagonal)
    { x: 2.8, z: -1.1 },   // angled top-right
    { x: 2.8, z: 1.4 },    // right
    { x: 1.1, z: 2.85 },   // angled bottom-right
    { x: -2.8, z: 2.85 },  // bottom-left
  ];
  const walls = [
    wall(-2.8, -2.85, 1.0, -2.85),  // back
    wall(1.0, -2.85, 2.8, -1.1),    // angled top-right
    wall(2.8, -1.1, 2.8, 1.4),      // right
    wall(2.8, 1.4, 1.1, 2.85),      // angled bottom-right
    wall(1.1, 2.85, -2.8, 2.85, [{ at: 0.7, width: 1.2 }]), // front w/ doorway
    wall(-2.8, 2.85, -2.8, -2.85),  // left

    // Tactile Studio B — large angled room on the right.
    wall(0.6, -2.85, 0.6, 2.4, [{ at: 0.25, width: 1.1 }], 1.9), // divider + door

    // Storage — boxed top-right (behind Studio B back).
    wall(0.6, -0.6, 2.8, -0.6, [{ at: 0.85, width: 0.9 }], 1.9),

    // Merch + Guide strip along the back-left.
    wall(-2.8, -1.2, 0.6, -1.2, [{ at: 0.4, width: 1.1 }], 1.9),
  ];
  const zones = [
    { id: "l3_studio_b", name: "Tactile Studio B", tint: "#8fb2ff", center: { x: 1.8, z: 1.1 } },
    { id: "l3_storage", name: "Storage", tint: "#7c8a99", center: { x: 1.9, z: -1.8 }, staff: true },
    { id: "l3_merch", name: "Merch Retail & Guide", tint: "#e7c789", center: { x: -1.1, z: -2.0 } },
    { id: "l3_vr", name: "Sang Nila Utama — Stand-up VR", tint: "#a0d0ff", center: { x: -0.9, z: 0.2 } },
    { id: "l3_area_e", name: "Area E — The 5 Kings", tint: "#ff9d6a", center: { x: -1.0, z: 2.1 } },
  ];
  const objects = [
    // Area E — 5 Kings video room.
    obj("video_wall", -1.0, 2.85 - 0.14, { rotationY: 180, title: "The Five Kings of Singapura", zone: "l3_area_e", size: { w: 3.0, h: 1.8 } }),
    obj("wall_frame", -2.8 + 0.14, 1.9, { rotationY: 90, title: "Lineage of the Kings", zone: "l3_area_e" }),

    // Sang Nila Utama Stand-up VR area — two screens + a low VR bench.
    obj("led_panel", -2.8 + 0.14, -0.2, { rotationY: 90, title: "VR scene — open sea", zone: "l3_vr", size: { w: 1.8, h: 1.05 } }),
    obj("led_panel", -1.4, -1.2 + 0.14, { title: "VR scene — landfall", zone: "l3_vr", size: { w: 1.8, h: 1.05 } }),
    obj("vr_station", -0.9, 0.4, { title: "Stand-up VR headsets", zone: "l3_vr" }),

    // Merch Retail + Museum Guide.
    obj("merch_shelf", -2.8 + 0.14, -2.0, { rotationY: 90, title: "Merch slat-wall", zone: "l3_merch" }),
    obj("desk", -2.0, -2.4, { title: "Museum guide", zone: "l3_merch" }),

    // Tactile Studio B.
    obj("vr_station", 1.8, 1.0, { title: "Tactile interaction table", zone: "l3_studio_b" }),
    obj("wall_frame", 2.6, 0.9, { rotationY: -100, title: "Studio B brief", zone: "l3_studio_b" }),

    // Stairs down to L2 (front-left doorway).
    obj("stairs", -1.9, 2.4, { rotationY: 180, title: "Stairs down to Level 02", zone: "l3_area_e", linkLevelId: "level_02" }),
  ];
  return {
    id: "level_03",
    name: "Level 03 — Conjoined Attics",
    blueprintLabel: "LEVEL 03, CONJOINED ATTICS",
    order: 3,
    footprint,
    height: H,
    ridgeHeight: RIDGE,
    wallStyle: "charcoal_slat_wall",
    floorStyle: "warm_wood_floor",
    mood: { ambient: 0.42, accent: "#e7c789", background: "#070707" },
    spawn: { x: -1.0, z: 2.4, rotationY: 180 },
    walls,
    zones,
    objects,
  };
}

// Uniformly scale one level's geometry. Uniform scaling keeps every proportion
// identical to the blueprint, so the museum reads bigger without drifting from
// the floor plan. Heights and exhibit sizes use gentler factors (see constants).
function scaleLevel(level, s = LAYOUT_SCALE, hs = HEIGHT_SCALE, os = OBJECT_SIZE_SCALE) {
  return {
    ...level,
    height: (level.height || 3) * hs,
    ridgeHeight: level.ridgeHeight ? level.ridgeHeight * hs : null,
    footprint: (level.footprint || []).map((p) => ({ x: p.x * s, z: p.z * s })),
    walls: (level.walls || []).map((w) => ({
      ...w,
      a: { x: w.a.x * s, z: w.a.z * s },
      b: { x: w.b.x * s, z: w.b.z * s },
      height: w.height != null ? w.height * hs : null,
      openings: (w.openings || []).map((o) => ({ ...o, width: (Number(o.width) || 1) * s })),
    })),
    zones: (level.zones || []).map((z) => ({ ...z, center: { x: z.center.x * s, z: z.center.z * s } })),
    objects: (level.objects || []).map((o) => {
      // Stairs + platforms are STRUCTURAL: their plan footprint (w,d) must scale
      // with the layout so flights still reach their landings, while their rise
      // (h) scales as a height. Everything else is an exhibit (gentler scale).
      const struct = o.type === "stairs" || o.type === "platform";
      const sw = struct ? s : os;
      const sh = struct ? hs : os;
      return {
        ...o,
        position: { x: o.position.x * s, y: (o.position.y || 0) * hs, z: o.position.z * s },
        size: o.size
          ? { w: (Number(o.size.w) || 0) * sw, h: (Number(o.size.h) || 0) * sh, ...(o.size.d ? { d: o.size.d * sw } : {}) }
          : o.size,
      };
    }),
    spawn: { x: (level.spawn?.x || 0) * s, z: (level.spawn?.z || 0) * s, rotationY: level.spawn?.rotationY || 0 },
  };
}

// The full canonical map — the physical Asian Operatic Museum, 1:1, rendered at
// the spacious LAYOUT_SCALE.
export function createAomMuseumMap() {
  return {
    id: "aom_physical_twin",
    name: "Asian Operatic Museum — 3D Map",
    scaleNote: "Traced 1:1 from the R1B architectural blueprint (metres), rendered at gallery scale.",
    sourceBlueprint: "3D DESIGN - ASIAN OPERATIC MUSEUM II R1B.pdf",
    levels: [buildLevel01(), buildLevel02(), buildLevel03()].map((l) => scaleLevel(l)),
  };
}

// The persisted config wrapper. The map itself lives under `map`; UI state
// (active level) and provenance live alongside it.
export function createMuseumMapConfig(overrides = {}) {
  return {
    version: MUSEUM_MAP_VERSION,
    enabled: true,
    map: createAomMuseumMap(),
    activeLevelId: "level_01",
    status: "draft",
    updated_at: "",
    ...overrides,
  };
}

// Defensive normaliser used when hydrating from storage: guarantees the shape
// the renderer/editor expect even if an older/partial config was saved. Unknown
// fields are preserved; missing structure falls back to the canonical map.
export function normalizeMuseumMapConfig(config = {}) {
  const base = createMuseumMapConfig();
  // Use the stored map ONLY if it was saved against the CURRENT layout version
  // and has usable levels. A config from an older version (or with no levels) is
  // regenerated from the canonical code, so hand-authored layout/scale changes
  // ship to every tenant instead of being frozen at whatever was saved before.
  const storedUsable =
    Number(config.version) >= MUSEUM_MAP_VERSION &&
    config.map && Array.isArray(config.map.levels) && config.map.levels.length;
  const map = storedUsable ? config.map : base.map;
  const levels = map.levels.map((level) => ({
    ...level,
    footprint: Array.isArray(level.footprint) ? level.footprint : [],
    walls: Array.isArray(level.walls) ? level.walls : [],
    zones: Array.isArray(level.zones) ? level.zones : [],
    objects: Array.isArray(level.objects)
      ? level.objects.map((o) => ({
          ...o,
          position: { x: Number(o.position?.x) || 0, y: Number(o.position?.y) || 0, z: Number(o.position?.z) || 0 },
          rotationY: Number(o.rotationY) || 0,
        }))
      : [],
  }));
  const activeLevelId = levels.some((l) => l.id === config.activeLevelId)
    ? config.activeLevelId
    : levels[0]?.id || "level_01";
  return {
    ...base,
    ...config,
    version: MUSEUM_MAP_VERSION,
    map: { ...base.map, ...map, levels },
    activeLevelId,
  };
}

export function getLevel(config, levelId) {
  return (config?.map?.levels || []).find((l) => l.id === levelId) || config?.map?.levels?.[0] || null;
}

// Immutable update helpers the editor uses — return a fresh config so React
// state + react-query stay predictable.
export function updateObjectInConfig(config, levelId, objectId, patch) {
  return {
    ...config,
    map: {
      ...config.map,
      levels: config.map.levels.map((level) =>
        level.id !== levelId
          ? level
          : {
              ...level,
              objects: level.objects.map((o) => (o.id === objectId ? { ...o, ...patch } : o)),
            }
      ),
    },
  };
}

export function addObjectToConfig(config, levelId, type) {
  const level = getLevel(config, levelId);
  const center = level?.zones?.[0]?.center || { x: 0, z: 0 };
  const newObj = obj(type, Number(center.x) || 0, Number(center.z) || 0, { title: "New object" });
  return {
    updatedConfig: {
      ...config,
      map: {
        ...config.map,
        levels: config.map.levels.map((l) =>
          l.id !== levelId ? l : { ...l, objects: [...l.objects, newObj] }
        ),
      },
    },
    newObjectId: newObj.id,
  };
}

export function removeObjectFromConfig(config, levelId, objectId) {
  return {
    ...config,
    map: {
      ...config.map,
      levels: config.map.levels.map((level) =>
        level.id !== levelId
          ? level
          : { ...level, objects: level.objects.filter((o) => o.id !== objectId) }
      ),
    },
  };
}
