import http from 'http';
import { FunctionLogEvent, functionLogEventSchema } from '~/aws/events';
import { function as F, taskEither as TE, either as E } from 'fp-ts';
import { z } from 'zod';

export const arrayLogsSchema = z.array(functionLogEventSchema);

export interface TelemetryHttpListener {
  logsQueue: FunctionLogEvent[];
  server: http.Server;
}

// HTTP server for the logs subscription
// AWS Lambda Telemetry API will POST the logs to this server
export const startTelemetryHttpListener = (
  EXTENSION_NAME: string,
  address: string,
  port: number,
): TE.TaskEither<Error, { logsQueue: FunctionLogEvent[]; server: http.Server }> =>
  TE.tryCatch(
    () =>
      new Promise((resolve, reject) => {
        const logsQueue: FunctionLogEvent[] = [];

        const server = http.createServer((request, response) => {
          switch (request.method) {
            // Received some logs, let's parse them and push them onto the queue
            case 'POST': {
              let body = '';
              request.on('data', (data) => (body += data));
              request.on('end', () => {
                F.pipe(
                  JSON.parse(body),
                  (data) => arrayLogsSchema.safeParse(data),
                  (parsed) => (parsed.success ? E.right(logsQueue.push(...parsed.data)) : E.left(parsed.error)),
                  E.fold(
                    (error) => {
                      response.writeHead(400);
                      console.error(`[${EXTENSION_NAME}] Error parsing logs: ${error}`);
                    },
                    (count) => {
                      response.writeHead(200);
                      console.log(`[${EXTENSION_NAME}] Pushed ${count} logs onto queue, now ${logsQueue.length}`);
                    },
                  ),
                  () => {
                    response.end();
                  },
                );
              });
              break;
            }
            case 'GET': {
              response.writeHead(200);
              response.end();
              break;
            }
          }
        });

        server.on('error', reject);
        server.listen(port, address, undefined, () => resolve({ logsQueue, server }));
      }),
    (error) => new Error(`Failed to start http logging listener: ${error instanceof Error ? error.message : error}`),
  );
