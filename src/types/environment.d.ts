declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: "local" | "development";
      BASE_URL: string;
      BUCKET_NAME: string;
      ACCESS_TOKEN: string;
      PORT: string;
    }
  }
}

export {};
