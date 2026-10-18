"""
End-to-end tests through the FastAPI app.

Nothing covered the HTTP layer before: not the profile header that replaced
the Cognito authorizer, not the status codes, not the aggregate endpoint.
These drive the real app with a TestClient against a moto-backed table.
"""

import pytest
from fastapi.testclient import TestClient

from hard.app.main import app
from hard.aws.interfaces.fastapi.request import PROFILE_HEADER


@pytest.fixture
def client(env_vars, set_up_aws_resources):
    with TestClient(app) as test_client:
        yield test_client


def profile(client, name="Joe") -> str:
    response = client.post("/api/profiles", json={"name": name})
    assert response.status_code == 201, response.text
    return response.json()["object_id"]


def headers(profile_id: str) -> dict[str, str]:
    return {PROFILE_HEADER: profile_id}


def make_workout(title="Push day"):
    return {"workout_date": "2026-10-17", "title": title, "notes": "notes"}


class TestHealth:

    def test_reports_ok_when_dynamodb_is_reachable(self, client):
        response = client.get("/health")

        assert response.status_code == 200
        assert response.json() == {"status": "ok", "dynamodb": "ok"}


class TestProfiles:

    def test_starts_empty(self, client):
        assert client.get("/api/profiles").json() == []

    def test_create_then_list(self, client):
        profile_id = profile(client, "Sam")

        listed = client.get("/api/profiles").json()
        assert [p["name"] for p in listed] == ["Sam"]
        assert listed[0]["object_id"] == profile_id

    def test_profiles_are_readable_without_a_profile_header(self, client):
        """The picker has to list them before one has been chosen."""
        profile(client)
        assert client.get("/api/profiles").status_code == 200

    def test_delete_removes_the_profiles_data(self, client):
        profile_id = profile(client)
        client.post("/api/workouts", json=make_workout(), headers=headers(profile_id))

        assert client.delete(f"/api/profiles/{profile_id}").status_code == 200

        assert client.get("/api/profiles").json() == []
        assert client.get("/api/workouts", headers=headers(profile_id)).json() == []


class TestAuthorization:

    def test_a_missing_profile_header_is_401(self, client):
        response = client.get("/api/workouts")

        assert response.status_code == 401
        assert PROFILE_HEADER in response.json()["detail"]

    def test_another_profiles_item_is_401(self, client):
        mine = profile(client, "Mine")
        theirs = profile(client, "Theirs")

        created = client.post(
            "/api/workouts", json=make_workout(), headers=headers(mine)
        ).json()

        response = client.get(
            f"/api/workouts/{created['object_id']}", headers=headers(theirs)
        )
        assert response.status_code == 401

    def test_profiles_have_separate_data(self, client):
        mine = profile(client, "Mine")
        theirs = profile(client, "Theirs")

        client.post("/api/workouts", json=make_workout(), headers=headers(mine))

        assert len(client.get("/api/workouts", headers=headers(mine)).json()) == 1
        assert client.get("/api/workouts", headers=headers(theirs)).json() == []


class TestWorkouts:

    def test_create_read_update_delete(self, client):
        profile_id = profile(client)
        auth = headers(profile_id)

        created = client.post("/api/workouts", json=make_workout(), headers=auth)
        assert created.status_code == 201
        workout = created.json()
        assert workout["title"] == "Push day"
        assert workout["user_id"] == profile_id

        fetched = client.get(f"/api/workouts/{workout['object_id']}", headers=auth)
        assert fetched.status_code == 200
        assert fetched.json()["object_id"] == workout["object_id"]

        updated = client.put(
            f"/api/workouts/{workout['object_id']}",
            json={**workout, "title": "Pull day"},
            headers=auth,
        )
        assert updated.status_code == 200
        assert updated.json()["title"] == "Pull day"

        assert (
            client.delete(
                f"/api/workouts/{workout['object_id']}", headers=auth
            ).status_code
            == 200
        )
        assert client.get("/api/workouts", headers=auth).json() == []

    def test_a_missing_workout_is_404(self, client):
        auth = headers(profile(client))

        response = client.get(
            "/api/workouts/00000000-0000-0000-0000-000000000000", headers=auth
        )
        # Previously these handlers raised HTTPException from inside an
        # exception handler; this asserts the status actually reaches the
        # client.
        assert response.status_code == 404

    def test_filtering_by_date(self, client):
        auth = headers(profile(client))

        client.post("/api/workouts", json=make_workout(), headers=auth)
        client.post(
            "/api/workouts",
            json={**make_workout("Other"), "workout_date": "2026-10-18"},
            headers=auth,
        )

        matching = client.get("/api/workouts?date=2026-10-17", headers=auth).json()
        assert [w["title"] for w in matching] == ["Push day"]


