import EventEmitter from 'events';

export interface AbortHandler {
  abort: () => void;
  signal: AbortSignal;
}

export const createAbortHandler = (emitter: EventEmitter): AbortHandler => {
  const controller = new AbortController();
  const signal = controller.signal;

  const abort = () => {
    if (!signal.aborted) {
      controller.abort();
    }
  };

  emitter.on('SIGINT', abort);
  emitter.on('SIGTERM', abort);

  return {
    abort,
    signal,
  };
};
