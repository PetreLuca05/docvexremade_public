// Every public page (all but the admin dashboard, dev.html): the fonts, served
// from this site like everything else (no request to a third party), the
// stylesheet, and the pages' behaviour.
import '@fontsource-variable/archivo/wdth.css';
import '@fontsource-variable/archivo/wdth-italic.css';
import '@fontsource/cinzel/500.css';
import '@fontsource/cormorant-garamond/500.css';
import '@fontsource/cormorant-garamond/600.css';
import '@fontsource/cormorant-garamond/500-italic.css';
import './site.css';
import './artifact.js';

// The 404 page: count the missing address.
if (document.querySelector('[data-404]')) {
  import('../analytics.js').then(({ track }) => track('404', { path: window.location.pathname }));
}
