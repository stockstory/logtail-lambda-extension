#!/bin/bash
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0

set -euo pipefail

OWN_FILENAME="$(basename $0)"
LAMBDA_EXTENSION_NAME="$OWN_FILENAME" # (external) extension name has to match the filename

echo "${LAMBDA_EXTENSION_NAME} launching extension"

exec "/opt/${LAMBDA_EXTENSION_NAME}/index.js"
