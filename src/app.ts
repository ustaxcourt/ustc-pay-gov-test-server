import express, { json } from "express";
import { getResourceLocal } from "./lambdas/getResourceLambda";
import { getPayPageLambda } from "./lambdas/getPayPageLambda";
import { handleSoapRequestLambda } from "./lambdas/handleSoapRequestLambda";

const app = express();
app.use(json());

app.get("/wsdl", getResourceLocal);

app.get("/wsdl/:file", getResourceLocal);
app.get("/pay", getPayPageLambda);
app.get("/:file", getResourceLocal);

app.post("/wsdl", handleSoapRequestLambda);

export { app };
