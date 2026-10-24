// Custom events for Plausible (cookieless analytics; see docs/analytics.md
// for the list, which are also its goals). A no-op where the script is not
// loaded: in development, and on the admin dashboard.
export function track(event, props) {
  try {
    if (typeof window.plausible === 'function') {
      window.plausible(event, props ? { props } : undefined);
    }
  } catch {
    // Analytics must never break the page.
  }
}

// The same, then waits until Plausible has sent it (at most `ms`): for an
// event fired just before the page goes elsewhere.
export function trackThen(event, props, ms = 300) {
  return new Promise((resolve) => {
    const done = () => resolve();
    const timer = setTimeout(done, ms);
    try {
      if (typeof window.plausible === 'function' && window.plausible.q === undefined) {
        window.plausible(event, {
          ...(props ? { props } : {}),
          callback: () => {
            clearTimeout(timer);
            done();
          },
        });
        return;
      }
      track(event, props);
    } catch {
      // Never block the page on analytics.
    }
  });
}
