from uuid import UUID

from fastapi import APIRouter
from starlette.requests import Request

from hard.app.processes import RestProcesses
from hard.aws.interfaces.fastapi import request
from hard.models.body_weight import BodyWeight

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
    user = request.get_user_claims(req)
    deleted_body_weight = RestProcesses.delete(BodyWeight, user, UUID(body_weight_id))

    return deleted_body_weight
