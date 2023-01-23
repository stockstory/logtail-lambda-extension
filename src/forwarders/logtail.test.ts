import fetchMock from 'jest-fetch-mock';
import { Request } from 'node-fetch';
import { either as E } from 'fp-ts';
import { logtailLogForwarder, parseMessageWithPowertoolsLogFormat } from '~/forwarders/logtail';
import { FunctionLogEvent } from '~/aws/events';

describe('test logtail log forwarding', () => {
  beforeEach(() => {
    fetchMock.resetMocks();
  });

  const ingestionUrl = 'https://in.logtail.com/';
  const token = 'd4ed7843';

  const log: FunctionLogEvent = {
    type: 'function',
    time: new Date('2022-10-12T00:03:50.000Z'),
    record: '[INFO] Hello world, I am a function!',
  };

  test('forwarder should empty logs queue on successful POST', async () => {
    fetchMock.mockIf((request: Request) => request.url === ingestionUrl, JSON.stringify({ message: 'ok' }), {
      status: 200,
    });

    const listener: { logsQueue: FunctionLogEvent[] } = {
      logsQueue: [log, log, log],
    };

    const result = await logtailLogForwarder(token, ingestionUrl, listener)();

    expect(E.left(result)).toBeTruthy();

    expect(fetchMock.mock.calls.length).toBe(1);
    expect(fetchMock.mock.calls[0]?.[0]).toEqual(ingestionUrl);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(fetchMock.mock.calls[0]?.[1]?.body).toEqual(
      JSON.stringify([
        { dt: new Date('2022-10-12T00:03:50.000Z'), message: '[INFO] Hello world, I am a function!' },
        { dt: new Date('2022-10-12T00:03:50.000Z'), message: '[INFO] Hello world, I am a function!' },
        { dt: new Date('2022-10-12T00:03:50.000Z'), message: '[INFO] Hello world, I am a function!' },
      ]),
    );
    expect(listener.logsQueue.length).toBe(0);
  });

  test('forwarder should re-queue logs on failure', async () => {
    fetchMock.mockIf((request: Request) => request.url === ingestionUrl, JSON.stringify({ message: 'bad' }), {
      status: 500,
    });

    const listener: { logsQueue: FunctionLogEvent[] } = {
      logsQueue: [log, log, log],
    };

    const result = await logtailLogForwarder(token, ingestionUrl, listener)();

    expect(E.left(result)).toBeTruthy();

    expect(fetchMock.mock.calls.length).toBe(1);
    expect(fetchMock.mock.calls[0]?.[0]).toEqual(ingestionUrl);
    expect(
      // eslint-disable-next-line
      fetchMock.mock.calls[0]?.[1]?.body,
    ).toEqual(
      JSON.stringify([
        { dt: new Date('2022-10-12T00:03:50.000Z'), message: '[INFO] Hello world, I am a function!' },
        { dt: new Date('2022-10-12T00:03:50.000Z'), message: '[INFO] Hello world, I am a function!' },
        { dt: new Date('2022-10-12T00:03:50.000Z'), message: '[INFO] Hello world, I am a function!' },
      ]),
    );
    expect(listener.logsQueue.length).toBe(3);
  });
});

describe('test parseMessageWithPowertoolsLogFormat`', () => {
  test('should succeed and return parsed result', () => {
    const log = JSON.stringify({
      level: 'INFO',
      message: 'An event occurred',
      service: 'mylambda-dev-doathing',
      timestamp: '2023-01-18T01:28:02.072Z',
      someProperty: 'hello',
      anotherProperty: ['test'],
    });

    const result = parseMessageWithPowertoolsLogFormat(log);

    expect(result).toStrictEqual({
      _tag: 'Right',
      right: {
        level: 'INFO',
        message: 'An event occurred',
        service: 'mylambda-dev-doathing',
        timestamp: '2023-01-18T01:28:02.072Z',
        someProperty: 'hello',
        anotherProperty: ['test'],
      },
    });
  });

  test('should fail when message is not valid', () => {
    const log = JSON.stringify({
      message: 'An event occurred',
      date: '2023-01-18T01:28:02.072Z',
    });
    const result = parseMessageWithPowertoolsLogFormat(log);

    expect(E.isLeft(result)).toStrictEqual(true);
  });
});
