import { useEffect, useState } from 'react';
import { authConfigured, getSupabase } from './auth.js';

// The Supabase session, following sign-in, sign-out and account updates:
// undefined while it loads, null when signed out.
export function useSession() {
  const [session, setSession] = useState(authConfigured ? undefined : null);
  useEffect(() => {
    if (!authConfigured) return;
    let subscription;
    let alive = true;
    getSupabase().then((supabase) => {
      supabase.auth.getSession().then(({ data }) => alive && setSession(data.session));
      ({ data: { subscription } } = supabase.auth.onAuthStateChange((_event, next) => {
        if (alive) setSession(next);
      }));
    });
    return () => {
      alive = false;
      subscription?.unsubscribe();
    };
  }, []);
  return session;
}
