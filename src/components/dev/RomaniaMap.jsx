import { useRef, useState } from 'react';
import { PATHS, VIEWBOX } from './romania.js';
import { COUNTIES } from './counties.js';

// The dashboard's audience map: Romania's counties, shaded gold by their
// visitors, with the county and its count under the pointer. `focus` (a
// county code) highlights that county. Loaded only by the dashboard.
export default function RomaniaMap({ regions, focus, label, format }) {
  const box = useRef(null);
  const [hover, setHover] = useState(null);
  const counts = Object.fromEntries(regions.map((r) => [r.code, r.visitors]));
  const max = Math.max(1, ...regions.map((r) => r.visitors));
  const isActive = (code) => Number(code === focus || code === hover?.code);

  function move(e, code) {
    const rect = box.current.getBoundingClientRect();
    setHover({ code, x: e.clientX - rect.left, y: e.clientY - rect.top });
  }

  return (
    <div className="dev-map" ref={box} onMouseLeave={() => setHover(null)}>
      <svg viewBox={VIEWBOX} role="img" aria-label={label}>
        {Object.entries(PATHS)
          // The highlighted county last, so its outline is not covered.
          .sort(([a], [b]) => isActive(a) - isActive(b))
          .map(([code, path]) => {
            const n = counts[code] ?? 0;
            // A square root, so a few visitors still show against many.
            const share = n ? 18 + Math.round(Math.sqrt(n / max) * 82) : 0;
            return (
              <path
                key={code}
                d={path}
                className={isActive(code) ? 'is-active' : undefined}
                style={{
                  fill: n
                    ? `color-mix(in srgb, var(--gold) ${share}%, rgba(245, 242, 234, 0.07))`
                    : undefined,
                }}
                onMouseMove={(e) => move(e, code)}
              />
            );
          })}
      </svg>
      {hover && (
        <div className="dev-map-tip" style={{ left: hover.x, top: hover.y }}>
          <b>{COUNTIES[hover.code]}</b>
          <span>{format(counts[hover.code] ?? 0)}</span>
        </div>
      )}
    </div>
  );
}
