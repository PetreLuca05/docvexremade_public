import { useEffect, useState } from 'react';
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

// Decorative background photos behind the hero, cross-fading in turn. With
// reduced motion the first photo stays put.
export default function HeroCarousel() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => setCurrent((i) => (i + 1) % PHOTOS.length), INTERVAL);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="hero-photos" aria-hidden="true">
      {PHOTOS.map(([small, large], i) => (
        <img
          key={large}
          className={i === current ? 'is-on' : undefined}
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
