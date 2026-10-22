from uuid import UUID

from pydantic import field_serializer

from hard.aws.dynamodb.base_object import BaseObject
from hard.aws.dynamodb.object_type import ObjectType


class TemplateJoin(BaseObject):
    """
    An exercise listed in a template.

    Its own type rather than a reuse of `ExerciseJoin`, whose `workout_id` is
    required: making that field optional would leave every stored join
    ambiguous about which kind it is, and widening it to a generic parent id
    would mean rewriting joins that already exist. A template holds no sets,
    so this carries none of the set handling that hangs off `ExerciseJoin`.
    """

    object_type: ObjectType = ObjectType.TEMPLATE_JOIN
    template_id: UUID
    exercise_id: UUID

    # template_id handler
    @field_serializer("template_id")
    def template_id_to_str(self, template_id: UUID) -> str:
        return str(template_id)

    # exercise_id handler
    @field_serializer("exercise_id")
    def exercise_id_to_str(self, exercise_id: UUID) -> str:
        return str(exercise_id)
