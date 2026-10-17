DB_PARTITION = "User_ObjectType"
DB_SORT_KEY = "Timestamp"
DELIMITER = "#"

ITEM_INDEX_NAME = "ItemSearch"
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
