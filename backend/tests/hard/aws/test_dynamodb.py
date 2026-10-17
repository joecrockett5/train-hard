"""Tests for the DynamoDB wrapper and its number handling."""

from decimal import Decimal

import pytest

from hard.aws.dynamodb.consts import DB_PARTITION, DB_SORT_KEY
from hard.aws.dynamodb.handler import Key, get_db_instance
from hard.aws.dynamodb.numbers import to_db_decimal
from hard.models.set import Set

from ...conftest import MOCK_DYNAMO_TABLE_NAME, MOCK_USER_ID


class TestToDbDecimal:
    """
    `Decimal(float)` expands the float's exact binary value, which overruns
    DynamoDB's 38-digit limit for most one-decimal-place numbers. boto3 then
    raises decimal.Inexact rather than rounding.
    """

    @pytest.mark.parametrize(
        "value, expected",
        [
            (80, "80"),
            (80.5, "80.5"),
            (80.1, "80.1"),
            (77.3, "77.3"),
            (2.25, "2.25"),
            (0.1, "0.1"),
        ],
    )
    def test_keeps_the_number_the_caller_meant(self, value, expected):
        assert to_db_decimal(value) == Decimal(expected)

    @pytest.mark.parametrize("value", [80.1, 77.3, 0.1, 102.7])
    def test_stays_within_dynamodb_precision(self, value):
        # 38 significant digits is the hard limit.
        assert len(to_db_decimal(value).as_tuple().digits) <= 38

    def test_the_old_conversion_would_have_been_rejected(self):
        # Documents the bug this replaced: Decimal(80.1) is 47 digits.
        assert len(Decimal(80.1).as_tuple().digits) > 38


@pytest.mark.usefixtures("env_vars", "set_up_aws_resources")
class TestFractionalWeights:

    @pytest.mark.parametrize("weight", [80, 80.5, 80.1, 77.3, 102.7])
    def test_a_set_round_trips_at_any_weight(self, mock_user, weight):
        db = get_db_instance()

        data_set = Set.model_validate(
            {
                "user_id": MOCK_USER_ID,
                "timestamp": "2024-05-06T00:00:00.000000",
                "object_id": "11111111-1111-1111-1111-111111111111",
                "set_type": "working",
                "weight": weight,
                "unit": "kg",
                "reps": 5,
                "notes": "",
                "exercise_join_id": "22222222-2222-2222-2222-222222222222",
            }
        )

        # Before the fix this raised decimal.Inexact for 80.1 and 77.3.
        db.put(data_object=data_set)

        items = db.query(
            key_expression=Key(DB_PARTITION).eq(f"{MOCK_USER_ID}#Set"),
        )
        assert len(items) == 1
        assert items[0]["weight"] == Decimal(str(weight))


@pytest.mark.usefixtures("env_vars", "set_up_aws_resources")
class TestQueryPagination:

    def test_returns_items_from_beyond_the_first_page(self, mock_user):
        """
        DynamoDB caps a Query response at 1MB. `query` used to return only
        `response["Items"]`, dropping everything behind `LastEvaluatedKey`.
        A ~40KB payload per item puts the cut-off well inside this set.
        """
        db = get_db_instance()
        partition = f"{MOCK_USER_ID}#BaseObject"
        padding = "x" * 40_000
        expected = 40

        for index in range(expected):
            db._table.put_item(
                Item={
                    DB_PARTITION: partition,
                    DB_SORT_KEY: f"2024-05-06T00:00:{index:02d}.000000",
                    "object_id": f"{index:08d}-0000-0000-0000-000000000000",
                    "padding": padding,
                }
            )

        items = db.query(key_expression=Key(DB_PARTITION).eq(partition))

        assert len(items) == expected


@pytest.mark.usefixtures("env_vars", "set_up_aws_resources")
class TestSetSerializationModes:
    """
    DynamoDB needs Decimal, the HTTP API needs JSON numbers. One serializer
    used to do both, so weight and reps reached the browser as strings and the
    set-history comparison compared them lexically ("9" above "80").
    """

    def build(self, weight, reps):
        return Set.model_validate(
            {
                "user_id": MOCK_USER_ID,
                "timestamp": "2024-05-06T00:00:00.000000",
                "object_id": "11111111-1111-1111-1111-111111111111",
                "set_type": "working",
                "weight": weight,
                "unit": "kg",
                "reps": reps,
                "notes": "",
                "exercise_join_id": "22222222-2222-2222-2222-222222222222",
            }
        )

    def test_storage_uses_decimal(self):
        stored = self.build(80.1, 5).to_db()
        assert stored["weight"] == Decimal("80.1")
        assert isinstance(stored["weight"], Decimal)

    @pytest.mark.parametrize("weight", [40, 80.5, 80.1, 102.7])
    def test_json_uses_numbers(self, weight):
        import json

        payload = json.loads(self.build(weight, 5).model_dump_json())
        assert isinstance(payload["weight"], (int, float))
        assert payload["weight"] == pytest.approx(weight)
        assert isinstance(payload["reps"], (int, float))

    def test_json_numbers_compare_numerically(self):
        import json

        heavier = json.loads(self.build(80, 5).model_dump_json())["weight"]
        lighter = json.loads(self.build(9, 5).model_dump_json())["weight"]
        # As strings this assertion fails: "9" > "80".
        assert heavier > lighter
