# logtail-lambda-extension
[![Test logtail-lambda-extension](https://github.com/stockstory/logtail-lambda-extension/actions/workflows/test.yml/badge.svg)](https://github.com/stockstory/logtail-lambda-extension/actions/workflows/test.yml)

[AWS Lambda Extension](https://docs.aws.amazon.com/lambda/latest/dg/lambda-extensions.html) that uses the [Lambda Telemetry API](https://docs.aws.amazon.com/lambda/latest/dg/telemetry-api-reference.html) to forward logs to a [Logtail HTTP API source](https://docs.logtail.com/integrations/rest-api).

# Usage

In order to use the extension you must first build and deploy it into your AWS infrastructure:

```shell
$ git clone git@github.com:stockstory/logtail-lambda-extension.git
$ pnpm run build
$ aws lambda publish-layer-version --layer-name "logtail-lambda-extension" --region us-west-2 --zip-file "fileb://./dist/extension.zip"
```

Once deployed set the `LOGTAIL_TOKEN` environment variable on your Lambda to your HTTP API source from Logtail, and [add the layer](https://docs.aws.amazon.com/lambda/latest/dg/invocation-layers.html) to your Lambda function.
On next invocation your Lambda logs should start appearing in your Logtail console.

## Environment Variables

| Variable                                 | Description                                             | Default                              |
| ---------------------------------------- | ------------------------------------------------------- | ------------------------------------ |
| LOGTAIL_TOKEN                            | Logtail source bearer token                             | **required**                         |
| LOGTAIL_HTTP_API_URL                     | Logtail HTTP source ingestion API URL                   | `https://in.logtail.com/`            |
| EXTENSION_NAME                           | Name of the lambda extension                            | `logtail-lambda-extension`           |
| RECEIVER_ADDRESS                         | Address of the logs http receiver                       | `sandbox`                            |
| RECEIVER_PORT                            | Port of the logs http receiver                          | `4243`                               |
| MAX_ITEMS                                | Maximum number of events that can be buffered in memory | `10000`                              |
| MAX_BYTES                                | Maximum size in bytes of events that can be buffered    | `262144`                             |
| TIMEOUT_MS                               | Maximum time (in milliseconds) that a batch is buffered | `1000`                               |
| AWS_LAMBDA_RUNTIME_API                   | HTTP base URI to the lambda runtime API                 | _Provided by AWS Lambda environment_ |
| AWS_LAMBDA_RUNTIME_EXTENSION_API_VERSION | Lambda Extension API version date                       | `2020-01-01`                         |
| AWS_LAMBDA_RUNTIME_TELEMETRY_API_VERSION | Telemetry API version date                              | `2022-07-01`                         |

### License

Unless explicitly stated otherwise all files in this repository are licensed under the MIT License. See [LICENSE](./LICENSE) for more information.
