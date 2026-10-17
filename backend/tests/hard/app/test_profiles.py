"""Profile lifecycle: isolation, cascading delete, and update races."""

import pytest

from hard.app.processes import RestProcesses, delete_profile_data
from hard.aws.dynamodb.consts import DB_PARTITION, DB_SORT_KEY, ItemNotFoundError
from hard.aws.dynamodb.handler import get_db_instance
from hard.aws.models.user import User
from hard.models.exercise import Exercise
from hard.models.workout import Workout

from ...conftest import MOCK_DYNAMO_TABLE_NAME


def make_workout(title="Example"):
    return Workout.model_validate(
        {"workout_date": "2024-05-06", "title": title, "notes": ""}
    )


@pytest.mark.usefixtures("env_vars", "set_up_aws_resources")
class TestProfileIsolation:

    def test_profiles_do_not_see_each_others_data(self, mock_user, fake_user):
        RestProcesses.post(Workout, mock_user, make_workout("Mine"))

        assert len(RestProcesses.get_list(Workout, mock_user)) == 1
        assert RestProcesses.get_list(Workout, fake_user) == []


@pytest.mark.usefixtures("env_vars", "set_up_aws_resources")
class TestDeleteProfileData:

    def test_removes_everything_the_profile_owns(self, mock_user, fake_user):
        for title in ("One", "Two"):
            RestProcesses.post(Workout, mock_user, make_workout(title))
        RestProcesses.post(
            Exercise, mock_user, Exercise.model_validate({"name": "Bench"})
        )
        RestProcesses.post(Workout, fake_user, make_workout("Theirs"))

        removed = delete_profile_data(mock_user.id)

        assert removed == {"Workout": 2, "Exercise": 1}
        assert RestProcesses.get_list(Workout, mock_user) == []
        assert RestProcesses.get_list(Exercise, mock_user) == []

        # Another profile's data is untouched.
        assert len(RestProcesses.get_list(Workout, fake_user)) == 1

    def test_is_safe_to_repeat(self, mock_user):
        RestProcesses.post(Workout, mock_user, make_workout())

        assert delete_profile_data(mock_user.id) == {"Workout": 1}
        assert delete_profile_data(mock_user.id) == {}


@pytest.mark.usefixtures("env_vars", "set_up_aws_resources")
class TestUpdateRace:

    def test_an_update_cannot_resurrect_a_deleted_item(self, mock_user):
        """
        RestProcesses.put reads the item before writing it. Something deleting
        it in between used to have its delete silently undone.
        """
        workout = RestProcesses.post(Workout, mock_user, make_workout("Original"))
        db = get_db_instance()

        stored = workout.to_db()
        db.delete_raw(
            partition_key=stored[DB_PARTITION], sort_key=stored[DB_SORT_KEY]
        )

        workout.title = "Edited"
        with pytest.raises(ItemNotFoundError):
            db.put(data_object=workout, must_exist=True)

        assert RestProcesses.get_list(Workout, mock_user) == []

    def test_a_create_does_not_require_the_item_to_exist(self, mock_user):
        RestProcesses.post(Workout, mock_user, make_workout())
        assert len(RestProcesses.get_list(Workout, mock_user)) == 1
