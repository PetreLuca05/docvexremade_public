import { useEffect, useMemo, useRef, useState } from 'react';
import { geoNaturalEarth1, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import { countryName } from './countries.js';

// The dashboard's audience map: the world by country, shaded gold by
// visitors. Clicking a country zooms into it and shows its regions (counties,
// states, provinces), shaded by their own visitors; Esc, the back button or a
// click on the sea zooms out. Map data: Natural Earth (public domain),
// prepared into public/geo/ (world.json, regions/<code>.json; see
// docs/analytics.md). Loaded only by the dashboard.

const W = 1000;
const H = 520;
const projection = geoNaturalEarth1();
const path = geoPath(projection);

let worldPromise = null;
function loadWorld() {
  worldPromise ??= fetch('/geo/world.json')
    .then((r) => r.json())
    .then((topo) => {
      const fc = feature(topo, topo.objects[Object.keys(topo.objects)[0]]);
      projection.fitExtent(
        [
          [4, 4],
          [W - 4, H - 4],
        ],
        fc,
      );
      return fc.features.map((f) => ({ code: String(f.id), feature: f, d: path(f) }));
    });
  return worldPromise;
}

const regionCache = new Map();
function loadRegions(code) {
  if (!regionCache.has(code)) {
    regionCache.set(
      code,
      fetch(`/geo/regions/${code}.json`)
        .then((r) => (r.ok ? r.json() : null))
        .then((topo) =>
          topo
            ? feature(topo, topo.objects[Object.keys(topo.objects)[0]]).features.map((f) => ({
                code: f.properties.code,
                name: f.properties.name,
                group: f.properties.group,
                d: path(f),
              }))
            : [],
        )
        .catch(() => []),
    );
  }
  return regionCache.get(code);
}

// Where to zoom: the country's main land (its polygons at least a quarter
// the size of the largest), so overseas islands don't shrink it to a dot.
function frameOf(f) {
  const polys =
    f.geometry.type === 'MultiPolygon'
      ? f.geometry.coordinates.map((c) => ({ type: 'Polygon', coordinates: c }))
      : [f.geometry];
  const sized = polys.map((g) => ({ g, area: path.area(g) }));
  const largest = Math.max(...sized.map((s) => s.area));
  let [[x0, y0], [x1, y1]] = [
    [Infinity, Infinity],
    [-Infinity, -Infinity],
  ];
  for (const { g, area } of sized) {
    if (area < largest / 4) continue;
    const [[a, b], [c, d]] = path.bounds(g);
    x0 = Math.min(x0, a);
    y0 = Math.min(y0, b);
    x1 = Math.max(x1, c);
    y1 = Math.max(y1, d);
  }
  const k = Math.min(40, 0.86 / Math.max((x1 - x0) / W, (y1 - y0) / H));
  return { k, x: W / 2 - k * ((x0 + x1) / 2), y: H / 2 - k * ((y0 + y1) / 2) };
}

const REDUCED =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const HOME = { k: 1, x: 0, y: 0 };

// The view's zoom, eased between frames.
function useZoom(target) {
  const [view, setView] = useState(HOME);
  const current = useRef(HOME);
  useEffect(() => {
    const from = current.current;
    if (REDUCED) {
      current.current = target;
      setView(target);
      return;
    }
    const start = performance.now();
    let frame;
    const step = (now) => {
      const t = Math.min(1, (now - start) / 650);
      const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      // Scale eased in log space, so zooming feels even.
      const k = Math.exp(Math.log(from.k) + (Math.log(target.k) - Math.log(from.k)) * e);
      const next = {
        k,
        x: from.x + (target.x - from.x) * e,
        y: from.y + (target.y - from.y) * e,
      };
      current.current = next;
      setView(next);
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target]);
  return view;
}

const plain = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\b(county|judetul|municipiul|region|province|state)\b/g, '')
    .replace(/[^a-z0-9]/g, '');

const fillFor = (n, max) =>
  n
    ? `color-mix(in srgb, var(--gold) ${18 + Math.round(Math.sqrt(n / max) * 82)}%, rgba(245, 242, 234, 0.07))`
    : undefined;

export default function WorldMap({
  countries,
  selected,
  onSelect,
  regionVisitors,
  regionName,
  focus,
  label,
  backLabel,
  noRegions,
  format,
  lang,
}) {
  const box = useRef(null);
  const [world, setWorld] = useState(null);
  const [regions, setRegions] = useState(null);
  const [hover, setHover] = useState(null);

  useEffect(() => {
    loadWorld().then(setWorld);
  }, []);
  useEffect(() => {
    setRegions(null);
    if (!selected) return;
    let alive = true;
    loadRegions(selected).then((r) => alive && setRegions(r));
    return () => {
      alive = false;
    };
  }, [selected]);
  useEffect(() => {
    if (!selected) return;
    const onKey = (e) => e.key === 'Escape' && onSelect(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected, onSelect]);

  const country = world?.find((c) => c.code === selected) ?? null;
  const target = useMemo(() => (country ? frameOf(country.feature) : HOME), [country]);
  const view = useZoom(target);

  const counts = Object.fromEntries(countries.map((c) => [c.code, c.visitors]));
  const max = Math.max(1, ...countries.map((c) => c.visitors));

  // A region's visitors: by its ISO code, else by its name or the larger
  // region it belongs to (where Plausible counts a coarser level).
  const regionCount = useMemo(() => {
    const byCode = new Map();
    const byName = new Map();
    for (const r of regionVisitors ?? []) {
      byCode.set(r.code, r.visitors);
      byName.set(plain(r.name), r.visitors);
    }
    return (r) =>
      byCode.get(r.code) ?? byName.get(plain(r.name)) ?? byName.get(plain(r.group)) ?? 0;
  }, [regionVisitors]);
  const regionMax = Math.max(1, ...(regions ?? []).map(regionCount));

  function move(e, tip) {
    const rect = box.current.getBoundingClientRect();
    setHover({ ...tip, x: e.clientX - rect.left, y: e.clientY - rect.top });
  }

  if (!world) return <div className="dev-map is-world is-loading" />;
  const zoomed = Boolean(selected);

  return (
    <div
      className={`dev-map is-world ${zoomed ? 'is-zoomed' : ''}`}
      ref={box}
      onMouseLeave={() => setHover(null)}
    >
      {zoomed && (
        <div className="dev-map-bar">
          <button type="button" className="link-button" onClick={() => onSelect(null)}>
            ← {backLabel}
          </button>
          <b>{countryName(selected, lang)}</b>
          {regions && !regions.length && <span className="dev-note">{noRegions}</span>}
        </div>
      )}
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
        {/* The sea: a click on it zooms out. */}
        <rect width={W} height={H} fill="transparent" onClick={() => zoomed && onSelect(null)} />
        <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
          {world
            .filter((c) => !(zoomed && c.code === selected && regions?.length))
            .map((c) => (
              <path
                key={c.code}
                d={c.d}
                data-code={c.code}
                className={[
                  'is-country',
                  (c.code === focus || c.code === hover?.code) && 'is-active',
                  zoomed && c.code !== selected && 'is-dim',
                ]
                  .filter(Boolean)
                  .join(' ')}
                style={{ fill: fillFor(counts[c.code] ?? 0, max) }}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(c.code === selected ? null : c.code);
                }}
                onMouseMove={(e) =>
                  move(e, {
                    code: c.code,
                    name: countryName(c.code, lang),
                    value: counts[c.code] ?? 0,
                  })
                }
              />
            ))}
          {zoomed &&
            regions?.map((r, i) => (
              <path
                key={`${r.code}-${i}`}
                d={r.d}
                className={[
                  'is-region',
                  (r.code === focus || r.code === hover?.code) && 'is-active',
                ]
                  .filter(Boolean)
                  .join(' ')}
                style={{ fill: fillFor(regionCount(r), regionMax) }}
                onMouseMove={(e) =>
                  move(e, {
                    code: r.code,
                    name: regionName(r.code, r.name),
                    value: regionCount(r),
                  })
                }
              />
            ))}
        </g>
      </svg>
      {hover && (
        <div className="dev-map-tip" style={{ left: hover.x, top: hover.y }}>
          <b>{hover.name}</b>
          <span>{format(hover.value)}</span>
        </div>
      )}
    </div>
  );
}
