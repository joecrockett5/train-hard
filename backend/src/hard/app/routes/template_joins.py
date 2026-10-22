from typing import Optional
from uuid import UUID

from fastapi import APIRouter, HTTPException
from starlette.requests import Request

from hard.app.processes import RestProcesses, template_join_filter
from hard.aws.interfaces.fastapi import request
from hard.models.template_join import TemplateJoin

router = APIRouter(prefix="/template-joins")


@router.get("", response_model=list[TemplateJoin])
async def list_template_joins(
    req: Request,
    exercise: Optional[UUID] = None,
    template: Optional[UUID] = None,
) -> list[TemplateJoin]:
    user = request.get_user_claims(req)

    if exercise or template:
        return template_join_filter(user, exercise, template)

    return RestProcesses.get_list(TemplateJoin, user)


@router.get("/{template_join_id}", response_model=TemplateJoin)
async def get_template_join(
    req: Request,
    template_join_id: str,
) -> TemplateJoin:
    user = request.get_user_claims(req)

    return RestProcesses.get(TemplateJoin, user, UUID(template_join_id))


@router.post("", response_model=TemplateJoin, status_code=201)
async def create_template_join(
    req: Request,
    template_join: TemplateJoin,
) -> TemplateJoin:
    user = request.get_user_claims(req)

    return RestProcesses.post(TemplateJoin, user, template_join)


@router.delete("/{template_join_id}", response_model=TemplateJoin)
async def delete_template_join(
    req: Request,
    template_join_id: str,
) -> TemplateJoin:
    user = request.get_user_claims(req)

    return RestProcesses.delete(TemplateJoin, user, UUID(template_join_id))


@router.delete("", response_model=TemplateJoin)
async def delete_template_join_from_ids(
    req: Request,
    exercise: UUID,
    template: UUID,
) -> TemplateJoin:
    """
    Removes one exercise from one template, named by the pair rather than by
    the join's own id, so a caller holding only the two ids need not look it
    up first.
    """
    user = request.get_user_claims(req)
    relevant_joins = template_join_filter(user, exercise, template)

    if len(relevant_joins) == 0:
        raise HTTPException(status_code=404, detail="No joins found")

    if len(relevant_joins) > 1:
        raise HTTPException(status_code=409, detail="Multiple joins found")

    return RestProcesses.delete(TemplateJoin, user, relevant_joins[0].object_id)
