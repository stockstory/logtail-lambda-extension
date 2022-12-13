import { either as E, function as F, record as R } from 'fp-ts';
import { z } from 'zod';

const envNumber = z
  .string()
  .transform((val) => Number(val))
  .refine((val) => !isNaN(val));

const envSchema = z.object({
  NODE_ENV: z.union([z.literal('production'), z.literal('development'), z.literal('test')]).default('production'),
  AWS_LAMBDA_RUNTIME_API: z.string(), // Provided by the Lambda Env, usually http://127.0.0.1:9001/
  AWS_LAMBDA_RUNTIME_EXTENSION_API_VERSION: z.string().default('2020-01-01'), // Extension API version
  AWS_LAMBDA_RUNTIME_TELEMETRY_API_VERSION: z.string().default('2022-07-01'), // Telemetry API version
  EXTENSION_NAME: z.string().default('logtail-lambda-extension'),
  RECEIVER_ADDRESS: z.string().default('sandbox'), // `sandbox` seems to be the default accepted address
  MAX_ITEMS: envNumber.default('10000'), // Maximum number of events that are buffered in memory.
  MAX_BYTES: envNumber.default('262144'), // Maximum size in bytes that the logs are buffered in memory.
  TIMEOUT_MS: envNumber.default('1000'), // Maximum time (in milliseconds) that a batch is buffered.
  RECEIVER_PORT: envNumber.default('4243'), // HTTP server receiving port
  LOGTAIL_HTTP_API_URL: z.string().url().default('https://in.logtail.com/'), // Logtail HTTP API ingestion URL
  LOGTAIL_TOKEN: z.string(), // Logtail token, obtain yours via the sources UI
});

export type EnvironmentVars = z.infer<typeof envSchema>;

export const parseEnvironmentVariables = (
  env: Record<string, string | undefined> = process.env,
): E.Either<Error, EnvironmentVars> =>
  F.pipe(
    envSchema.shape,
    R.mapWithIndex((key) => env[key]),
    (vars) => envSchema.safeParse(vars),
    (parsed) => (parsed.success ? E.right(parsed.data) : E.left(parsed.error)),
  );
