import fetch from 'node-fetch';
import { taskEither as TE, function as F } from 'fp-ts';

export interface SubscriptionBody {
  schemaVersion: string;
  destination: Destination;
  types: ('platform' | 'function' | 'extension')[];
  buffering: Buffering;
}

export interface Buffering {
  timeoutMs: number;
  maxBytes: number;
  maxItems: number;
}

export interface Destination {
  protocol: string;
  URI: string;
}

export const subscribeTelemetry = (baseUrl: string, extensionId: string, subscriptionBody: SubscriptionBody) =>
  F.pipe(
    TE.tryCatch(
      () =>
        fetch(`${baseUrl}/telemetry`, {
          method: 'put',
          body: JSON.stringify(subscriptionBody),
          headers: {
            'Content-Type': 'application/json',
            'Lambda-Extension-Identifier': extensionId,
          },
        }).then(async (response) => {
          const body = await response.text();

          if (!response.ok) {
            throw new Error(body);
          }

          return { status: response.status, body };
        }),
      (error) => new Error(`Failed subscribing to lambda telemetry: ${error instanceof Error ? error.message : error}`),
    ),
    TE.chain(
      TE.fromPredicate(
        ({ status }) => status === 200,
        ({ status, body }) =>
          new Error(
            `Failed subscribing to lambda telemetry, API "${baseUrl}/telemetry" responded with statusCode: ${status}, body: ${body}`,
          ),
      ),
    ),
  );
