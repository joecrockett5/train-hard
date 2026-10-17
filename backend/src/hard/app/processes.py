from datetime import date
from typing import Optional, Type
from uuid import UUID

from hard.aws.dynamodb.base_object import CORE_ATTRIBUTES, DB_OBJECT_TYPE
from hard.aws.dynamodb.consts import (
    DB_PARTITION,
    DB_SORT_KEY,
    ITEM_INDEX_NAME,
    ITEM_INDEX_PARTITION,
    PARTITION_TEMPLATE,
    InvalidAttributeChangeError,
    ItemAccessUnauthorizedError,
    ItemAlreadyExistsError,
    ItemNotFoundError,
)
from hard.aws.dynamodb.handler import Attr, Key, get_db_instance
from hard.aws.dynamodb.object_type import ObjectType
from hard.aws.models.user import User
from hard.models.exercise import Exercise
from hard.models.exercise_join import ExerciseJoin
from hard.models.set import Set
from hard.models.tag import Tag
from hard.models.tag_join import TagJoin
from hard.models.workout import Workout
from hard.models.workout_detail import ExerciseWithSets, WorkoutDetail


class RestProcesses:

    @staticmethod
    def get_list(
        object_cls: Type[DB_OBJECT_TYPE],
        user: User,
    ) -> list[DB_OBJECT_TYPE]:
        db = get_db_instance()

        query = db.query(
            key_expression=Key(DB_PARTITION).eq(
                PARTITION_TEMPLATE.format(
                    **{
                        "user_id": user.id,
                        "object_type": ObjectType.from_object_class(object_cls).value,
                    }
                )
            )
        )

        results = [object_cls.from_db(item) for item in query]
        return results

    @staticmethod
    def get(
        object_cls: Type[DB_OBJECT_TYPE],
        user: User,
        object_id: UUID,
    ) -> DB_OBJECT_TYPE:
        db = get_db_instance()

        query = db.query(
            secondary_index_name=ITEM_INDEX_NAME,
            key_expression=Key(ITEM_INDEX_PARTITION).eq(str(object_id)),
        )

        try:
            item = query[0]

        except IndexError:
            raise ItemNotFoundError(
                f"No `{ObjectType.from_object_class(object_cls).value}` found with `object_id`: '{object_id}'"
            )

        result = object_cls.from_db(item)

        if not result.owned_by(user):
            raise ItemAccessUnauthorizedError(
                f"`{ObjectType.from_object_class(object_cls).value}` Item not owned by current user ({user.id}): Cannot Fetch"
            )

        return result

    @staticmethod
    def post(
        object_cls: Type[DB_OBJECT_TYPE],
        user: User,
        data_object: DB_OBJECT_TYPE,
    ) -> DB_OBJECT_TYPE:
        db = get_db_instance()
        object_type = ObjectType.from_object_class(object_cls)

        # An object that already names an owner may only be created by that
        # owner. Without this a caller could submit an object attributed to
        # somebody else and have it written into their partition.
        if data_object.user_id is not None and not data_object.owned_by(user):
            raise ItemAccessUnauthorizedError(
                f"`{object_type.value}` Item not owned by current user ({user.id}): Cannot Create"
            )

        if data_object.object_id:

            try:
                RestProcesses.get(object_cls, user, data_object.object_id)

            except ItemNotFoundError:
                pass

            else:
                raise ItemAlreadyExistsError(
                    f"Found `{object_type.value}` with `object_id`: '{data_object.object_id}': Cannot Create"
                )

        data_object.init_from_request(user, object_type)
        result = db.put(data_object=data_object)
        return result

    @staticmethod
    def put(
        object_cls: Type[DB_OBJECT_TYPE],
        user: User,
        updated_object: DB_OBJECT_TYPE,
    ) -> DB_OBJECT_TYPE:
        db = get_db_instance()
        updated_object.from_request(user, ObjectType.from_object_class(object_cls))

        if not updated_object.object_id:
            raise ReferenceError(
                f"`{updated_object.object_type.value}` Item does not have a valid `object_id`"
            )

        try:
            current_obj = RestProcesses.get(object_cls, user, updated_object.object_id)

        except ItemNotFoundError:
            raise ItemNotFoundError(
                f"No `{ObjectType.from_object_class(object_cls).value}` found with `object_id`: '{updated_object.object_id}': Cannot Update"
            )

        except ItemAccessUnauthorizedError:
            # Without this the message from `get` leaks through, telling the
            # caller it "Cannot Fetch" an item it was trying to update.
            # `delete` already restates it this way.
            raise ItemAccessUnauthorizedError(
                f"`{ObjectType.from_object_class(object_cls).value}` Item not owned by current user ({user.id}): Cannot Update"
            )

        for attr in CORE_ATTRIBUTES:
            if current_obj.__dict__[attr] != updated_object.__dict__[attr]:
                raise InvalidAttributeChangeError(
                    f"Cannot Modify `{attr}` Attribute on `{current_obj.object_type.value}`"
                )

        result = db.put(data_object=updated_object, must_exist=True)
        return result

    @staticmethod
    def delete(
        object_cls: Type[DB_OBJECT_TYPE],
        user: User,
        object_id: UUID,
    ) -> DB_OBJECT_TYPE:
        db = get_db_instance()

        try:
            to_delete = RestProcesses.get(object_cls, user, object_id)

        except ItemNotFoundError:
            raise ItemNotFoundError(
                f"No `{ObjectType.from_object_class(object_cls).value}` found with `object_id`: '{object_id}': Cannot Delete"
            )

        except ItemAccessUnauthorizedError:
            raise ItemAccessUnauthorizedError(
                f"`{ObjectType.from_object_class(object_cls).value}` Item not owned by current user ({user.id}): Cannot Delete"
            )

        return db.delete(to_delete)


