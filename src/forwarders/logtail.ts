import fetch from 'node-fetch';
import { FunctionLogEvent } from '~/aws/events';
import { function as F, array as A } from 'fp-ts';

export const logtailLogForwarder =
  (token: string, ingestionUrl: string, listener: { logsQueue: FunctionLogEvent[] }) => (): Promise<void> => {
    const logs = listener.logsQueue.splice(0);

    if (logs.length === 0) {
      return Promise.resolve();
    }

    return fetch(ingestionUrl, {
      method: 'POST',
      body: JSON.stringify(
        F.pipe(
          logs,
          A.map((log) => ({
            dt: log.time,
            message: log.record,
          })),
        ),
      ),
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(await response.text());
        }
      })
      .catch((error) => {
        console.error(
          `Error during log forwarding, pushing logs ${logs.length} back onto queue: ${
            error instanceof Error ? error.message : error
          }`,
        );
        listener.logsQueue.unshift(...logs);
      });
  };
