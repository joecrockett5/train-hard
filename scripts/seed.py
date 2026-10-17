#!/usr/bin/env python3
"""
Loads items into the local DynamoDB table from a JSON dump.

Accepts either of the two shapes you are likely to have:

  1. Plain JSON -- a list of items, or an object whose values are lists of
     items, in the app's own attribute names:

       [{"user_id": "...", "timestamp": "...", "object_type": "Workout", ...}]

     Items in this shape are converted to table rows, which means user_id and
     object_type are packed into the User_ObjectType partition key, exactly as
     BaseObject.to_db() does.

  2. A DynamoDB export -- items already in table shape with DynamoDB's typed
     attribute values, as produced by `aws dynamodb scan` or an S3 table
     export (one JSON object per line, or a {"Items": [...]} envelope):

       {"Item": {"User_ObjectType": {"S": "..."}, "Timestamp": {"S": "..."}}}

Usage:
    docker compose run --rm seed /data/dump.json
    python scripts/seed.py dump.json --profile-id <uuid>

`--profile-id` rewrites every item's owner, which is what you want when
importing a dump taken from AWS (where user_id was a Cognito username) into a
local profile.
"""

import argparse
import json
import os
import sys
from decimal import Decimal
from typing import Any, Iterable

import boto3
from boto3.dynamodb.types import TypeDeserializer

TABLE_NAME = os.environ.get("DYNAMO_TABLE_NAME", "hardResources")
ENDPOINT_URL = os.environ.get("DYNAMODB_ENDPOINT_URL", "http://dynamodb:8000")

DB_PARTITION = "User_ObjectType"
DB_SORT_KEY = "Timestamp"
DELIMITER = "#"

_deserializer = TypeDeserializer()


def log(message: str) -> None:
    print(f"[seed] {message}", flush=True)


def looks_like_typed_attributes(item: dict) -> bool:
    """
    True if the item uses DynamoDB's typed attribute values, i.e. every value
    is a single-key dict whose key is a DynamoDB type tag.
    """
    tags = {"S", "N", "B", "SS", "NS", "BS", "M", "L", "NULL", "BOOL"}
    return bool(item) and all(
        isinstance(value, dict) and len(value) == 1 and next(iter(value)) in tags
        for value in item.values()
    )


def untype(item: dict) -> dict:
    return {key: _deserializer.deserialize(value) for key, value in item.items()}


def to_table_row(item: dict) -> dict:
    """
    Converts an app-shaped item into a table row by packing the partition key,
    mirroring BaseObject.to_db(). Items already in table shape pass through.
    """
    if DB_PARTITION in item:
        return item

    row = dict(item)
    user_id = row.pop("user_id", None)
    object_type = row.pop("object_type", None)
    timestamp = row.pop("timestamp", None)

    if user_id is None or object_type is None:
        raise ValueError(
            f"Item needs either {DB_PARTITION}, or both user_id and "
            f"object_type, to build a partition key: {item!r}"
        )
    if timestamp is None:
        raise ValueError(f"Item is missing a timestamp (sort key): {item!r}")

    row[DB_PARTITION] = f"{user_id}{DELIMITER}{object_type}"
    row[DB_SORT_KEY] = timestamp
    return row


def floats_to_decimal(value: Any) -> Any:
    """DynamoDB has no float type; boto3 requires Decimal."""
    if isinstance(value, float):
        return Decimal(str(value))
    if isinstance(value, list):
        return [floats_to_decimal(entry) for entry in value]
    if isinstance(value, dict):
        return {key: floats_to_decimal(entry) for key, entry in value.items()}
    return value


def extract_items(raw: str) -> Iterable[dict]:
    """
    Pulls items out of any of the supported layouts: a bare list, a dict of
    lists (the shape of the app's own local-data.json), a {"Items": [...]}
    envelope, or newline-delimited {"Item": {...}} objects.
    """
    stripped = raw.strip()

    # Newline-delimited JSON, as produced by an S3 table export.
    if not stripped.startswith(("[", "{")) or "\n{" in stripped:
        for line in stripped.splitlines():
            line = line.strip()
            if not line:
                continue
            entry = json.loads(line)
            yield entry.get("Item", entry)
        return

    document = json.loads(stripped)

    if isinstance(document, list):
        for entry in document:
            yield entry.get("Item", entry) if isinstance(entry, dict) else entry
        return

    if isinstance(document, dict):
        if "Items" in document:
            for entry in document["Items"]:
                yield entry
            return
        if "Item" in document:
            yield document["Item"]
            return
        # A dict of lists, e.g. {"workouts": [...], "exercises": [...]}.
        for key, value in document.items():
            if isinstance(value, list):
                log(f"reading {len(value)} item(s) from '{key}'")
                for entry in value:
                    yield entry
        return

    raise ValueError("Unrecognised JSON layout")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("dump", help="Path to the JSON dump")
    parser.add_argument(
        "--profile-id",
        help="Rewrite every item's owner to this profile id before loading",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Parse and report without writing anything",
    )
    args = parser.parse_args()

    raw = open(args.dump, encoding="utf-8").read()

    rows = []
    for item in extract_items(raw):
        if looks_like_typed_attributes(item):
            item = untype(item)

        row = to_table_row(item)

        if args.profile_id:
            _, _, object_type = row[DB_PARTITION].partition(DELIMITER)
            row[DB_PARTITION] = f"{args.profile_id}{DELIMITER}{object_type}"

        rows.append(floats_to_decimal(row))

    log(f"parsed {len(rows)} item(s) from {args.dump}")

    if args.dry_run:
        for row in rows[:5]:
            log(f"  {row}")
        log("dry run, nothing written")
        return 0

    if not rows:
        log("nothing to load")
        return 0

    table = boto3.resource("dynamodb", endpoint_url=ENDPOINT_URL).Table(TABLE_NAME)
    with table.batch_writer() as batch:
        for row in rows:
            batch.put_item(Item=row)

    log(f"loaded {len(rows)} item(s) into '{TABLE_NAME}' at {ENDPOINT_URL}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