def workout_date_filter(
    user: User,
    requested_date: date,
) -> list[Workout]:
    db = get_db_instance()

    partition = PARTITION_TEMPLATE.format(
        **{
            "user_id": user.id,
            "object_type": ObjectType.WORKOUT.value,
        }
    )

    filter = Attr("workout_date").eq(requested_date.isoformat())

    json_items = db.query(
        key_expression=Key(DB_PARTITION).eq(partition),
        filter_expression=filter,
    )
    workouts = [Workout.from_db(item) for item in json_items]

    return workouts


def exercise_join_filter(
    user: User,
    /,
    exercise_id: Optional[UUID] = None,
    workout_id: Optional[UUID] = None,
) -> list[ExerciseJoin]:
    if not (exercise_id or workout_id):
        raise ValueError(
            "Invalid Usage: `exercise_join_filter` requires either `exercise_id` or `workout_id` or both, None provided"
        )

    db = get_db_instance()

    partition = PARTITION_TEMPLATE.format(
        **{
            "user_id": user.id,
            "object_type": ObjectType.EXCERCISE_JOIN.value,
        }
    )

    filter = None
    if exercise_id:
        filter = Attr("exercise_id").eq(str(exercise_id))
    if workout_id:
        workout_filter = Attr("workout_id").eq(str(workout_id))
        filter = filter & workout_filter if filter else workout_filter

    json_items = db.query(
        key_expression=Key(DB_PARTITION).eq(partition),
        filter_expression=filter,
    )
    joins = [ExerciseJoin.from_db(item) for item in json_items]

    return joins


def ids_from_exercise_joins(joins: list[ExerciseJoin]) -> dict[str, list[UUID]]:
    out_dict = {
        "exercise_ids": [],
        "workout_ids": [],
    }

    for join in joins:
        out_dict["exercise_ids"].append(join.exercise_id)
        out_dict["workout_ids"].append(join.workout_id)

    return out_dict


def exercises_from_workout_id(user: User, workout_id: UUID) -> list[Exercise]:
    db = get_db_instance()

    joins = exercise_join_filter(user, workout_id=workout_id)
    ids = ids_from_exercise_joins(joins)
    exercise_ids = [str(id) for id in ids["exercise_ids"]]

    if not exercise_ids:
        return []

    exercises = db.batch_get(
        user,
        target_object_cls=Exercise,
        search_attr="object_id",
        matches_list=exercise_ids,
    )
    return exercises


def sets_from_ids(
    user: User, /, workout_id: Optional[UUID] = None, exercise_id: Optional[UUID] = None
) -> list[Set]:
    db = get_db_instance()

    joins = exercise_join_filter(
        user,
        workout_id=workout_id,
        exercise_id=exercise_id,
    )
    join_ids = [str(join.object_id) for join in joins]

    sets = db.batch_get(
        user,
        target_object_cls=Set,
        search_attr="exercise_join_id",
        matches_list=join_ids,
    )
    return sets


