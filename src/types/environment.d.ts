declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: "development" | "production" | "staging";
      BASE_URL: string;
      BUCKET_NAME: string;
      ACCESS_TOKEN: string;
    }
  }
}

export {};
