import { app } from "./app";

// make default port 3366

const port = "3366";
app.listen(port, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});