def tag_join_filter(
    user: User,
    /,
    tag_id: Optional[UUID] = None,
    target_id: Optional[UUID] = None,
) -> list[TagJoin]:
    if bool(tag_id) == bool(target_id):
        raise ValueError(
            "Invalid Usage: `tag_join_filter` requires either `tag_id` or `target_id`"
        )

    db = get_db_instance()

    partition = PARTITION_TEMPLATE.format(
        **{
            "user_id": user.id,
            "object_type": ObjectType.TAG_JOIN.value,
        }
    )

    filter = None
    if tag_id:
        filter = Attr("tag_id").eq(str(tag_id))
    if target_id:
        filter = Attr("target_id").eq(str(target_id))

    json_items = db.query(
        key_expression=Key(DB_PARTITION).eq(partition),
        filter_expression=filter,
    )
    joins = [TagJoin.from_db(item) for item in json_items]

    return joins


def tags_from_target_id(user: User, /, target_id: UUID) -> list[Tag]:
    db = get_db_instance()

    joins = tag_join_filter(user, target_id=target_id)
    tag_ids = [str(join.tag_id) for join in joins]

    if not tag_ids:
        return []

    tags = db.batch_get(
        user,
        target_object_cls=Tag,
        search_attr="object_id",
        matches_list=tag_ids,
    )
    return tags


def workout_detail(user: User, workout_id: UUID) -> WorkoutDetail:
    """
    Everything the workout page needs, in four queries.

    The page used to issue one request per exercise for its sets, on top of
    three for the workout, its exercises and the full exercise list -- each of
    which fanned out into further backend calls. A ten-exercise workout cost
    roughly fourteen round trips across two hops.

    Reading each collection once and joining here is flat in the number of
    exercises: one lookup for the workout, plus one partition query each for
    the profile's joins, exercises and sets.
    """
    workout = RestProcesses.get(Workout, user, workout_id)

    joins = [
        join
        for join in RestProcesses.get_list(ExerciseJoin, user)
        if join.workout_id == workout_id
    ]
    all_exercises = RestProcesses.get_list(Exercise, user)
    all_sets = RestProcesses.get_list(Set, user)

    exercises_by_id = {exercise.object_id: exercise for exercise in all_exercises}

    sets_by_join: dict[str, list[Set]] = {}
    for data_set in all_sets:
        sets_by_join.setdefault(data_set.exercise_join_id, []).append(data_set)

    exercises = []
    for join in joins:
        exercise = exercises_by_id.get(join.exercise_id)
        if exercise is None:
            # A join pointing at a deleted exercise. Skip it rather than
            # failing the whole page.
            continue

        exercises.append(
            ExerciseWithSets(
                **exercise.model_dump(),
                join_id=join.object_id,
                workout_id=workout_id,
                sets=sorted(
                    sets_by_join.get(str(join.object_id), []),
                    key=lambda item: item.timestamp,
                ),
            )
        )

    return WorkoutDetail(
        workout=workout,
        exercises=exercises,
        all_exercises=all_exercises,
    )


def delete_profile_data(profile_id: str) -> dict[str, int]:
    """
    Removes everything owned by a profile.

    The partition key is "{profile_id}#{object_type}", so one query per object
    type finds all of it. Called when a profile is deleted: without this the
    rows stay forever, invisible but billable, and would reappear if a
    profile were ever recreated with the same id.

    Returns a count per object type, for the caller to log or report.
    """
    db = get_db_instance()
    owner = User(id=profile_id, email=f"{profile_id}@profile.local")
    removed: dict[str, int] = {}

    for object_type in ObjectType:
        if object_type is ObjectType.PROFILE:
            continue

        partition = PARTITION_TEMPLATE.format(
            user_id=profile_id, object_type=object_type.value
        )
        items = db.query(key_expression=Key(DB_PARTITION).eq(partition))

        for item in items:
            db.delete_raw(
                partition_key=item[DB_PARTITION], sort_key=item[DB_SORT_KEY]
            )

        if items:
            removed[object_type.value] = len(items)

    return removed
