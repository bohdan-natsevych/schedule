"""Find and retire the per-machine install that predates per-user updates.

That installation's uninstaller carries UninstallDelete rules for the folder it
used for the database and uploads, so it must not be run until the data has been
moved out of the way. Every entry point here enforces that.
"""

import ctypes
import os
import sys
from pathlib import Path

# CLAUDE CODE: Inno Setup registers the per-machine install under HKLM with the
# AppId from installer.iss. The per-user install writes the same AppId to HKCU,
# so reading HKLM alone is what distinguishes the old one from the running one.
LEGACY_UNINSTALL_KEY = (
    r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall"
    r"\{A9B8C7D6-E5F4-4321-9876-543210ABCDEF}_is1"
)
UNINSTALL_ARGUMENTS = "/VERYSILENT /SUPPRESSMSGBOXES /NORESTART"
LEGACY_DATA_DIR_NAME = "Schedule Manager"
SE_ERR_ACCESSDENIED = 5


class LegacyInstallError(RuntimeError):
    """The previous installation could not be found or could not be removed."""


def _read_registry_values():
    if sys.platform != "win32":
        return None

    import winreg

    wanted = ("InstallLocation", "UninstallString", "DisplayVersion")
    for access in (winreg.KEY_WOW64_64KEY, winreg.KEY_WOW64_32KEY):
        try:
            with winreg.OpenKey(
                winreg.HKEY_LOCAL_MACHINE,
                LEGACY_UNINSTALL_KEY,
                0,
                winreg.KEY_READ | access,
            ) as key:
                values = {}
                for name in wanted:
                    try:
                        values[name] = winreg.QueryValueEx(key, name)[0]
                    except OSError:
                        pass
                return values
        except OSError:
            continue
    return None


def install_location():
    values = _read_registry_values() or {}
    location = values.get("InstallLocation")
    return Path(location) if location else None


def _executable_from_command(command: str):
    """An UninstallString is a command line, not a path: it may be quoted and
    may carry switches."""
    command = command.strip()
    if not command:
        return None
    if command.startswith('"'):
        end = command.find('"', 1)
        return Path(command[1:end]) if end > 1 else None
    head = command.split(" /")[0].strip()
    return Path(head) if head else None


def uninstaller_path():
    values = _read_registry_values() or {}
    candidate = _executable_from_command(str(values.get("UninstallString") or ""))
    if candidate is not None and candidate.is_file():
        return candidate

    location = install_location()
    if location:
        candidate = location / "unins000.exe"
        if candidate.is_file():
            return candidate
    return None


def legacy_data_path():
    local_app_data = os.environ.get("LOCALAPPDATA")
    return Path(local_app_data) / LEGACY_DATA_DIR_NAME if local_app_data else None


def legacy_data_remaining() -> bool:
    """True while the folder the old uninstaller deletes still holds files."""
    legacy = legacy_data_path()
    if legacy is None or not legacy.is_dir():
        return False
    return any(legacy.rglob("*"))


def describe():
    values = _read_registry_values()
    if not values or uninstaller_path() is None:
        return {"present": False, "safe_to_remove": False}

    return {
        "present": True,
        "safe_to_remove": not legacy_data_remaining(),
        "version": str(values.get("DisplayVersion") or ""),
        "location": str(install_location() or ""),
    }


def _shell_execute(uninstaller: Path, arguments: str) -> None:
    # CLAUDE CODE: the old install is per-machine, so its uninstaller needs
    # elevation that this process does not have; "runas" is what raises the UAC
    # prompt instead of failing outright.
    result = int(
        ctypes.windll.shell32.ShellExecuteW(
            None, "runas", str(uninstaller), arguments, str(uninstaller.parent), 1
        )
    )
    if result <= 32:
        if result == SE_ERR_ACCESSDENIED:
            raise LegacyInstallError("Removal was not confirmed")
        raise LegacyInstallError(f"Could not start the uninstaller (code {result})")


def remove(run=_shell_execute) -> Path:
    uninstaller = uninstaller_path()
    if uninstaller is None:
        raise LegacyInstallError("No previous installation was found")
    if legacy_data_remaining():
        legacy = legacy_data_path()
        raise LegacyInstallError(
            f"{legacy} still holds files and the old uninstaller deletes it; "
            "the data has to be moved before the old version can be removed"
        )
    run(uninstaller, UNINSTALL_ARGUMENTS)
    return uninstaller
