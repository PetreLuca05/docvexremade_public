import { useEffect, useRef, useState } from 'react';
import desk1280 from '../assets/hero/desk-1280.jpg';
import desk1920 from '../assets/hero/desk-1920.jpg';
import handshake1280 from '../assets/hero/handshake-1280.jpg';
import handshake1920 from '../assets/hero/handshake-1920.jpg';
import laptop1280 from '../assets/hero/laptop-1280.jpg';
import laptop1920 from '../assets/hero/laptop-1920.jpg';

const PHOTOS = [
  [desk1280, desk1920],
  [handshake1280, handshake1920],
  [laptop1280, laptop1920],
];

const INTERVAL = 6000;

// Decorative background photos behind the hero, cross-fading in turn: the
// next photo fades in on top of the current one, which stays fully visible
// underneath (so the veil never shows through), and only once it is decoded.
// Paused while the tab is hidden; the photos also scroll slower than the
// page (parallax). With reduced motion the first photo stays, unmoving.
export default function HeroCarousel() {
  const [{ current, previous }, setShown] = useState({ current: 0, previous: null });
  const imgs = useRef([]);
  const box = useRef(null);

  // Parallax: the photos move at a third of the scroll, under the veil and
  // the copy, while the hero is on screen.
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const el = box.current;
    if (!el) return;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const y = window.scrollY;
        if (y > el.offsetHeight) return;
        el.style.setProperty('--parallax', `${(y * 0.35).toFixed(1)}px`);
      });
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', update);
    };
  }, []);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let timer;
    let alive = true;
    let at = 0;
    const tick = () => {
      if (document.hidden) {
        timer = setTimeout(tick, INTERVAL);
        return;
      }
      const next = (at + 1) % PHOTOS.length;
      const img = imgs.current[next];
      (img?.decode?.() ?? Promise.resolve())
        .catch(() => {})
        .then(() => {
          if (!alive) return;
          setShown({ current: next, previous: at });
          at = next;
          timer = setTimeout(tick, INTERVAL);
        });
    };
    timer = setTimeout(tick, INTERVAL);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, []);

  return (
    <div className="hero-photos" ref={box} aria-hidden="true">
      {PHOTOS.map(([small, large], i) => (
        <img
          key={large}
          ref={(el) => (imgs.current[i] = el)}
          className={i === current ? 'is-on' : i === previous ? 'is-prev' : undefined}
          src={large}
          srcSet={`${small} 1280w, ${large} 1920w`}
          sizes="100vw"
          alt=""
          fetchPriority={i === 0 ? 'high' : 'low'}
        />
      ))}
    </div>
  );
}
