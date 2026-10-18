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

    `dark_mode` is a display preference rather than data, but it belongs here
    for the same reason the rest does: it is per profile, and a profile is the
    only thing the app knows about whoever is using it. Defaulting it to False
    is also what lets profiles written before the field existed load without a
    migration.
    """

    object_type: ObjectType = ObjectType.PROFILE
    name: str
    dark_mode: bool = False
