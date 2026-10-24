import { useEffect, useRef, useState } from 'react';
import createGlobe from 'cobe';
import { CENTROIDS, countryName } from './countries.js';

// The dashboard's globe (cobe, WebGL): a gold marker per country, sized by
// its visitors; it turns slowly, can be dragged, and shows the country and
// its count under the pointer. `focus` (a country code) turns it to face that
// country. Loaded only by the dashboard.
const REDUCED =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// The globe's phi that faces a country (cobe's own location-to-angle formula).
const phiOf = ([, lng]) => Math.PI - ((lng * Math.PI) / 180 - Math.PI / 2);

export default function Globe({ countries, lang, focus, label }) {
  const box = useRef(null);
  const canvas = useRef(null);
  const state = useRef({ phi: 0.4, target: null, drag: null, velocity: 0 });
  const [hover, setHover] = useState(null);

  const max = Math.max(1, ...countries.map((c) => c.visitors));
  const markers = countries
    .filter((c) => CENTROIDS[c.code])
    .map((c) => ({
      location: CENTROIDS[c.code],
      size: 0.03 + 0.09 * Math.sqrt(c.visitors / max),
      id: `c-${c.code}`,
    }));
  const latest = useRef(markers);
  latest.current = markers;

  // The country the globe should turn to.
  useEffect(() => {
    state.current.target = focus && CENTROIDS[focus] ? phiOf(CENTROIDS[focus]) : null;
  }, [focus]);

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    let width = el.offsetWidth;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const globe = createGlobe(el, {
      devicePixelRatio: dpr,
      width: width * dpr,
      height: width * dpr,
      phi: state.current.phi,
      theta: 0.28,
      dark: 1,
      diffuse: 1.4,
      mapSamples: 18000,
      mapBrightness: 5,
      mapBaseBrightness: 0.05,
      baseColor: [0.12, 0.16, 0.26],
      markerColor: [0.9, 0.81, 0.6],
      glowColor: [0.2, 0.25, 0.38],
      markers: latest.current,
      opacity: 0.95,
    });

    let frame = 0;
    const tick = () => {
      const s = state.current;
      if (!s.drag) {
        if (s.target !== null) {
          // Ease the shortest way round to the country asked for.
          let d = (s.target - s.phi) % (Math.PI * 2);
          if (d > Math.PI) d -= Math.PI * 2;
          if (d < -Math.PI) d += Math.PI * 2;
          s.phi += d * 0.08;
        } else if (!REDUCED) {
          s.phi += 0.0025 + s.velocity;
          s.velocity *= 0.94;
        }
      }
      globe.update({
        phi: s.phi,
        markers: latest.current,
        width: width * dpr,
        height: width * dpr,
      });
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    requestAnimationFrame(() => (el.style.opacity = '1'));

    const onResize = () => (width = el.offsetWidth);
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', onResize);
      globe.destroy();
    };
  }, []);

  // Dragging turns it; letting go keeps a little of the spin.
  function onPointerDown(e) {
    state.current.drag = { x: e.clientX, phi: state.current.phi, last: e.clientX };
    state.current.target = null;
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }
  function onPointerUp() {
    state.current.drag = null;
  }

  // The visible marker nearest the pointer (cobe places a 1px anchor element
  // per marker and says through --cobe-visible-<id> whether it faces us).
  function onPointerMove(e) {
    const s = state.current;
    if (s.drag) {
      const dx = e.clientX - s.drag.x;
      s.phi = s.drag.phi + dx / 160;
      s.velocity = (e.clientX - s.drag.last) / 4000;
      s.drag.last = e.clientX;
    }
    const rect = box.current.getBoundingClientRect();
    const root = getComputedStyle(document.documentElement);
    let best = null;
    for (const c of countries) {
      const anchor = box.current.querySelector(`div[style*="--cobe-c-${c.code}"]`);
      if (!anchor || !root.getPropertyValue(`--cobe-visible-c-${c.code}`)) continue;
      const a = anchor.getBoundingClientRect();
      const d = Math.hypot(a.left - e.clientX, a.top - e.clientY);
      if (d < 26 && (!best || d < best.d)) {
        best = {
          d,
          code: c.code,
          visitors: c.visitors,
          x: a.left - rect.left,
          y: a.top - rect.top,
        };
      }
    }
    setHover(best);
  }

  return (
    <div className="dev-globe" ref={box}>
      <canvas
        ref={canvas}
        aria-label={label}
        role="img"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerLeave={() => {
          onPointerUp();
          setHover(null);
        }}
        onPointerMove={onPointerMove}
      />
      {hover && (
        <div className="dev-globe-tip" style={{ left: hover.x, top: hover.y }}>
          <b>{countryName(hover.code, lang)}</b>
          <span>{hover.visitors.toLocaleString(lang)}</span>
        </div>
      )}
    </div>
  );
}
