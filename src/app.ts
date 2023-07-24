import express, { json } from "express";
import { getResourceLambda } from "./lambdas/getResourceLambda";
import { getPayPageLambda } from "./lambdas/getPayPageLambda";
import { handleSoapRequestLambda } from "./lambdas/handleSoapRequestLambda";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(json());

app.get("/wsdl", getResourceLambda);

app.get("/wsdl/:file", getResourceLambda);
app.get("/pay", getPayPageLambda);
app.get("/:file", getResourceLambda);

app.post("/wsdl", handleSoapRequestLambda);

export { app };
