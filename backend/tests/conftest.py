import boto3
import moto
import pytest

from hard.aws.dynamodb.consts import DB_PARTITION, DB_SORT_KEY, ITEM_INDEX_NAME
from hard.aws.dynamodb.handler import reset_db_instance
from hard.aws.models.user import User

MOCK_USER_ID = "mock_user"
FAKE_USER_ID = "fake_user"
MOCK_DYNAMO_TABLE_NAME = "mock_table"


@pytest.fixture(autouse=True)
def aws_test_environment(monkeypatch):
    """
    Pins a dummy region and credentials so the suite does not depend on the
    developer's `~/.aws` config, and clears `DYNAMODB_ENDPOINT_URL` so that
    boto3 is intercepted by `moto` rather than talking to DynamoDB Local when
    the tests run inside the backend container.
    """
    monkeypatch.setenv("AWS_DEFAULT_REGION", "eu-west-2")
    monkeypatch.setenv("AWS_ACCESS_KEY_ID", "testing")
    monkeypatch.setenv("AWS_SECRET_ACCESS_KEY", "testing")
    monkeypatch.setenv("AWS_SECURITY_TOKEN", "testing")
    monkeypatch.setenv("AWS_SESSION_TOKEN", "testing")
    monkeypatch.delenv("DYNAMODB_ENDPOINT_URL", raising=False)
    yield


@pytest.fixture(autouse=True)
def clear_cached_dynamodb_resource():
    """
    The boto3 resource is cached per process. Each test builds its own `moto`
    mock, so a resource created under a previous mock must not be reused.
    """
    reset_db_instance()
    yield
    reset_db_instance()


@pytest.fixture
def mock_user() -> User:
    return User(id=MOCK_USER_ID, email="mock@user.com")


@pytest.fixture
def fake_user() -> User:
    return User(id=FAKE_USER_ID, email="fake@user.com")


@pytest.fixture
def env_vars():
    pytest.MonkeyPatch().setenv("DYNAMO_TABLE_NAME", MOCK_DYNAMO_TABLE_NAME)
    yield


@pytest.fixture
def set_up_aws_resources():
    with moto.mock_aws():
        client = boto3.client("dynamodb")
        client.create_table(
            TableName=MOCK_DYNAMO_TABLE_NAME,
            AttributeDefinitions=[
                {
                    "AttributeName": DB_PARTITION,
                    "AttributeType": "S",
                },
                {
                    "AttributeName": DB_SORT_KEY,
                    "AttributeType": "S",
                },
                {
                    "AttributeName": "object_id",
                    "AttributeType": "S",
                },
            ],
            KeySchema=[
                {
                    "AttributeName": DB_PARTITION,
                    "KeyType": "HASH",
                },
                {
                    "AttributeName": DB_SORT_KEY,
                    "KeyType": "RANGE",
                },
            ],
            BillingMode="PAY_PER_REQUEST",
            GlobalSecondaryIndexes=[
                {
                    "IndexName": ITEM_INDEX_NAME,
                    "KeySchema": [{"AttributeName": "object_id", "KeyType": "HASH"}],
                    "Projection": {"ProjectionType": "ALL"},
                }
            ],
        )
        yield client
