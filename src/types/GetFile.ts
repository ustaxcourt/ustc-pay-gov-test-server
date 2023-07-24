import { Filename } from "./Filename";

export type GetFile = (file: Filename) => Promise<string>;
