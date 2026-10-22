from uuid import UUID

from fastapi import APIRouter
from starlette.requests import Request

from hard.app.processes import (
    RestProcesses,
    template_detail,
    template_join_filter,
    templates_with_tags,
)
from hard.aws.interfaces.fastapi import request
from hard.models.template import Template
from hard.models.template_detail import TemplateDetail, TemplateWithTags
from hard.models.template_join import TemplateJoin

router = APIRouter(prefix="/templates")


@router.get("", response_model=list[TemplateWithTags])
async def list_templates(
    req: Request,
) -> list[TemplateWithTags]:
    """
    With tags attached, because the list page filters on them.

    Reading them here costs two queries for the whole list rather than one
    per template, which is what asking each template for its own tags would
    have cost.
    """
    user = request.get_user_claims(req)

    return templates_with_tags(user)


@router.get("/{template_id}", response_model=Template)
async def get_template(
    req: Request,
    template_id: str,
) -> Template:
    user = request.get_user_claims(req)
    template = RestProcesses.get(Template, user, UUID(template_id))

    return template


@router.get("/{template_id}/detail", response_model=TemplateDetail)
async def get_template_detail(
    req: Request,
    template_id: str,
) -> TemplateDetail:
    user = request.get_user_claims(req)

    return template_detail(user, UUID(template_id))


@router.post("", response_model=Template, status_code=201)
async def create_template(
    req: Request,
    template: Template,
) -> Template:
    user = request.get_user_claims(req)
    created_template = RestProcesses.post(Template, user, template)

    return created_template


@router.put("/{template_id}", response_model=Template)
async def update_template(
    req: Request,
    template_id: str,
    template: Template,
) -> Template:
    user = request.get_user_claims(req)
    template.object_id = UUID(template_id)
    updated_template = RestProcesses.put(Template, user, template)

    return updated_template


@router.delete("/{template_id}", response_model=Template)
async def delete_template(
    req: Request,
    template_id: str,
) -> Template:
    """
    Takes the template's exercise links with it.

    Left behind they would be invisible but billable, and `template_detail`
    would hand them back if the id were ever reused. Tag joins are left, the
    way deleting a workout or an exercise leaves them: nothing reads a tag
    join whose target is gone.
    """
    user = request.get_user_claims(req)

    for join in template_join_filter(user, template_id=UUID(template_id)):
        RestProcesses.delete(TemplateJoin, user, join.object_id)

    return RestProcesses.delete(Template, user, UUID(template_id))