class TestSets:

    @pytest.mark.parametrize("weight", [80, 80.5, 80.1, 77.3, 102.7])
    def test_a_set_can_be_logged_at_any_weight(self, client, weight):
        """Fractional weights used to return 500 from decimal.Inexact."""
        auth = headers(profile(client))

        response = client.post(
            "/api/sets",
            json={
                "set_type": "working",
                "weight": weight,
                "unit": "kg",
                "reps": 5,
                "notes": "",
                "exercise_join_id": "22222222-2222-2222-2222-222222222222",
            },
            headers=auth,
        )

        assert response.status_code == 201, response.text
        assert response.json()["weight"] == pytest.approx(weight)

    def test_weight_and_reps_are_json_numbers(self, client):
        auth = headers(profile(client))

        client.post(
            "/api/sets",
            json={
                "set_type": "working",
                "weight": 80.5,
                "unit": "kg",
                "reps": 5,
                "notes": "",
                "exercise_join_id": "22222222-2222-2222-2222-222222222222",
            },
            headers=auth,
        )

        logged = client.get("/api/sets", headers=auth).json()[0]
        assert isinstance(logged["weight"], (int, float))
        assert isinstance(logged["reps"], (int, float))


class TestWorkoutDetail:

    def test_returns_the_workout_its_exercises_and_their_sets(self, client):
        auth = headers(profile(client))

        workout = client.post(
            "/api/workouts", json=make_workout(), headers=auth
        ).json()
        exercise = client.post(
            "/api/exercises", json={"name": "Bench", "description": "d"}, headers=auth
        ).json()
        join = client.post(
            "/api/exercise-joins",
            json={
                "workout_id": workout["object_id"],
                "exercise_id": exercise["object_id"],
            },
            headers=auth,
        ).json()
        client.post(
            "/api/sets",
            json={
                "set_type": "working",
                "weight": 80,
                "unit": "kg",
                "reps": 5,
                "notes": "",
                "exercise_join_id": join["object_id"],
            },
            headers=auth,
        )
        # An exercise not in this workout still belongs in all_exercises.
        client.post(
            "/api/exercises", json={"name": "Squat", "description": ""}, headers=auth
        )

        detail = client.get(
            f"/api/workouts/{workout['object_id']}/detail", headers=auth
        )
        assert detail.status_code == 200
        body = detail.json()

        assert body["workout"]["object_id"] == workout["object_id"]
        assert [e["name"] for e in body["exercises"]] == ["Bench"]
        assert body["exercises"][0]["join_id"] == join["object_id"]
        assert len(body["exercises"][0]["sets"]) == 1
        assert sorted(e["name"] for e in body["all_exercises"]) == ["Bench", "Squat"]

    def test_a_workout_with_no_exercises(self, client):
        auth = headers(profile(client))
        workout = client.post(
            "/api/workouts", json=make_workout(), headers=auth
        ).json()

        body = client.get(
            f"/api/workouts/{workout['object_id']}/detail", headers=auth
        ).json()

        assert body["exercises"] == []

    def test_another_profile_cannot_read_it(self, client):
        mine = headers(profile(client, "Mine"))
        theirs = headers(profile(client, "Theirs"))

        workout = client.post("/api/workouts", json=make_workout(), headers=mine).json()

        response = client.get(
            f"/api/workouts/{workout['object_id']}/detail", headers=theirs
        )
        assert response.status_code == 401


