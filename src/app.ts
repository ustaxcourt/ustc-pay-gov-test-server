import express from "express";
import { getResourceLocal } from "./lambdas/getResourceLambda";
import { getPayPageLambda } from "./lambdas/getPayPageLambda";
import { handleSoapRequestLocal } from "./lambdas/handleSoapRequestLambda";
import { createAppContext } from "./appContext";

const appContext = createAppContext();
const app = express();

// pass raw body to handlers
app.use((req, _res, next) => {
  var data = "";
  req.setEncoding("utf8");
  req.on("data", function (chunk) {
    data += chunk;
  });

  req.on("end", function () {
    req.body = data;
    next();
  });
});

app.use((_req, res, next) => {
  res.locals.appContext = appContext;
  next();
});

app.get("/wsdl", getResourceLocal);

app.get("/wsdl/:file", getResourceLocal);
app.get("/pay", getPayPageLambda);
app.get("/:file", getResourceLocal);

app.post("/wsdl", handleSoapRequestLocal);

export { app };
