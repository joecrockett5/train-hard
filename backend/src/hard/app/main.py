from fastapi import APIRouter, FastAPI, HTTPException, Response, status
from fastapi.responses import JSONResponse
from starlette.requests import Request

from hard.app.routes import (
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


@app.exception_handler(InvalidAttributeChangeError)
async def invalid_attr_exc_handler(_req: Request, exc: InvalidAttributeChangeError):
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@app.exception_handler(AuthorizationError)
async def authorization_exc_handler(_req: Request, exc: AuthorizationError):
    # Returns a response rather than raising HTTPException. Raising from inside
    # an exception handler does not produce that status: Starlette lets it
    # propagate to the server error middleware, which answers 500. The handlers
    # below are the app's pre-existing pattern and are left as they are.
    return JSONResponse(
        status_code=status.HTTP_401_UNAUTHORIZED, content={"detail": str(exc)}
    )


@app.exception_handler(ItemAccessUnauthorizedError)
async def item_access_auth_exc_handler(_req: Request, exc: ItemAccessUnauthorizedError):
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc))


@app.exception_handler(ItemNotFoundError)
async def item_not_found_exc_handler(_req: Request, exc: ItemNotFoundError):
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@app.exception_handler(ItemAlreadyExistsError)
async def item_already_exists_exc_handler(_req: Request, exc: ItemAlreadyExistsError):
    raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
