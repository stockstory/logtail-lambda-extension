import fetch from 'node-fetch';
import { taskEither as TE, function as F, option as O } from 'fp-ts';
import { InvokeEvent, ShutdownEvent } from '~/aws/events';

export const registerExtension = (baseUrl: string, EXTENSION_NAME: string) =>
  F.pipe(
    TE.tryCatch(
      () =>
        fetch(`${baseUrl}/extension/register`, {
          method: 'post',
          body: JSON.stringify({
            events: ['INVOKE', 'SHUTDOWN'],
          }),
          headers: {
            'Content-Type': 'application/json',
            // The extension name must match the file name of the extension itself that's in /opt/extensions/
            'Lambda-Extension-Name': EXTENSION_NAME,
          },
        }).then(async (response) => {
          if (!response.ok) {
            throw new Error(await response.text());
          }
          return response;
        }),
      (error: unknown) =>
        new Error(
          `Failed to register extension via ${baseUrl}/extension/register : ${
            error instanceof Error ? error.message : error
          }`,
        ),
    ),
    TE.chain((response) =>
      F.pipe(
        response.headers.get('lambda-extension-identifier'),
        O.fromNullable,
        TE.fromOption(
          () => new Error(`Failed to retrieve lambda-extension-identifier from registration API response headers`),
        ),
      ),
    ),
  );

export const pollForNextEvent = (extensionId: string, baseUrl: string, signal: AbortSignal) =>
  TE.tryCatch(
    () =>
      fetch(`${baseUrl}/extension/event/next`, {
        signal,
        method: 'get',
        headers: {
          'Content-Type': 'application/json',
          'Lambda-Extension-Identifier': extensionId,
        },
      }).then(async (response): Promise<InvokeEvent | ShutdownEvent> => {
        if (!response.ok) {
          throw new Error(await response.text());
        }
        return (await response.json()) as InvokeEvent | ShutdownEvent;
      }),
    (error) =>
      new Error(
        `Failed to signal for the next event via "${baseUrl}/extension/event/next" ${
          error instanceof Error ? error.message : error
        }`,
      ),
  );
