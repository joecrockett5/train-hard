#!/usr/bin/env python3
"""
Creates the local DynamoDB tables, idempotently.

Run as a one-shot compose service before the backend starts. Waits for
DynamoDB to accept connections, then creates any missing table. Existing
tables are left exactly as they are, so re-running this on a populated volume
is safe and does not touch data.

Schema is mirrored from infra-legacy/serverless.yml -- keep the two in sync.
"""

import os
import sys
import time

import boto3
from botocore.exceptions import ClientError, EndpointConnectionError

TABLE_NAME = os.environ.get("DYNAMO_TABLE_NAME", "hardResources")
ENDPOINT_URL = os.environ.get("DYNAMODB_ENDPOINT_URL", "http://dynamodb:8000")
ITEM_INDEX_NAME = os.environ.get("DYNAMO_ITEM_INDEX_NAME", "ItemSearch")

WAIT_TIMEOUT_SECONDS = int(os.environ.get("DYNAMODB_WAIT_TIMEOUT", "60"))
WAIT_INTERVAL_SECONDS = 1.0

TABLE_DEFINITION = {
    "TableName": TABLE_NAME,
    "BillingMode": "PAY_PER_REQUEST",
    "AttributeDefinitions": [
        {"AttributeName": "User_ObjectType", "AttributeType": "S"},
        {"AttributeName": "Timestamp", "AttributeType": "S"},
        {"AttributeName": "object_id", "AttributeType": "S"},
    ],
    "KeySchema": [
        {"AttributeName": "User_ObjectType", "KeyType": "HASH"},
        {"AttributeName": "Timestamp", "KeyType": "RANGE"},
    ],
    "GlobalSecondaryIndexes": [
        {
            "IndexName": ITEM_INDEX_NAME,
            "KeySchema": [{"AttributeName": "object_id", "KeyType": "HASH"}],
            "Projection": {"ProjectionType": "ALL"},
        }
    ],
}


def log(message: str) -> None:
    print(f"[init-tables] {message}", flush=True)


def wait_for_dynamodb(client) -> None:
    """Blocks until DynamoDB answers a ListTables, or the timeout expires."""
    deadline = time.monotonic() + WAIT_TIMEOUT_SECONDS
    attempt = 0

    while True:
        attempt += 1
        try:
            client.list_tables()
        except (EndpointConnectionError, ClientError, OSError) as exc:
            if time.monotonic() >= deadline:
                log(f"DynamoDB unreachable at {ENDPOINT_URL} after {attempt} attempts")
                raise
            if attempt == 1 or attempt % 5 == 0:
                log(f"waiting for {ENDPOINT_URL} ... ({type(exc).__name__})")
            time.sleep(WAIT_INTERVAL_SECONDS)
        else:
            log(f"DynamoDB is up at {ENDPOINT_URL}")
            return


def create_table(client) -> None:
    """Creates TABLE_NAME unless it already exists."""
    existing = client.list_tables().get("TableNames", [])

    if TABLE_NAME in existing:
        log(f"table '{TABLE_NAME}' already exists, leaving it alone")
        return

    log(f"creating table '{TABLE_NAME}' with GSI '{ITEM_INDEX_NAME}'")
    try:
        client.create_table(**TABLE_DEFINITION)
    except client.exceptions.ResourceInUseException:
        # Another init container won the race. Not an error.
        log(f"table '{TABLE_NAME}' was created concurrently")
        return

    client.get_waiter("table_exists").wait(
        TableName=TABLE_NAME, WaiterConfig={"Delay": 1, "MaxAttempts": 30}
    )
    log(f"table '{TABLE_NAME}' is ACTIVE")


def main() -> int:
    log(f"endpoint={ENDPOINT_URL} table={TABLE_NAME}")
    client = boto3.client("dynamodb", endpoint_url=ENDPOINT_URL)

    wait_for_dynamodb(client)
    create_table(client)

    log("done")
    return 0


if __name__ == "__main__":
    sys.exit(main())
