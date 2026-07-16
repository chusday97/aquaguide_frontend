import assert from 'node:assert/strict';
import {
  __resetProductAnalyticsForTests,
  __setProductAnalyticsLoaderForTests,
  captureProductEvent,
  captureProductException,
  identifyProductUser,
  initializeProductAnalytics,
} from '../src/services/analytics/product-analytics.service';

type RecordedOperation =
  | ['init', string, string]
  | ['capture', string, Record<string, unknown> | undefined]
  | ['exception', string]
  | ['identify', string];

const createClient = (operations: RecordedOperation[]) => ({
  init: (key: string, options: { api_host: string }) => operations.push(['init', key, options.api_host]),
  capture: (eventName: string, properties?: Record<string, unknown>) => operations.push(['capture', eventName, properties]),
  captureException: (error: Error) => operations.push(['exception', error.message]),
  identify: (userId: string) => operations.push(['identify', userId]),
});

const run = async () => {
  {
    const operations: RecordedOperation[] = [];
    __resetProductAnalyticsForTests();
    __setProductAnalyticsLoaderForTests(async () => createClient(operations));

    identifyProductUser('user-1');
    captureProductEvent('user_signed_in', { method: 'email' });
    captureProductException(new Error('render failed'));
    await initializeProductAnalytics({ key: 'test-key', host: 'https://analytics.test' });

    assert.deepEqual(operations, [
      ['init', 'test-key', 'https://analytics.test'],
      ['identify', 'user-1'],
      ['capture', 'user_signed_in', { method: 'email' }],
      ['exception', 'render failed'],
    ]);
  }

  {
    let loads = 0;
    __resetProductAnalyticsForTests();
    __setProductAnalyticsLoaderForTests(async () => {
      loads += 1;
      return createClient([]);
    });
    captureProductEvent('ignored_before_configuration');
    await initializeProductAnalytics({});
    captureProductEvent('ignored_after_configuration');
    assert.equal(loads, 0, 'missing configuration must not load PostHog');
  }

  {
    __resetProductAnalyticsForTests();
    __setProductAnalyticsLoaderForTests(async () => {
      throw new Error('network unavailable');
    });
    captureProductEvent('queued_before_failure');
    await assert.doesNotReject(initializeProductAnalytics({ key: 'test-key', host: 'https://analytics.test' }));
    assert.doesNotThrow(() => captureProductEvent('ignored_after_failure'));
  }

  {
    __resetProductAnalyticsForTests();
    __setProductAnalyticsLoaderForTests(async () => ({
      init: () => undefined,
      capture: () => { throw new Error('SDK capture failure'); },
      captureException: () => { throw new Error('SDK exception failure'); },
      identify: () => { throw new Error('SDK identify failure'); },
    }));
    await initializeProductAnalytics({ key: 'test-key', host: 'https://analytics.test' });
    assert.doesNotThrow(() => captureProductEvent('product_action_completed'));
    assert.doesNotThrow(() => captureProductException(new Error('render failure')));
    assert.doesNotThrow(() => identifyProductUser('user-2'));
  }

  {
    const operations: RecordedOperation[] = [];
    __resetProductAnalyticsForTests();
    __setProductAnalyticsLoaderForTests(async () => createClient(operations));
    for (let index = 0; index < 100; index += 1) {
      captureProductEvent(`event-${index}`);
    }
    identifyProductUser('priority-user');
    captureProductException(new Error('priority-error'));
    await initializeProductAnalytics({ key: 'test-key', host: 'https://analytics.test' });

    assert.equal(operations.length, 101, 'init plus a bounded queue of 100 operations should be flushed');
    assert(operations.some(operation => operation[0] === 'identify' && operation[1] === 'priority-user'));
    assert(operations.some(operation => operation[0] === 'exception' && operation[1] === 'priority-error'));
    assert(!operations.some(operation => operation[0] === 'capture' && operation[1] === 'event-0'));
    assert(!operations.some(operation => operation[0] === 'capture' && operation[1] === 'event-1'));
  }

  console.log('Product analytics boundary: 5 scenarios passed.');
};

await run();
