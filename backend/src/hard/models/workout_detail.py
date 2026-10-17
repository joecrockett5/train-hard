from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_serializer

from hard.models.exercise import Exercise
from hard.models.set import Set
from hard.models.workout import Workout


class ExerciseWithSets(Exercise):
    """An exercise as it appears within one workout, with that workout's sets."""

    join_id: Optional[UUID] = Field(default=None)
    workout_id: Optional[UUID] = Field(default=None)
    sets: list[Set] = Field(default_factory=list)

    @field_serializer("join_id")
    def join_id_to_str(self, join_id: Optional[UUID]) -> Optional[str]:
        return None if join_id is None else str(join_id)

    @field_serializer("workout_id")
    def workout_id_to_str(self, workout_id: Optional[UUID]) -> Optional[str]:
        return None if workout_id is None else str(workout_id)


class WorkoutDetail(BaseModel):
    """
    The whole workout page in one response.

    `all_exercises` backs the "add an exercise" picker, which needs every
    exercise the profile has, not just the ones already in this workout.
    """

    workout: Workout
    exercises: list[ExerciseWithSets]
    all_exercises: list[Exercise]
