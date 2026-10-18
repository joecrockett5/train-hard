from datetime import date

from pydantic import (
    FieldSerializationInfo,
    field_serializer,
    field_validator,
)

from hard.aws.dynamodb.base_object import BaseObject
from hard.aws.dynamodb.numbers import to_db_decimal
from hard.aws.dynamodb.object_type import ObjectType


class BodyWeight(BaseObject):
    """
    One weigh-in: a date and a reading in kilograms.

    The date is carried separately from `timestamp` for the same reason
    `Workout` carries `workout_date` -- the sort key records when the row was
    written, which is not necessarily the day being logged.

    Unlike `Set`, there is no unit: body weight is always kilograms. A set
    needs one because a gym's plates may be imperial; a bathroom scale is
    whatever its owner set it to once, and storing a per-entry unit only
    creates the possibility of a graph comparing two of them.
    """

    object_type: ObjectType = ObjectType.BODY_WEIGHT
    entry_date: date
    weight: float
    notes: str = ""

    @field_serializer("entry_date")
    def to_isoformat(self, entry_date: date) -> str:
        return entry_date.isoformat()

    @field_validator("entry_date", mode="before")
    @classmethod
    def from_isoformat(cls, date_str: str) -> date:
        return date.fromisoformat(date_str)

    # DynamoDB needs Decimal, the HTTP API should hand out JSON numbers. See
    # the same split on `Set.weight`, and `to_db_decimal` for why a plain
    # `Decimal(float)` is not usable here.
    @field_serializer("weight")
    def serialize_weight(self, weight: float, info: FieldSerializationInfo):
        return to_db_decimal(weight) if info.mode == "python" else weight
