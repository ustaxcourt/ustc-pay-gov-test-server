import express, { json } from "express";

import { getFile } from "./useCases/getFile";
import { handleSoapRequest } from "./useCases/handleSoapRequest";
import { showPayPage } from "./useCases/showPayPage";

const app = express();
app.use(json());

app.get("/wsdl", getFile);
app.get("/wsdl/:file", getFile);
app.get("/pay", showPayPage);
app.get("/:file", getFile);

app.post("/wsdl", handleSoapRequest);

export { app };