class TestBodyWeights:

    @staticmethod
    def weigh_in(entry_date="2026-10-17", weight=80.1, notes=""):
        return {
            "entry_date": entry_date,
            "weight": weight,
            "notes": notes,
        }

    def test_create_read_update_delete(self, client):
        profile_id = profile(client)
        auth = headers(profile_id)

        created = client.post(
            "/api/body-weights", json=self.weigh_in(notes="morning"), headers=auth
        )
        assert created.status_code == 201, created.text
        entry = created.json()
        assert entry["entry_date"] == "2026-10-17"
        assert entry["notes"] == "morning"
        assert entry["user_id"] == profile_id

        fetched = client.get(f"/api/body-weights/{entry['object_id']}", headers=auth)
        assert fetched.status_code == 200
        assert fetched.json()["object_id"] == entry["object_id"]

        updated = client.put(
            f"/api/body-weights/{entry['object_id']}",
            json={**entry, "weight": 79.6},
            headers=auth,
        )
        assert updated.status_code == 200
        assert updated.json()["weight"] == 79.6

        assert (
            client.delete(
                f"/api/body-weights/{entry['object_id']}", headers=auth
            ).status_code
            == 200
        )
        assert client.get("/api/body-weights", headers=auth).json() == []

    def test_a_fractional_weight_round_trips(self, client):
        """
        The same Decimal conversion a set needs: `Decimal(80.1)` has more
        significant digits than DynamoDB accepts, so a plain float would 500
        here rather than storing the number the caller meant.
        """
        auth = headers(profile(client))

        created = client.post(
            "/api/body-weights", json=self.weigh_in(weight=80.1), headers=auth
        )

        assert created.status_code == 201, created.text
        assert created.json()["weight"] == 80.1

    def test_the_weight_is_a_json_number_not_a_string(self, client):
        """The chart scales it arithmetically; a string would sort "9" above "80"."""
        auth = headers(profile(client))
        client.post("/api/body-weights", json=self.weigh_in(), headers=auth)

        listed = client.get("/api/body-weights", headers=auth).json()

        assert isinstance(listed[0]["weight"], (int, float))

    def test_notes_are_optional(self, client):
        auth = headers(profile(client))

        response = client.post(
            "/api/body-weights",
            json={"entry_date": "2026-10-17", "weight": 80},
            headers=auth,
        )

        assert response.status_code == 201, response.text
        assert response.json()["notes"] == ""

    def test_a_weigh_in_carries_no_unit(self, client):
        """Body weight is always kilograms; see `BodyWeight` for why."""
        auth = headers(profile(client))

        created = client.post(
            "/api/body-weights", json=self.weigh_in(), headers=auth
        ).json()

        assert "unit" not in created

    def test_a_missing_entry_is_404(self, client):
        auth = headers(profile(client))

        response = client.get(
            "/api/body-weights/00000000-0000-0000-0000-000000000000", headers=auth
        )

        assert response.status_code == 404

    def test_profiles_do_not_see_each_others_weigh_ins(self, client):
        mine = headers(profile(client, "Mine"))
        theirs = headers(profile(client, "Theirs"))

        created = client.post(
            "/api/body-weights", json=self.weigh_in(), headers=mine
        ).json()

        assert len(client.get("/api/body-weights", headers=mine).json()) == 1
        assert client.get("/api/body-weights", headers=theirs).json() == []
        assert (
            client.get(
                f"/api/body-weights/{created['object_id']}", headers=theirs
            ).status_code
            == 401
        )

    def test_deleting_a_profile_removes_its_weigh_ins(self, client):
        """
        `delete_profile_data` walks every object type, so a new one is only
        covered if it is in the enum. This is the check that it is.
        """
        profile_id = profile(client)
        auth = headers(profile_id)
        client.post("/api/body-weights", json=self.weigh_in(), headers=auth)

        assert client.delete(f"/api/profiles/{profile_id}").status_code == 200

        assert client.get("/api/body-weights", headers=auth).json() == []
