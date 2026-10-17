from starlette.requests import Request

from hard.aws.models.user import User

PROFILE_HEADER = "X-Profile-Id"


class AuthorizationError(Exception):
    pass


def get_profile_id(request: Request) -> str:
    """
    Reads the active profile id from the request.

    Profiles are not password protected: whichever id the caller sends is
    trusted, and all it does is select a data partition. The frontend keeps
    the chosen profile in a cookie and forwards it on this header.
    """
    profile_id = request.headers.get(PROFILE_HEADER)
    if not profile_id:
        raise AuthorizationError(
            f"Missing `{PROFILE_HEADER}` header: no profile selected"
        )
    return profile_id


def get_user_claims(request: Request) -> User:
    """
    Resolves the request's `User`.

    Named for the Cognito-era implementation this replaces, which read claims
    injected into the Lambda event by an API Gateway authorizer
    (`request.scope["aws.event"]`). Routes are unchanged; only the resolution
    strategy differs. See infra-legacy/README.md.
    """
    profile_id = get_profile_id(request)
    return User.model_validate(
        {"id": profile_id, "email": f"{profile_id}@profile.local"}
    )
