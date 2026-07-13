import assert from 'node:assert/strict';
import { getSessionEvents, resetSessionEvents, trackSessionEvent } from '../src/services/analytics/session-events.service';

resetSessionEvents();
const unsafeInput = {
  action: 'complete',
  status: 'watch',
  entry: 'aquarium',
  userDescription: '这里不应被记录',
  answers: { odor: '明显异味' },
};
trackSessionEvent('daily_check_completed', unsafeInput);
const events = getSessionEvents();
assert.equal(events.length, 1);
assert.deepEqual(Object.keys(events[0]).sort(), ['action', 'entry', 'name', 'occurredAt', 'status']);
assert.equal(JSON.stringify(events).includes('这里不应被记录'), false);
assert.equal(JSON.stringify(events).includes('明显异味'), false);
resetSessionEvents();
assert.equal(getSessionEvents().length, 0);

console.log('session events: allowlist and memory-only reset passed');
