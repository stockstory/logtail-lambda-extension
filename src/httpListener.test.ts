import fetchMock from 'jest-fetch-mock';
import { taskEither as TE, function as F } from 'fp-ts';
import { startTelemetryHttpListener, TelemetryHttpListener } from '~/httpListener';
import fetch from 'node-fetch';

const EXTENSION_NAME = 'test-extension';
const serverEndpoint = new URL('http://localhost:9324');

const startServer = () =>
  F.pipe(
    startTelemetryHttpListener(EXTENSION_NAME, serverEndpoint.hostname, Number(serverEndpoint.port)),
    TE.mapLeft((error) => {
      throw error;
    }),
    TE.toUnion,
  )();

describe('test http logs listener', () => {
  let listener: TelemetryHttpListener;

  beforeAll(async () => {
    listener = await startServer();
    fetchMock.disableMocks();
    fetchMock.dontMock();
  });

  afterAll((done) => {
    fetchMock.enableMocks();
    fetchMock.mockReset();
    listener.server.close(done);
  });

  afterEach(() => {
    listener.logsQueue.splice(0);
  });

  test('http server should receive logs', async () => {
    const response = await fetch('http://localhost:9324', {
      method: 'POST',
      body: JSON.stringify([
        {
          type: 'function',
          time: '2022-10-12T00:03:50.000Z',
          record: '[INFO] Hello world, I am a function!',
        },
      ]),
    });

    expect(response.status).toBe(200);
    expect(listener.logsQueue.length).toBe(1);
  });

  test('http server should return status 400 on malformed logs', async () => {
    const response = await fetch('http://localhost:9324', {
      method: 'POST',
      body: JSON.stringify([
        {
          type: 'function',
          time: '2022-664333',
          record: 1,
        },
      ]),
    });

    expect(response.status).toBe(400);
    expect(listener.logsQueue.length).toBe(0);
  });
});
