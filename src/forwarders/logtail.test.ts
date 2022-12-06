import fetchMock from 'jest-fetch-mock';
import { Request } from 'node-fetch';
import { either as E } from 'fp-ts';
import { logtailLogForwarder } from '~/forwarders/logtail';
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
