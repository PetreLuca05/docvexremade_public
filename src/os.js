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

// The system a page shows: ?os=mac / ?os=windows in the address, else the
// visitor's own, else Windows. Changing it updates the address (no reload),
// so a link to the page keeps the choice.
export function useOS() {
  const fromUrl = () => {
    const value = new URLSearchParams(window.location.search).get('os');
    return OSES.includes(value) ? value : null;
  };
  const [os, setOsState] = useState(() => fromUrl() ?? CLIENT_OS ?? 'windows');
  useEffect(() => {
    const onPop = () => setOsState(fromUrl() ?? CLIENT_OS ?? 'windows');
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  function setOs(next) {
    setOsState(next);
    const url = new URL(window.location.href);
    if (next === (CLIENT_OS ?? 'windows')) url.searchParams.delete('os');
    else url.searchParams.set('os', next);
    window.history.replaceState(null, '', url);
  }
  return [os, setOs];
}
