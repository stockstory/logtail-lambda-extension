import { subscribeTelemetry, SubscriptionBody } from '~/aws/subscribe';
import fetchMock from 'jest-fetch-mock';
import { Request } from 'node-fetch';
import { either as E } from 'fp-ts';

describe('test AWS Extension Telemetry', () => {
  beforeEach(() => {
    fetchMock.resetMocks();
  });

  const baseUrl = 'http://127.0.0.1:9001/2020-01-01';
  const extensionId = 'd4ed7843-08cb-45eb-9866-526f1a58bb52';

  test('telemetry subscription succeeds with 200', async () => {
    fetchMock.mockIf(
      (request: Request) =>
        request.url === `${baseUrl}/telemetry` && request.headers.get('Lambda-Extension-Identifier') === extensionId,
      JSON.stringify({ message: 'ok' }),
      { status: 200 },
    );

    const result = await subscribeTelemetry('http://127.0.0.1:9001/2020-01-01', extensionId, <SubscriptionBody>{
      schemaVersion: '2020-01-01',
      destination: {
        protocol: 'HTTP',
        URI: `http://test:1234`,
      },
      types: ['function'],
      buffering: {
        timeoutMs: 1,
        maxBytes: 1,
        maxItems: 1,
      },
    })();

    expect(E.isRight(result)).toBeTruthy();
  });

  test('telemetry subscription should throw on non-200', async () => {
    fetchMock.mockIf(
      (request: Request) =>
        request.url === `${baseUrl}/telemetry` && request.headers.get('Lambda-Extension-Identifier') === extensionId,
      JSON.stringify({ message: 'ok' }),
      { status: 202 },
    );

    const result = await subscribeTelemetry('http://127.0.0.1:9001/2020-01-01', extensionId, <SubscriptionBody>{
      schemaVersion: '2020-01-01',
      destination: {
        protocol: 'HTTP',
        URI: `http://test:1234`,
      },
      types: ['function'],
      buffering: {
        timeoutMs: 1,
        maxBytes: 1,
        maxItems: 1,
      },
    })();

    expect(E.isLeft(result)).toBeTruthy();
  });
});
