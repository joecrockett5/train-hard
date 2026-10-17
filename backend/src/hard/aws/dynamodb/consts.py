import os

DB_PARTITION = "User_ObjectType"
DB_SORT_KEY = "Timestamp"
DELIMITER = "#"

# Overridable so the compose file and serverless.yml remain the single source
# of the index name; this was previously hardcoded while DYNAMO_ITEM_INDEX_NAME
# was set in the environment and never read.
ITEM_INDEX_NAME = os.getenv("DYNAMO_ITEM_INDEX_NAME", "ItemSearch")
ITEM_INDEX_PARTITION = "object_id"

PARTITION_TEMPLATE = "{user_id}" + DELIMITER + "{object_type}"

# Profiles are not owned by a profile, so they are stored under a reserved
# owner id. This keeps them in a single partition that can be listed before
# any profile has been selected.
SYSTEM_USER_ID = "__system__"


class ItemNotFoundError(Exception):
    pass


class ItemAlreadyExistsError(Exception):
    pass


class ItemAccessUnauthorizedError(Exception):
    pass


class InvalidAttributeChangeError(Exception):
    pass
