import fetchMock from 'jest-fetch-mock';
import { Request } from 'node-fetch';
import { either as E } from 'fp-ts';
import { pollForNextEvent, registerExtension } from '~/aws/api';

describe('test AWS Extension registration', () => {
  beforeEach(() => {
    fetchMock.resetMocks();
  });

  const baseUrl = 'http://127.0.0.1:9001/2020-01-01';
  const EXTENSION_NAME = 'test-extension';
  const extensionId = 'd4ed7843-08cb-45eb-9866-526f1a58bb52';

  test('registration succeeds with 200', async () => {
    fetchMock.mockIf(
      (request: Request) =>
        request.url === `${baseUrl}/extension/register` &&
        request.headers.get('Lambda-Extension-Name') === EXTENSION_NAME,
      JSON.stringify({ message: 'ok' }),
      {
        status: 200,
        headers: {
          'lambda-extension-identifier': extensionId,
        },
      },
    );

    const result = await registerExtension('http://127.0.0.1:9001/2020-01-01', EXTENSION_NAME)();

    expect(E.isRight(result)).toBeTruthy();
    expect(result).toStrictEqual({
      _tag: 'Right',
      right: extensionId,
    });
  });

  test('registration should throw if no extension name header is returned', async () => {
    fetchMock.mockIf(
      (request: Request) =>
        request.url === `${baseUrl}/extension/register` &&
        request.headers.get('Lambda-Extension-Name') === EXTENSION_NAME,
      JSON.stringify({ message: 'ok' }),
      {
        status: 200,
      },
    );

    const result = await registerExtension('http://127.0.0.1:9001/2020-01-01', EXTENSION_NAME)();
    expect(E.isLeft(result)).toBeTruthy();
  });
});

describe('test AWS extension next event', () => {
  beforeEach(() => {
    fetchMock.resetMocks();
  });

  const baseUrl = 'http://127.0.0.1:9001/2020-01-01';
  const extensionId = 'd4ed7843-08cb-45eb-9866-526f1a58bb52';

  test('pollForNextEvent should succeed with valid response', async () => {
    fetchMock.mockIf(
      (request: Request) =>
        request.url === `${baseUrl}/extension/event/next` &&
        request.headers.get('Lambda-Extension-Identifier') === extensionId,
      JSON.stringify({
        eventType: 'SHUTDOWN',
        shutdownReason: '',
        deadlineMs: 0,
      }),
      {
        status: 200,
      },
    );

    const controller = new AbortController();

    const result = await pollForNextEvent(extensionId, baseUrl, controller.signal)();
    expect(E.isRight(result)).toBeTruthy();
  });

  test('pollForNextEvent should fail with error response', async () => {
    fetchMock.mockIf(
      (request: Request) =>
        request.url === `${baseUrl}/extension/event/next` &&
        request.headers.get('Lambda-Extension-Identifier') === extensionId,
      JSON.stringify({}),
      {
        status: 500,
      },
    );

    const controller = new AbortController();

    const result = await pollForNextEvent(extensionId, baseUrl, controller.signal)();
    expect(E.isLeft(result)).toBeTruthy();
  });
});
