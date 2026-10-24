from uuid import UUID

from pydantic import Field, field_serializer

from hard.aws.dynamodb.base_object import BaseObject
from hard.aws.dynamodb.object_type import ObjectType


class ProgressPhoto(BaseObject):
    """
    A photo taken alongside a weigh-in.

    The row is the record; the image itself is a file on disk, named by this
    row's own id. DynamoDB caps an item at 400KB and a phone photo is several
    megabytes, so the bytes were never going to live here -- and keeping them
    out means listing a month of weigh-ins does not drag their photos along
    with it.

    `width` and `height` are stored so a thumbnail can reserve its space
    before the image arrives, and so a later side-by-side has the aspect
    ratios without opening every file.
    """

    object_type: ObjectType = ObjectType.PROGRESS_PHOTO
    body_weight_id: UUID
    content_type: str = Field(default="image/jpeg")
    width: int = Field(default=0)
    height: int = Field(default=0)
    byte_size: int = Field(default=0)

    @field_serializer("body_weight_id")
    def body_weight_id_to_str(self, body_weight_id: UUID) -> str:
        return str(body_weight_id)
