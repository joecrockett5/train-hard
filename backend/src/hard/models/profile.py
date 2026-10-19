from pydantic import field_serializer, field_validator

from hard.aws.dynamodb.base_object import BaseObject
from hard.aws.dynamodb.object_type import ObjectType
from hard.models import WeightUnit


class Profile(BaseObject):
    """
    A named, non-password-protected profile.

    Profiles are the registry of who can use the app. Every other object is
    partitioned by the `object_id` of the profile that owns it, so selecting a
    profile selects a data set. Profiles themselves are owned by the reserved
    `SYSTEM_USER` so that they live in one partition and can be listed without
    a profile already being selected.

    `dark_mode` and `weight_unit` are display preferences rather than data,
    but they belong here for the same reason the rest does: they are per
    profile, and a profile is the only thing the app knows about whoever is
    using it. Their defaults are also what lets profiles written before each
    field existed load without a migration.

    `weight_unit` changes how weights are shown, not how they are stored:
    every weight in the database is kilograms, so switching between units
    never rewrites anything and never loses precision in the round trip.
    """

    object_type: ObjectType = ObjectType.PROFILE
    name: str
    dark_mode: bool = False
    weight_unit: WeightUnit = WeightUnit.KILOGRAMS

    @field_validator("weight_unit")
    @classmethod
    def process_weight_unit(cls, weight_unit: str):
        return WeightUnit(weight_unit)

    @field_serializer("weight_unit")
    def serialize_weight_unit(self, weight_unit: WeightUnit):
        return weight_unit.value
