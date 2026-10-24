"""
Where progress photo files live.

A directory per profile under `PHOTO_STORAGE_PATH`, each file named after the
`ProgressPhoto` row that describes it. Keeping a profile's photos in one
directory means deleting that profile is a single recursive remove rather
than a walk over every row.

Deliberately not in DynamoDB: an item caps at 400KB and a photo is several
megabytes. Deliberately not an object store either -- this runs as a couple
of containers on one machine, and a directory is the thing that needs no
service, no credentials and no second system to back up.
"""

import os
import re
import shutil
from pathlib import Path
from uuid import UUID

# Which image types are accepted, and what each is written as. Anything else
# is refused rather than stored under a name that misdescribes it.
SUFFIXES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}

# A phone photo shrunk on the way in is a few hundred KB. This is a long way
# above that, and still low enough that a mistake cannot fill the disk.
MAX_BYTES = 12 * 1024 * 1024

# Both halves of a path are ids we generated, but they arrive back as strings
# from the database, so they are checked rather than trusted: "../" in either
# would otherwise write outside the root.
SAFE_NAME = re.compile(r"^[0-9a-fA-F-]{36}\.(jpg|png|webp)$")
SAFE_PROFILE = re.compile(r"^[0-9a-zA-Z._-]{1,128}$")


class UnsupportedImageError(ValueError):
    """The content type is not one of `SUFFIXES`."""


class ImageTooLargeError(ValueError):
    """The upload is over `MAX_BYTES`."""


def photo_root() -> Path:
    """Read per call, not at import, so tests can point it somewhere else."""
    return Path(os.environ.get("PHOTO_STORAGE_PATH", "/photos"))


def file_name_for(photo_id: UUID, content_type: str) -> str:
    try:
        return f"{photo_id}{SUFFIXES[content_type]}"
    except KeyError:
        raise UnsupportedImageError(f"Unsupported image type: {content_type}")


def path_for(profile_id: str, file_name: str) -> Path:
    if not SAFE_PROFILE.match(profile_id) or not SAFE_NAME.match(file_name):
        raise ValueError(f"Refusing unsafe photo path: {profile_id}/{file_name}")

    return photo_root() / profile_id / file_name


def save(profile_id: str, photo_id: UUID, content_type: str, data: bytes) -> str:
    """Writes the image and returns the file name the row should record."""
    if len(data) > MAX_BYTES:
        raise ImageTooLargeError(f"{len(data)} bytes is over the {MAX_BYTES} limit")

    file_name = file_name_for(photo_id, content_type)
    destination = path_for(profile_id, file_name)
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(data)

    return file_name


def read(profile_id: str, file_name: str) -> bytes:
    return path_for(profile_id, file_name).read_bytes()


def delete(profile_id: str, file_name: str) -> None:
    """Missing is fine: the row is going either way, and this is not reversible."""
    path_for(profile_id, file_name).unlink(missing_ok=True)


def delete_profile_photos(profile_id: str) -> None:
    if not SAFE_PROFILE.match(profile_id):
        raise ValueError(f"Refusing unsafe profile directory: {profile_id}")

    shutil.rmtree(photo_root() / profile_id, ignore_errors=True)
