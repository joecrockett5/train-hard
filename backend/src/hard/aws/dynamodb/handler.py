import os
from typing import Optional, Type
from uuid import UUID

import boto3
from boto3.dynamodb.conditions import Attr, Key

from hard.aws.dynamodb.base_object import DB_OBJECT_TYPE
from hard.aws.dynamodb.consts import DB_PARTITION, DB_SORT_KEY, PARTITION_TEMPLATE
from hard.aws.dynamodb.object_type import ObjectType
from hard.aws.models.user import User

_DYNAMODB_RESOURCE = None


def _get_dynamodb_resource():
    """
    Returns a cached boto3 DynamoDB resource.

    If `DYNAMODB_ENDPOINT_URL` is set the resource is pointed at it (DynamoDB
    Local); otherwise boto3 resolves a real AWS endpoint from the usual region
    and credential chain. Cached because a resource is relatively expensive to
    build and `get_db_instance()` is called per request.
    """
    global _DYNAMODB_RESOURCE

    if _DYNAMODB_RESOURCE is None:
        kwargs = {}
        endpoint_url = os.getenv("DYNAMODB_ENDPOINT_URL")
        if endpoint_url:
            kwargs["endpoint_url"] = endpoint_url
        _DYNAMODB_RESOURCE = boto3.resource("dynamodb", **kwargs)

    return _DYNAMODB_RESOURCE


class DynamoDB:
    def __init__(self, table_name: str) -> None:
        self._client = _get_dynamodb_resource()
        self._table = self._client.Table(table_name)

    def ping(self) -> str:
        """
        Round-trips a `DescribeTable` so callers can tell whether the table is
        actually reachable. Returns the table status.
        """
        return self._table.table_status

    def query(
        self,
        /,
        key_expression,
        filter_expression=None,
        secondary_index_name: Optional[str] = None,
    ) -> list[dict[str]]:
        """
        Queries the DynamoDB table with the given expressions

        Use the `aws.dynamodb.Key` and `aws.dynamodb.Attr` objects
        to express the state of the desired keys and attributes

        You can additionally provide a `secondary_index_name` to
        search an alternate index
        """
        kwargs = {"KeyConditionExpression": key_expression}

        if filter_expression:
            kwargs.update({"FilterExpression": filter_expression})

        if secondary_index_name:
            kwargs.update({"IndexName": secondary_index_name})

        response = self._table.query(**kwargs)
        return response["Items"]

    def batch_get(
        self,
        /,
        user: User,
        target_object_cls: Type[DB_OBJECT_TYPE],
        search_attr: str,
        matches_list: list[str],
    ) -> list[DB_OBJECT_TYPE]:
        if search_attr not in target_object_cls.model_fields.keys():
            raise ValueError(
                f"Invalid `search_attr` ('{search_attr}') for target class `{ObjectType.from_object_class(target_object_cls).value}`"
            )

        partition = PARTITION_TEMPLATE.format(
            **{
                "user_id": user.id,
                "object_type": ObjectType.from_object_class(target_object_cls).value,
            }
        )
        json_items = self.query(
            key_expression=Key(DB_PARTITION).eq(partition),
            filter_expression=Attr(search_attr).is_in(matches_list),
        )
        objects = [target_object_cls.from_db(item) for item in json_items]
        return objects

    def put(self, /, data_object: DB_OBJECT_TYPE) -> DB_OBJECT_TYPE:
        """
        'Puts' the given `data_object` into the DynamoDB table
        """
        self._table.put_item(Item=data_object.to_db())
        return data_object

    def delete(self, /, data_object: DB_OBJECT_TYPE) -> DB_OBJECT_TYPE:
        """
        Deletes the given `data_object` from the DyanmoDB table
        """
        data = data_object.to_db()
        self._table.delete_item(
            Key={
                DB_PARTITION: data.get(DB_PARTITION),
                DB_SORT_KEY: data.get(DB_SORT_KEY),
            }
        )
        return data_object


def get_db_instance() -> DynamoDB:
    db_name = os.getenv("DYNAMO_TABLE_NAME")
    if db_name:
        return DynamoDB(table_name=db_name)
    raise ValueError("Missing Environment Variable: `DYNAMO_TABLE_NAME`")


def reset_db_instance() -> None:
    """
    Drops the cached resource. Needed by tests, which create the resource
    inside a `moto` mock and must not leak it across mocks.
    """
    global _DYNAMODB_RESOURCE
    _DYNAMODB_RESOURCE = None
