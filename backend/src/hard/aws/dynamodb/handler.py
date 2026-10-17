import os
from typing import Optional, Type
from uuid import UUID

import boto3
from boto3.dynamodb.conditions import Attr, Key

from hard.aws.dynamodb.base_object import DB_OBJECT_TYPE
from hard.aws.dynamodb.consts import (
    DB_PARTITION,
    DB_SORT_KEY,
    ITEM_INDEX_NAME,
    ITEM_INDEX_PARTITION,
    PARTITION_TEMPLATE,
    ItemNotFoundError,
)
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

        # DynamoDB caps a Query response at 1MB and reports the cut-off in
        # `LastEvaluatedKey`. Returning only the first page silently truncated
        # results -- no error, just missing items once a profile had enough of
        # them. A filter expression makes this likelier still, since the cap
        # applies to items *read*, not items returned, so a filtered page can
        # come back empty while more matches wait behind the cursor.
        items = []
        while True:
            response = self._table.query(**kwargs)
            items.extend(response["Items"])

            last_key = response.get("LastEvaluatedKey")
            if not last_key:
                return items

            kwargs["ExclusiveStartKey"] = last_key

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

        if not matches_list:
            # Attr(...).is_in([]) renders an empty parenthesis group, which
            # DynamoDB rejects as a malformed FilterExpression. Nothing can
            # match an empty list anyway. Some callers guard this themselves;
            # guarding here covers the ones that do not.
            return []

        if search_attr == ITEM_INDEX_PARTITION:
            # `object_id` is the ItemSearch partition key, so each wanted item
            # is a point lookup. The fallback below reads the caller's entire
            # partition and discards the misses server-side -- DynamoDB bills
            # for items *read*, so fetching three sets re-read every set the
            # profile had ever logged.
            return self._get_many_by_object_id(user, target_object_cls, matches_list)

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

    def _get_many_by_object_id(
        self,
        user: User,
        target_object_cls: Type[DB_OBJECT_TYPE],
        object_ids: list[str],
    ) -> list[DB_OBJECT_TYPE]:
        """
        Fetches items by `object_id` through the ItemSearch index.

        One small query per id, rather than one large read of the whole
        partition. Ownership is still checked here, because the index is
        global: it is keyed only on `object_id` and spans every profile.
        """
        objects = []

        for object_id in dict.fromkeys(object_ids):
            items = self.query(
                secondary_index_name=ITEM_INDEX_NAME,
                key_expression=Key(ITEM_INDEX_PARTITION).eq(str(object_id)),
            )

            for item in items:
                candidate = target_object_cls.from_db(dict(item))
                if candidate.owned_by(user):
                    objects.append(candidate)

        return objects

    def put(
        self, /, data_object: DB_OBJECT_TYPE, must_exist: bool = False
    ) -> DB_OBJECT_TYPE:
        """
        'Puts' the given `data_object` into the DynamoDB table.

        `must_exist` is for updates. `RestProcesses.put` reads the item before
        writing it, and without a condition anything that deleted it in
        between would be undone -- delete a workout in one tab, save an edit
        in another, and it comes back. The condition closes that window.
        """
        kwargs = {"Item": data_object.to_db()}

        if must_exist:
            kwargs["ConditionExpression"] = Attr(DB_PARTITION).exists()

        try:
            self._table.put_item(**kwargs)
        except self._client.meta.client.exceptions.ConditionalCheckFailedException:
            raise ItemNotFoundError(
                f"`{data_object.object_type.value}` Item no longer exists: Cannot Update"
            )

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


    def delete_raw(self, /, partition_key: str, sort_key: str) -> None:
        """
        Deletes by key, without needing the item parsed into a model.

        Cascading a profile delete spans every object type, so the rows come
        back as plain dicts rather than a single model class.
        """
        self._table.delete_item(
            Key={DB_PARTITION: partition_key, DB_SORT_KEY: sort_key}
        )


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
