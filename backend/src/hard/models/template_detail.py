from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_serializer

from hard.models.tag import Tag
from hard.models.template import Template
from hard.models.workout_detail import ExerciseWithTags


class TemplateWithTags(Template):
    """
    A template plus the tags applied to it, resolved the same way an
    exercise's are, and how many exercises it holds.

    The count is here rather than the exercises themselves because the list
    page shows it on every card: sending each template's exercises to render
    one number would be most of the profile's data for a line of text.
    """

    tags: list[Tag] = Field(default_factory=list)
    exercise_count: int = 0


class ExerciseInTemplate(ExerciseWithTags):
    """
    An exercise as it appears in one template.

    No sets: a template says which exercises to do, not what was done. The
    join id is here for the same reason it is on `ExerciseWithSets` -- it is
    what the page deletes to take the exercise back out.
    """

    join_id: Optional[UUID] = Field(default=None)
    template_id: Optional[UUID] = Field(default=None)

    @field_serializer("join_id")
    def join_id_to_str(self, join_id: Optional[UUID]) -> Optional[str]:
        return None if join_id is None else str(join_id)

    @field_serializer("template_id")
    def template_id_to_str(self, template_id: Optional[UUID]) -> Optional[str]:
        return None if template_id is None else str(template_id)


class TemplateDetail(BaseModel):
    """
    The whole template page in one response, mirroring `WorkoutDetail`.

    `all_exercises` backs the "add an exercise" picker, which needs every
    exercise the profile has rather than the ones already listed.
    """

    template: TemplateWithTags
    exercises: list[ExerciseInTemplate]
    all_exercises: list[ExerciseWithTags]
