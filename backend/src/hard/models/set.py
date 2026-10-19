from decimal import Decimal

from pydantic import FieldSerializationInfo, field_serializer, field_validator

from hard.aws.dynamodb.base_object import BaseObject
from hard.aws.dynamodb.numbers import to_db_decimal
from hard.aws.dynamodb.object_type import ObjectType
from hard.models import SetType, WeightUnit


class Set(BaseObject):
    """
    One entry under an exercise.

    A reps exercise uses `weight` and `reps`; a timed one uses `duration`,
    which is minutes. All three are optional with a zero default rather than
    one set of fields or the other, because a set is stored as a flat item and
    the kind that decides which apply lives on the exercise, not here. The
    defaults also let rows written before `duration` existed load unchanged.
    """

    object_type: ObjectType = ObjectType.SET
    set_type: SetType
    weight: float = 0
    unit: WeightUnit = WeightUnit.KILOGRAMS
    reps: float = 0
    duration: float = 0
    notes: str = ""
    exercise_join_id: str

    @field_validator("unit")
    @classmethod
    def process_weight_unit(cls, weight_unit: str):
        return WeightUnit(weight_unit)

    @field_serializer("unit")
    def serialize_weight_unit(self, unit: WeightUnit):
        return unit.value

    @field_validator("set_type")
    @classmethod
    def process_set_type(cls, set_type: str):
        return SetType(set_type)

    @field_serializer("set_type")
    def serialize_set_type(self, set_type: SetType):
        return set_type.value

    # DynamoDB needs Decimal; the HTTP API should hand out JSON numbers. One
    # serializer was doing both, so weight and reps reached the browser as
    # strings -- which made the set-history comparison a string comparison,
    # where "9" sorts above "80". Splitting on the serialization mode gives
    # each consumer what it needs: model_dump() for to_db(), JSON for FastAPI.
    @field_serializer("weight")
    def serialize_weight(self, weight: float, info: FieldSerializationInfo):
        return to_db_decimal(weight) if info.mode == "python" else weight

    @field_serializer("reps")
    def serialize_reps(self, reps: float, info: FieldSerializationInfo):
        return to_db_decimal(reps) if info.mode == "python" else reps

    @field_serializer("duration")
    def serialize_duration(self, duration: float, info: FieldSerializationInfo):
        return to_db_decimal(duration) if info.mode == "python" else duration
