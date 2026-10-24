from uuid import UUID

from fastapi import APIRouter
from starlette.requests import Request

from hard.app import photo_store
from hard.app.processes import RestProcesses, photos_for_body_weight
from hard.aws.interfaces.fastapi import request
from hard.models.body_weight import BodyWeight
from hard.models.progress_photo import ProgressPhoto

router = APIRouter(prefix="/body-weights")


@router.get("", response_model=list[BodyWeight])
async def list_body_weights(
    req: Request,
) -> list[BodyWeight]:
    user = request.get_user_claims(req)

    return RestProcesses.get_list(BodyWeight, user)


@router.get("/{body_weight_id}", response_model=BodyWeight)
async def get_body_weight(
    req: Request,
    body_weight_id: str,
) -> BodyWeight:
    user = request.get_user_claims(req)
    body_weight = RestProcesses.get(BodyWeight, user, UUID(body_weight_id))

    return body_weight


@router.post("", response_model=BodyWeight, status_code=201)
async def create_body_weight(
    req: Request,
    body_weight: BodyWeight,
) -> BodyWeight:
    user = request.get_user_claims(req)
    created_body_weight = RestProcesses.post(BodyWeight, user, body_weight)

    return created_body_weight


@router.put("/{body_weight_id}", response_model=BodyWeight)
async def update_body_weight(
    req: Request,
    body_weight_id: str,
    body_weight: BodyWeight,
) -> BodyWeight:
    user = request.get_user_claims(req)
    body_weight.object_id = UUID(body_weight_id)
    updated_body_weight = RestProcesses.put(BodyWeight, user, body_weight)

    return updated_body_weight


@router.delete("/{body_weight_id}", response_model=BodyWeight)
async def delete_body_weight(
    req: Request,
    body_weight_id: str,
) -> BodyWeight:
    """
    Takes the weigh-in's progress photos with it, rows and files both.

    Left behind, the files would be unreachable -- nothing but the weigh-in
    points at them -- and would sit on the disk until someone went looking.
    """
    user = request.get_user_claims(req)

    for photo in photos_for_body_weight(user, UUID(body_weight_id)):
        RestProcesses.delete(ProgressPhoto, user, photo.object_id)
        photo_store.delete(
            user.id, photo_store.file_name_for(photo.object_id, photo.content_type)
        )

    return RestProcesses.delete(BodyWeight, user, UUID(body_weight_id))
