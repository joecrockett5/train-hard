from typing import Optional
from uuid import UUID

from fastapi import APIRouter
from starlette.requests import Request

from hard.app.processes import (
    RestProcesses,
    exercises_from_workout_id,
    exercises_with_tags,
)
from hard.aws.interfaces.fastapi import request
from hard.models.exercise import Exercise
from hard.models.workout_detail import ExerciseWithTags

router = APIRouter(prefix="/exercises")


@router.get("", response_model=list[ExerciseWithTags])
async def list_exercises(
    req: Request,
    workout: Optional[UUID] = None,
) -> list[ExerciseWithTags]:
    """
    Every exercise, each with its tags, which the list is filtered by.

    The tags cost two partition queries for the whole list rather than one
    per exercise; see `exercises_with_tags`.
    """
    user = request.get_user_claims(req)

    if workout:
        return exercises_from_workout_id(user, workout)

    return exercises_with_tags(user)


@router.get("/{exercise_id}", response_model=Exercise)
async def get_exercise(
    req: Request,
    exercise_id: str,
) -> Exercise:
    user = request.get_user_claims(req)
    exercise = RestProcesses.get(Exercise, user, UUID(exercise_id))

    return exercise


@router.post("", response_model=Exercise, status_code=201)
async def create_exercise(
    req: Request,
    exercise: Exercise,
) -> Exercise:
    user = request.get_user_claims(req)
    created_exercise = RestProcesses.post(Exercise, user, exercise)

    return created_exercise


@router.put("/{exercise_id}", response_model=Exercise)
async def update_exercise(
    req: Request,
    exercise_id: str,
    exercise: Exercise,
) -> Exercise:
    user = request.get_user_claims(req)
    exercise.object_id = UUID(exercise_id)
    updated_exercise = RestProcesses.put(Exercise, user, exercise)

    return updated_exercise


@router.delete("/{exercise_id}", response_model=Exercise)
async def delete_exercise(
    req: Request,
    exercise_id: str,
) -> Exercise:
    user = request.get_user_claims(req)
    deleted_exercise = RestProcesses.delete(Exercise, user, UUID(exercise_id))

    return deleted_exercise
