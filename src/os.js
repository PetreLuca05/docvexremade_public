import { useEffect, useState } from 'react';

// The visitor's operating system, as far as the app is concerned: 'windows',
// 'mac', or null for anything else (Linux, phones, tablets), where the pages
// offer both. Read from the browser alone; nothing is stored or sent.
export const OSES = ['windows', 'mac'];
export const OS_NAMES = { windows: 'Windows', mac: 'macOS' };

function detect() {
  if (typeof navigator === 'undefined') return null;
  const platform = (navigator.userAgentData?.platform || navigator.platform || '').toLowerCase();
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod|android/.test(ua)) return null;
  // iPadOS reports itself as a Mac; a touch screen gives it away.
  if (/mac/.test(platform) || /macintosh/.test(ua)) {
    return navigator.maxTouchPoints > 1 ? null : 'mac';
  }
  if (/win/.test(platform) || /windows/.test(ua)) return 'windows';
  return null;
}

export const CLIENT_OS = detect();

// The system a page shows: the visitor's own (Windows on anything else),
// chosen afresh on every visit. A link can still ask for one with ?os=mac or
// ?os=windows; the address is then cleaned, so a reload goes back to the
// visitor's own. Switching does not touch the address either.
export function useOS() {
  const [os, setOs] = useState(() => {
    const asked = new URLSearchParams(window.location.search).get('os');
    return OSES.includes(asked) ? asked : (CLIENT_OS ?? 'windows');
  });
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.has('os')) {
      url.searchParams.delete('os');
      window.history.replaceState(null, '', url);
    }
  }, []);
  return [os, setOs];
}
