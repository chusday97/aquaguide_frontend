import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import posthog from 'posthog-js';
import App from './App.tsx';
import { identifyProductUser, initializeProductAnalytics } from './services/analytics/product-analytics.service.ts';
import './index.css';

const isSyntheticTest = typeof window !== 'undefined' && window.location.search.includes('synthetic_test=1');
const posthogKey = import.meta.env.VITE_POSTHOG_KEY || (isSyntheticTest ? 'phc_synthetic_dummy_key_123' : '');
const posthogHost = import.meta.env.VITE_POSTHOG_HOST || 'https://app.posthog.com';

if (posthogKey) {
  posthog.init(posthogKey, {
    api_host: posthogHost,
    autocapture: false,
    capture_pageview: false,
    loaded: (ph) => {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('synthetic_test') === '1') {
        ph.register({
          is_synthetic: true,
          traffic_type: 'synthetic',
          test_run_id: urlParams.get('test_run_id') || 'local_test',
          persona_id: urlParams.get('persona_id') || 'unknown',
          scenario_id: urlParams.get('scenario_id') || 'unknown',
          test_version: urlParams.get('test_version') || '1.0.0',
        });
      }
    }
  });
}

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
