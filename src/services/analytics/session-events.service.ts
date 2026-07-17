import posthog from 'posthog-js';

export type AquaGuideEventName =
  | 'favorite_page_view'
  | 'mini_result_generated'
  | 'mini_open_full'
  | 'daily_check_started'
  | 'daily_check_completed'
  | 'remedy_article_opened';

export type AquaGuideEvent = {
  name: AquaGuideEventName;
  action: string;
  status?: string;
  entry?: string;
  occurredAt: string;
};

const sessionEvents: AquaGuideEvent[] = [];

export const trackSessionEvent = (
  name: AquaGuideEventName,
  properties: { action: string; status?: string; entry?: string },
) => {
  const event: AquaGuideEvent = {
    name,
    action: String(properties.action || '').slice(0, 80),
    status: properties.status ? String(properties.status).slice(0, 40) : undefined,
    entry: properties.entry ? String(properties.entry).slice(0, 40) : undefined,
    occurredAt: new Date().toISOString(),
  };
  sessionEvents.push(event);

  try {
    posthog.capture(name, {
      action: event.action,
      status: event.status,
      entry: event.entry,
    });
  } catch (err) {
    // Ignore posthog tracking failures in case it's not initialized
  }

  return event;
};

export const getSessionEvents = () => sessionEvents.map(event => ({ ...event }));

export const resetSessionEvents = () => {
  sessionEvents.splice(0, sessionEvents.length);
};
