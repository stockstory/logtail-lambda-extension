import EventEmitter from 'events';
import { createAbortHandler } from '~/abortHandler';

describe('test setupAbortHandler`', () => {
  test('abort signal should be triggered on abort()', () => {
    const emitter = new EventEmitter();

    const handler = createAbortHandler(emitter);

    expect(handler.signal.aborted).toStrictEqual(false);
    handler.abort();
    expect(handler.signal.aborted).toStrictEqual(true);
  });

  test('abort signal should be triggered on SIGINT', () => {
    const emitter = new EventEmitter();

    const handler = createAbortHandler(emitter);

    expect(handler.signal.aborted).toStrictEqual(false);
    emitter.emit('SIGINT');
    expect(handler.signal.aborted).toStrictEqual(true);
  });

  test('abort signal should be triggered on SIGTERM', () => {
    const emitter = new EventEmitter();

    const handler = createAbortHandler(emitter);

    expect(handler.signal.aborted).toStrictEqual(false);
    emitter.emit('SIGTERM');
    expect(handler.signal.aborted).toStrictEqual(true);
  });
});
