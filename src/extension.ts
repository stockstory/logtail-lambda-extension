import { function as F, taskEither as TE } from 'fp-ts';
import { EnvironmentVars } from '~/env';
import { pollForNextEvent, registerExtension } from '~/aws/api';
import { startTelemetryHttpListener } from '~/httpListener';
import { subscribeTelemetry, SubscriptionBody } from '~/aws/subscribe';
import { logtailLogForwarder } from '~/forwarders/logtail';
import { AbortHandler } from '~/abortHandler';

// noinspection HttpUrlsUsage
export const createExtension = (
  abortHandler: AbortHandler,
  env: EnvironmentVars,
): TE.TaskEither<Error, TE.TaskEither<Error, void>> =>
  F.pipe(
    {
      ...env,
      extensionBaseUrl: `http://${env.AWS_LAMBDA_RUNTIME_API}/${env.AWS_LAMBDA_RUNTIME_EXTENSION_API_VERSION}`,
      telemetryBaseUrl: `http://${env.AWS_LAMBDA_RUNTIME_API}/${env.AWS_LAMBDA_RUNTIME_TELEMETRY_API_VERSION}`,
    },
    TE.of,
    TE.bind('extensionId', ({ extensionBaseUrl, EXTENSION_NAME }) =>
      registerExtension(extensionBaseUrl, EXTENSION_NAME),
    ),
    TE.bind('listener', ({ EXTENSION_NAME, RECEIVER_ADDRESS, RECEIVER_PORT }) =>
      startTelemetryHttpListener(EXTENSION_NAME, RECEIVER_ADDRESS, RECEIVER_PORT),
    ),
    TE.chainFirst(
      ({
        telemetryBaseUrl,
        extensionId,
        RECEIVER_ADDRESS,
        RECEIVER_PORT,
        AWS_LAMBDA_RUNTIME_TELEMETRY_API_VERSION,
        TIMEOUT_MS,
        MAX_BYTES,
        MAX_ITEMS,
      }) =>
        F.pipe(
          <SubscriptionBody>{
            schemaVersion: AWS_LAMBDA_RUNTIME_TELEMETRY_API_VERSION,
            destination: {
              protocol: 'HTTP',
              URI: `http://${RECEIVER_ADDRESS}:${RECEIVER_PORT}`,
            },
            types: ['function'],
            buffering: {
              timeoutMs: TIMEOUT_MS,
              maxBytes: MAX_BYTES,
              maxItems: MAX_ITEMS,
            },
          },
          (body) => subscribeTelemetry(telemetryBaseUrl, extensionId, body),
        ),
    ),
    TE.bind('forwardLogs', ({ LOGTAIL_TOKEN, LOGTAIL_HTTP_API_URL, listener }) =>
      TE.of(logtailLogForwarder(LOGTAIL_TOKEN, LOGTAIL_HTTP_API_URL, listener)),
    ),
    TE.map(({ EXTENSION_NAME, extensionId, extensionBaseUrl, forwardLogs, listener }) =>
      F.pipe(
        pollForNextEvent(extensionId, extensionBaseUrl, abortHandler.signal), //
        TE.chainW((event) =>
          TE.tryCatch(
            () => {
              switch (event.eventType) {
                // Received when the Lambda first invokes
                case 'INVOKE':
                  console.log(`[${EXTENSION_NAME}] Received INVOKE event`);

                  // Forward any logs pending from the last execution
                  return forwardLogs();
                // Received when the runtime asks us to shut down (i.e. no lambdas running in a set time-frame)
                case 'SHUTDOWN':
                default:
                  console.log(`[${EXTENSION_NAME}] Shutting down due to event ${event.eventType}`);

                  // Close the HTTP server, no more events are coming
                  listener.server.close();

                  // Raise the abort signal to tell the main loop to stop
                  abortHandler.abort();

                  // Forward any pending logs
                  return forwardLogs();
              }
            },
            () => new Error(),
          ),
        ),
      ),
    ),
  );
