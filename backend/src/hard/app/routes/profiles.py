from uuid import UUID

from fastapi import APIRouter

from hard.app.processes import RestProcesses, delete_profile_data
from hard.aws.dynamodb.consts import SYSTEM_USER_ID
from hard.aws.models.user import User
from hard.models.profile import Profile

router = APIRouter(prefix="/profiles")

# Profiles are owned by a reserved id rather than by a profile, so that the
# registry can be read before a profile has been selected. This is the only
# router that does not resolve a profile from the request.
SYSTEM_USER = User(id=SYSTEM_USER_ID, email=f"{SYSTEM_USER_ID}@profile.local")


@router.get("", response_model=list[Profile])
async def list_profiles() -> list[Profile]:
    return RestProcesses.get_list(Profile, SYSTEM_USER)


@router.get("/{profile_id}", response_model=Profile)
async def get_profile(profile_id: str) -> Profile:
    return RestProcesses.get(Profile, SYSTEM_USER, UUID(profile_id))


@router.post("", response_model=Profile, status_code=201)
async def create_profile(profile: Profile) -> Profile:
    return RestProcesses.post(Profile, SYSTEM_USER, profile)


@router.put("/{profile_id}", response_model=Profile)
async def update_profile(profile_id: str, profile: Profile) -> Profile:
    profile.object_id = UUID(profile_id)
    return RestProcesses.put(Profile, SYSTEM_USER, profile)


@router.delete("/{profile_id}", response_model=Profile)
async def delete_profile(profile_id: str) -> Profile:
    """
    Removes the profile and everything it owns.

    The profile row is deleted last, so a failure part-way through leaves the
    profile still listed and the delete repeatable, rather than orphaning the
    data behind a profile that no longer appears.
    """
    deleted_counts = delete_profile_data(profile_id)
    if deleted_counts:
        print(f"Deleted data for profile {profile_id}: {deleted_counts}", flush=True)

    return RestProcesses.delete(Profile, SYSTEM_USER, UUID(profile_id))
