declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: "development" | "production" | "test";
      APP_ENV: "local" | "dev" | "test";
      BASE_URL: string;
      BUCKET_NAME: string;
      ACCESS_TOKEN: string;
      PORT: string;
    }
  }
}

export {};
