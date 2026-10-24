from typing import Optional
from uuid import UUID, uuid4

from fastapi import APIRouter, HTTPException, Response
from starlette.requests import Request

from hard.app import photo_store
from hard.app.processes import RestProcesses, photos_for_body_weight
from hard.aws.interfaces.fastapi import request
from hard.models.body_weight import BodyWeight
from hard.models.progress_photo import ProgressPhoto

router = APIRouter(prefix="/progress-photos")


@router.get("", response_model=list[ProgressPhoto])
async def list_progress_photos(
    req: Request,
    body_weight: Optional[UUID] = None,
) -> list[ProgressPhoto]:
    """
    Every photo the profile has, or one weigh-in's.

    Unfiltered is what the weights page asks for: the rows carry no image
    data, so reading them all once and grouping them by weigh-in is one
    request where asking per entry would be one per row on screen.
    """
    user = request.get_user_claims(req)

    if body_weight:
        return photos_for_body_weight(user, body_weight)

    return RestProcesses.get_list(ProgressPhoto, user)


@router.post("", response_model=ProgressPhoto, status_code=201)
async def create_progress_photo(
    req: Request,
    body_weight: UUID,
    width: int = 0,
    height: int = 0,
) -> ProgressPhoto:
    """
    Takes the image as the request body rather than a multipart form.

    One file per request needs no form at all, and the runtime image has no
    multipart parser on purpose -- `requirements.txt` records it being taken
    out as unused. The content type is the header, the weigh-in it belongs to
    is the query string, and the body is the bytes.

    The dimensions come from the caller, which has just resized the image and
    so already knows them. Reading them here instead would mean an imaging
    library in the runtime for two integers used to reserve layout space.
    """
    user = request.get_user_claims(req)

    # Raises if it is missing or belongs to someone else, before anything is
    # written to disk.
    RestProcesses.get(BodyWeight, user, body_weight)

    content_type = (req.headers.get("content-type") or "").split(";")[0].strip()
    data = await req.body()

    if not data:
        raise HTTPException(status_code=400, detail="Empty image body")

    photo_id = uuid4()

    try:
        photo_store.save(user.id, photo_id, content_type, data)
    except photo_store.UnsupportedImageError as error:
        raise HTTPException(status_code=415, detail=str(error))
    except photo_store.ImageTooLargeError as error:
        raise HTTPException(status_code=413, detail=str(error))

    photo = ProgressPhoto(
        object_id=photo_id,
        body_weight_id=body_weight,
        content_type=content_type,
        width=width,
        height=height,
        byte_size=len(data),
    )

    try:
        return RestProcesses.post(ProgressPhoto, user, photo)
    except Exception:
        # The file is written first so that a row never points at bytes that
        # are not there -- a broken thumbnail is worse than a file nothing
        # refers to. If the row fails, take the file back out.
        photo_store.delete(user.id, photo_store.file_name_for(photo_id, content_type))
        raise


@router.get("/{photo_id}/file")
async def get_progress_photo_file(
    req: Request,
    photo_id: str,
) -> Response:
    user = request.get_user_claims(req)
    photo = RestProcesses.get(ProgressPhoto, user, UUID(photo_id))
    file_name = photo_store.file_name_for(photo.object_id, photo.content_type)

    try:
        data = photo_store.read(user.id, file_name)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Photo file is missing")

    return Response(
        content=data,
        media_type=photo.content_type,
        # Immutable: the row's id names the file and the bytes never change,
        # so a photo already on the device never needs fetching again.
        headers={"Cache-Control": "private, max-age=31536000, immutable"},
    )


@router.delete("/{photo_id}", response_model=ProgressPhoto)
async def delete_progress_photo(
    req: Request,
    photo_id: str,
) -> ProgressPhoto:
    user = request.get_user_claims(req)
    photo = RestProcesses.get(ProgressPhoto, user, UUID(photo_id))

    deleted = RestProcesses.delete(ProgressPhoto, user, UUID(photo_id))
    photo_store.delete(
        user.id, photo_store.file_name_for(photo.object_id, photo.content_type)
    )

    return deleted
