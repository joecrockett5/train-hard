from typing import Optional

from pydantic import Field, field_serializer, field_validator

from hard.aws.dynamodb.base_object import BaseObject
from hard.aws.dynamodb.object_type import ObjectType
from hard.models import ExerciseKind


class Exercise(BaseObject):
    """
    `kind` decides what its sets record: reps at a weight, or a duration.

    It defaults to `REPS`, which is what every exercise was before cardio
    existed, so stored rows without the field load unchanged.
    """

    object_type: ObjectType = ObjectType.EXERCISE
    name: str
    description: Optional[str] = Field(default=None)
    kind: ExerciseKind = ExerciseKind.REPS

    @field_validator("kind")
    @classmethod
    def process_kind(cls, kind: str):
        return ExerciseKind(kind)

    @field_serializer("kind")
    def serialize_kind(self, kind: ExerciseKind):
        return kind.value
