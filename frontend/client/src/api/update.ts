import { api } from "./client";

export interface LegacyInstall {
  present: boolean;
  safe_to_remove: boolean;
  version?: string;
  location?: string;
}

export interface UpdateStatus {
  installed_version: string;
  can_install: boolean;
  releases_url: string;
  legacy_install: LegacyInstall;
}

export interface UpdateCheck {
  installed_version: string;
  latest_version: string;
  update_available: boolean;
  can_install: boolean;
  page_url: string;
}

export const fetchUpdateStatus = async (): Promise<UpdateStatus> => {
  const { data } = await api.get<UpdateStatus>("/update/status");
  return data;
};

export const checkForUpdate = async (): Promise<UpdateCheck> => {
  const { data } = await api.get<UpdateCheck>("/update/check");
  return data;
};

export const installUpdate = async (): Promise<void> => {
  await api.post("/update/install");
};

export const removeLegacyInstall = async (): Promise<void> => {
  await api.post("/update/remove-legacy");
};
