import fetch from 'node-fetch';
import { FunctionLogEvent } from '~/aws/events';
import { function as F, array as A, either as E } from 'fp-ts';
import { z } from 'zod';

// @see https://awslabs.github.io/aws-lambda-powertools-typescript/latest/core/logger/#standard-structured-keys
export const powertoolsLogSchema = z
  .object({
    level: z.string(), // Logging level set for the Lambda function's invocation
    message: z.string(), // A descriptive, human-readable representation of this log item
    timestamp: z.string(), // Timestamp string in simplified extended ISO format (ISO 8601)
    service: z.string(), // A unique name identifier of the service this Lambda function belongs to, by default service_undefined
    xray_trace_id: z.string().optional(), // X-Ray Trace ID. Always present in Lambda environment, but not sent locally.
    sampling_rate: z.number().optional(), // When enabled, it prints all the logs of a percentage of invocations, e.g. 10%
    error: z.string().optional(), // Optional - An object containing information about the Error passed to the logger
  })
  .passthrough();

export type PowertoolsLogRecord = z.infer<typeof powertoolsLogSchema>;

export const parseMessageWithPowertoolsLogFormat = (message: string): E.Either<Error, PowertoolsLogRecord> =>
  F.pipe(
    E.tryCatch(
      (): unknown => JSON.parse(message),
      (reason) => new Error(`String is not JSON: ${reason}`),
    ),
    E.chain((entry) => {
      const result = powertoolsLogSchema.safeParse(entry);

      if (result.success) {
        return E.right(result.data);
      } else {
        return E.left(new Error(`Message is not in lambda powertools format`));
      }
    }),
  );

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
          A.map((log) =>
            F.pipe(
              log.record,
              parseMessageWithPowertoolsLogFormat,
              E.fold(
                () => ({
                  dt: log.time,
                  message: log.record,
                }),
                ({ message, ...data }) => ({
                  dt: log.time,
                  message,
                  data,
                }),
              ),
            ),
          ),
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
