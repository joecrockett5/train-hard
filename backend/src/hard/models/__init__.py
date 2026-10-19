from enum import Enum


class WeightUnit(Enum):
    KILOGRAMS = "kg"
    POUNDS = "lbs"


class SetType(Enum):
    WORKING = "working"
    WARMUP = "warmup"


class ExerciseKind(Enum):
    """
    How an exercise is measured.

    `REPS` is the default so that exercises written before this existed, and
    callers that do not mention it, keep the behaviour they had.
    """

    REPS = "reps"
    TIME = "time"
