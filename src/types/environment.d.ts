declare global {
  namespace NodeJS {
    interface ProcessEnv {
      // Optional because they may not be set at process boot — runtime
      // validation lives in src/config/appEnv.ts. The narrowed unions
      // still reject typos (e.g., NODE_ENV === "local") at compile time.
      NODE_ENV?: "development" | "production" | "test";
      APP_ENV?: "local" | "dev" | "test";
      BASE_URL: string;
      BUCKET_NAME: string;
      ACCESS_TOKEN: string;
      PORT: string;
    }
  }
}

export {};
