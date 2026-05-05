export const APP_ENVS = ["local", "dev", "test"] as const;
export type AppEnv = (typeof APP_ENVS)[number];

const isAppEnv = (value: string): value is AppEnv =>
  (APP_ENVS as readonly string[]).includes(value);

export const getAppEnv = (): AppEnv => {
  const raw = process.env.APP_ENV;

  if (!raw) {
    if (process.env.NODE_ENV === "test") {
      return "test";
    }
    throw new Error("APP_ENV is not set");
  }

  if (!isAppEnv(raw)) {
    throw new Error(
      `Invalid APP_ENV "${raw}". Expected one of: ${APP_ENVS.join(", ")}`,
    );
  }

  return raw;
};

export const isLocal = (): boolean => getAppEnv() === "local";

export const isDeployed = (): boolean => getAppEnv() === "dev";
