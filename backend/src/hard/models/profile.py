from hard.aws.dynamodb.base_object import BaseObject
from hard.aws.dynamodb.object_type import ObjectType


class Profile(BaseObject):
    """
    A named, non-password-protected profile.

    Profiles are the registry of who can use the app. Every other object is
    partitioned by the `object_id` of the profile that owns it, so selecting a
    profile selects a data set. Profiles themselves are owned by the reserved
    `SYSTEM_USER` so that they live in one partition and can be listed without
    a profile already being selected.
    """

    object_type: ObjectType = ObjectType.PROFILE
    name: str
