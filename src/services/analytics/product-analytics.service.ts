type AnalyticsProperties = Record<string, unknown>;

type AnalyticsClient = {
  init: (key: string, options: { api_host: string; defaults: '2026-05-30' }) => unknown;
  capture: (eventName: string, properties?: AnalyticsProperties) => void;
  captureException: (error: Error, properties?: AnalyticsProperties) => void;
  identify: (userId: string) => void;
};

type AnalyticsConfig = {
  key?: string;
  host?: string;
};

type QueuedOperation =
  | { kind: 'capture'; eventName: string; properties?: AnalyticsProperties }
  | { kind: 'exception'; error: Error; properties?: AnalyticsProperties }
  | { kind: 'identify'; userId: string };

type AnalyticsLoader = () => Promise<AnalyticsClient>;

const MAX_QUEUE_SIZE = 100;

let client: AnalyticsClient | null = null;
let status: 'idle' | 'loading' | 'ready' | 'disabled' = 'idle';
let initialization: Promise<void> | null = null;
let queue: QueuedOperation[] = [];
let loadAnalyticsClient: AnalyticsLoader = () => import('posthog-js').then(module => module.default);

const execute = (operation: QueuedOperation) => {
  if (!client || status !== 'ready') return;

  try {
    if (operation.kind === 'capture') {
      client.capture(operation.eventName, operation.properties);
    } else if (operation.kind === 'exception') {
      client.captureException(operation.error, operation.properties);
    } else {
      client.identify(operation.userId);
    }
  } catch {
    // Analytics must never become a dependency of a product action.
  }
};

const enqueue = (operation: QueuedOperation) => {
  if (status === 'disabled') return;
  if (status === 'ready') {
    execute(operation);
    return;
  }

  if (operation.kind === 'identify') {
    queue = queue.filter(item => item.kind !== 'identify');
  }

  if (queue.length >= MAX_QUEUE_SIZE) {
    const oldestEventIndex = queue.findIndex(item => item.kind === 'capture');
    if (oldestEventIndex >= 0) {
      queue.splice(oldestEventIndex, 1);
    } else if (operation.kind === 'capture') {
      return;
    } else {
      const oldestExceptionIndex = queue.findIndex(item => item.kind === 'exception');
      queue.splice(oldestExceptionIndex >= 0 ? oldestExceptionIndex : 0, 1);
    }
  }

  queue.push(operation);
};

export const initializeProductAnalytics = (config: AnalyticsConfig) => {
  if (initialization) return initialization;

  if (!config.key || !config.host) {
    status = 'disabled';
    queue = [];
    initialization = Promise.resolve();
    return initialization;
  }

  status = 'loading';
  initialization = loadAnalyticsClient()
    .then(loadedClient => {
      loadedClient.init(config.key!, {
        api_host: config.host!,
        defaults: '2026-05-30',
      });
      client = loadedClient;
      status = 'ready';
      const pending = queue;
      queue = [];
      pending.forEach(execute);
    })
    .catch(() => {
      client = null;
      status = 'disabled';
      queue = [];
    });

  return initialization;
};

export const captureProductEvent = (eventName: string, properties?: AnalyticsProperties) => {
  enqueue({ kind: 'capture', eventName, properties });
};

export const captureProductException = (error: Error, properties?: AnalyticsProperties) => {
  enqueue({ kind: 'exception', error, properties });
};

export const identifyProductUser = (userId: string) => {
  enqueue({ kind: 'identify', userId });
};

export const __setProductAnalyticsLoaderForTests = (loader: AnalyticsLoader) => {
  loadAnalyticsClient = loader;
};

export const __resetProductAnalyticsForTests = () => {
  client = null;
  status = 'idle';
  initialization = null;
  queue = [];
  loadAnalyticsClient = () => import('posthog-js').then(module => module.default);
};
