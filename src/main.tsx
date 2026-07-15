import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import posthog from 'posthog-js';
import { isSupabaseConfigured, supabase } from './lib/supabaseClient.ts';
import App from './App.tsx';
import './index.css';

posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
  api_host: import.meta.env.VITE_POSTHOG_HOST,
  defaults: '2026-05-30',
});

if (isSupabaseConfigured && supabase) {
  supabase.auth.getSession().then(({ data }) => {
    if (data.session?.user) {
      posthog.identify(data.session.user.id);
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
