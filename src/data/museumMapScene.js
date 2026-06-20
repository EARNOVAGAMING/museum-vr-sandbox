// Pure, deterministic geometry spec for the Museum 3D Map renderer. Takes one
// level from the museum-map-model and returns plain data — wall segments (with
// doorway gaps removed), resolved object footprints, surface colours, bounds —
// with NO three.js and NO randomness, so the public viewer and the tenant
// editor always build the identical scene. The canvas turns this into meshes.

import {
  OBJECT_DEFAULTS,
  WALL_COLOR_BY_STYLE,
  FLOOR_COLOR_BY_STYLE,
  WALL_TEXTURE_KEY,
  FLOOR_TEXTURE_KEY,
  OBJECT_SIZE_SCALE,
} from "./museumMapModel";

const EPS = 1e-6;

function len(ax, az, bx, bz) {
  return Math.hypot(bx - ax, bz - az);
}

// Split a wall into solid sub-segments, carving out each opening. Openings are
// {at: 0..1 along the segment, width: metres}. Returns segments as
// {a:{x,z}, b:{x,z}, height} — door gaps become empty space (full-height).
export function splitWall(wall, defaultHeight) {
  const { a, b } = wall;
  const height = wall.height != null ? wall.height : defaultHeight;
  const total = len(a.x, a.z, b.x, b.z);
  if (total < EPS) return [];
  const ux = (b.x - a.x) / total;
  const uz = (b.z - a.z) / total;

  // Build [start,end] keep-ranges (in metres along the wall) by removing gaps.
  const gaps = (wall.openings || [])
    .map((o) => {
      const center = Math.max(0, Math.min(1, Number(o.at) || 0)) * total;
      const half = (Number(o.width) || 1) / 2;
      return [Math.max(0, center - half), Math.min(total, center + half)];
    })
    .sort((p, q) => p[0] - q[0]);

  const segments = [];
  let cursor = 0;
  for (const [gStart, gEnd] of gaps) {
    if (gStart > cursor + EPS) {
      segments.push([cursor, gStart]);
    }
    cursor = Math.max(cursor, gEnd);
  }
  if (cursor < total - EPS) segments.push([cursor, total]);

  return segments.map(([s, e]) => ({
    a: { x: a.x + ux * s, z: a.z + uz * s },
    b: { x: a.x + ux * e, z: a.z + uz * e },
    height,
  }));
}

// Resolve an object's footprint (w,h,d) from its explicit size or the type
// default, and its base Y. Wall-mounted types keep a shallow depth. Explicit
// sizes are already at layout scale (scaled in the model); type DEFAULTS get the
// gentle OBJECT_SIZE_SCALE here so default-sized exhibits aren't dwarfed by the
// enlarged rooms.
export function resolveObjectSize(object) {
  const d = OBJECT_DEFAULTS[object.type] || { w: 1, h: 1, d: 0.4, y: 0 };
  const w = Number(object.size?.w) || (d.w || 1) * OBJECT_SIZE_SCALE;
  const h = Number(object.size?.h) || (d.h || 1) * OBJECT_SIZE_SCALE;
  const depth = Number(object.size?.d) || (d.d || 0.15) * OBJECT_SIZE_SCALE;
  return { w, h, d: depth, baseY: d.y || 0 };
}

// Axis-aligned bounds of the footprint polygon, plus a centre and the larger
// half-extent, used to frame the orbit camera and clamp first-person walking.
export function levelBounds(level) {
  const pts = level.footprint || [];
  if (!pts.length) return { minX: -5, maxX: 5, minZ: -5, maxZ: 5, cx: 0, cz: 0, halfMax: 5 };
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const p of pts) {
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
    minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z);
  }
  const cx = (minX + maxX) / 2;
  const cz = (minZ + maxZ) / 2;
  const halfMax = Math.max(maxX - minX, maxZ - minZ) / 2;
  return { minX, maxX, minZ, maxZ, cx, cz, halfMax };
}

// Even-odd point-in-polygon test (plan coords) — used to keep the first-person
// camera inside the real footprint, including the angled walls.
export function pointInFootprint(footprint, x, z) {
  let inside = false;
  for (let i = 0, j = footprint.length - 1; i < footprint.length; j = i++) {
    const xi = footprint[i].x, zi = footprint[i].z;
    const xj = footprint[j].x, zj = footprint[j].z;
    const intersect = zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi + EPS) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function buildLevelSpec(level) {
  const height = level.height || 3;
  const wallColor = WALL_COLOR_BY_STYLE[level.wallStyle] || WALL_COLOR_BY_STYLE.dark_museum_wall;
  const floorColor = FLOOR_COLOR_BY_STYLE[level.floorStyle] || FLOOR_COLOR_BY_STYLE.warm_wood_floor;

  const wallSegments = (level.walls || []).flatMap((w) => splitWall(w, height));

  const objects = (level.objects || []).map((object) => ({
    ...object,
    resolved: resolveObjectSize(object),
  }));

  return {
    id: level.id,
    name: level.name,
    blueprintLabel: level.blueprintLabel,
    footprint: level.footprint || [],
    height,
    ridgeHeight: level.ridgeHeight || null,
    wallColor,
    floorColor,
    wallStyle: level.wallStyle,
    floorStyle: level.floorStyle,
    wallTextureKey: WALL_TEXTURE_KEY[level.wallStyle] || null,
    floorTextureKey: FLOOR_TEXTURE_KEY[level.floorStyle] || null,
    mood: level.mood || { ambient: 0.45, accent: "#e7c789", background: "#080808" },
    spawn: level.spawn || { x: 0, z: 0, rotationY: 0 },
    bounds: levelBounds(level),
    wallSegments,
    zones: level.zones || [],
    objects,
    lights: level.lights || [],   // cinematic fixtures (ceiling spots, uplights)
    wallRoughness: level.wallRoughness,
    floorRoughness: level.floorRoughness,
  };
}
