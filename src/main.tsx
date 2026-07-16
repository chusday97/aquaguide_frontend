import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { identifyProductUser, initializeProductAnalytics } from './services/analytics/product-analytics.service.ts';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

void initializeProductAnalytics({
  key: import.meta.env.VITE_POSTHOG_KEY,
  host: import.meta.env.VITE_POSTHOG_HOST,
});

void import('./lib/supabaseClient.ts')
  .then(({ isSupabaseConfigured, supabase }) => {
    if (!isSupabaseConfigured || !supabase) return;
    return supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) identifyProductUser(data.session.user.id);
    });
  })
  .catch(() => {
    // Session identification is non-critical and must not affect rendering.
  });
