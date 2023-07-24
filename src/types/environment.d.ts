declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: "local" | "production";
      BASE_URL: string;
      BUCKET_NAME: string;
      ACCESS_TOKEN: string;
    }
  }
}

export {};
