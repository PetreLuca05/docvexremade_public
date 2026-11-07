import { useEffect } from 'react';

// Keeps the page's <title> and meta description. `meta` is { title, description }.
export function useMeta({ title, description }) {
  useEffect(() => {
    document.title = title;
    document.querySelector('meta[name="description"]')?.setAttribute('content', description);
  }, [title, description]);
}
