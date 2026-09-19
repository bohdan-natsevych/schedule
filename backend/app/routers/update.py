from fastapi import APIRouter, HTTPException

from app.services import update as update_service
from app.version import APP_VERSION

router = APIRouter(prefix="/update", tags=["update"])


@router.get("/status")
def read_status():
    """Installed version, plus whether this build can install an update at all."""
    return {
        "installed_version": APP_VERSION,
        "can_install": update_service.is_frozen(),
        "releases_url": update_service.RELEASES_PAGE,
    }


@router.get("/check")
def check_for_updates():
    try:
        release = update_service.latest_release()
        available = update_service.is_newer(release.version, APP_VERSION)
    except update_service.UpdateError as error:
        raise HTTPException(status_code=502, detail=str(error))

    return {
        "installed_version": APP_VERSION,
        "latest_version": release.version,
        "update_available": available,
        "can_install": update_service.is_frozen(),
        "page_url": release.page_url,
    }


@router.post("/install")
def install_update():
    """Download the newest installer, start it silently, and step aside.

    The installer relaunches the application once it has replaced the files, so
    the browser tab this request came from is expected to lose the server.
    """
    if not update_service.is_frozen():
        raise HTTPException(
            status_code=409,
            detail="Updates can only be installed in the packaged application",
        )

    try:
        release = update_service.latest_release()
        if not update_service.is_newer(release.version, APP_VERSION):
            raise HTTPException(status_code=409, detail="Already up to date")
        installer = update_service.download_installer(release)
        update_service.run_installer(installer)
    except update_service.UpdateError as error:
        raise HTTPException(status_code=502, detail=str(error))

    update_service.quit_after_installer_starts()
    return {"status": "installing", "version": release.version}
