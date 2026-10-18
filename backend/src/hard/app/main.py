from fastapi import APIRouter, FastAPI, Response, status
from fastapi.responses import JSONResponse
from starlette.requests import Request

from hard.app.routes import (
    body_weights,
    exercise_joins,
    exercises,
    profiles,
    sets,
    tag_joins,
    tags,
    templates,
    workouts,
)
from hard.aws.dynamodb.consts import (
    InvalidAttributeChangeError,
    ItemAccessUnauthorizedError,
    ItemAlreadyExistsError,
    ItemNotFoundError,
)
from hard.aws.dynamodb.handler import get_db_instance
from hard.aws.interfaces.fastapi import request
from hard.aws.interfaces.fastapi.request import AuthorizationError
from hard.aws.models.user import User

api = APIRouter(prefix="/api")
api.include_router(workouts.router)
api.include_router(exercises.router)
api.include_router(sets.router)
api.include_router(tags.router)
api.include_router(exercise_joins.router)
api.include_router(tag_joins.router)
api.include_router(templates.router)
api.include_router(profiles.router)
api.include_router(body_weights.router)


@api.get("/user", response_model=User)
def get_user_claims(req: Request):
    return request.get_user_claims(req)


app = FastAPI(title="hard-api")
app.include_router(api)


@app.get("/health", include_in_schema=False)
def health(response: Response):
    """
    Liveness plus a DynamoDB reachability check.

    Deliberately outside the `/api` prefix and not profile-scoped, so the
    compose healthcheck can call it without selecting a profile.
    """
    try:
        get_db_instance().ping()
    except Exception as exc:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {"status": "degraded", "dynamodb": "unreachable", "detail": str(exc)}

    return {"status": "ok", "dynamodb": "ok"}


# Every handler below returns a JSONResponse rather than raising
# HTTPException. Raising from inside an exception handler does not produce that
# status code: Starlette does not re-enter exception handling for it, so the
# HTTPException propagates to ServerErrorMiddleware and the client gets a bare
# 500. These handlers previously raised, which meant a missing item answered
# 500 instead of 404, an ownership failure 500 instead of 401, and so on.
def _error_response(status_code: int, exc: Exception) -> JSONResponse:
    return JSONResponse(status_code=status_code, content={"detail": str(exc)})


@app.exception_handler(InvalidAttributeChangeError)
async def invalid_attr_exc_handler(_req: Request, exc: InvalidAttributeChangeError):
    return _error_response(status.HTTP_400_BAD_REQUEST, exc)


@app.exception_handler(AuthorizationError)
async def authorization_exc_handler(_req: Request, exc: AuthorizationError):
    return _error_response(status.HTTP_401_UNAUTHORIZED, exc)


@app.exception_handler(ItemAccessUnauthorizedError)
async def item_access_auth_exc_handler(_req: Request, exc: ItemAccessUnauthorizedError):
    return _error_response(status.HTTP_401_UNAUTHORIZED, exc)


@app.exception_handler(ItemNotFoundError)
async def item_not_found_exc_handler(_req: Request, exc: ItemNotFoundError):
    return _error_response(status.HTTP_404_NOT_FOUND, exc)


@app.exception_handler(ItemAlreadyExistsError)
async def item_already_exists_exc_handler(_req: Request, exc: ItemAlreadyExistsError):
    return _error_response(status.HTTP_409_CONFLICT, exc)
