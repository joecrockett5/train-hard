from enum import Enum


class ObjectType(Enum):
    # Objects
    BASE_OBJECT = "BaseObject"
    TAG = "Tag"
    WORKOUT = "Workout"
    EXERCISE = "Exercise"
    SET = "Set"
    TEMPLATE = "Template"
    PROFILE = "Profile"
    BODY_WEIGHT = "BodyWeight"

    # Joins
    TAG_JOIN = "TagJoin"
    EXCERCISE_JOIN = "ExerciseJoin"
    TEMPLATE_JOIN = "TemplateJoin"

    @classmethod
    def from_object_class(cls, object_class):
        return cls(object_class.__name__)
