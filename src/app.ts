import express from "express";
import { json } from "express";
import measurementRoutes from "./routes/measurementRoutes";
import errorHandler from "./middlewares/errorHandler";

const app = express();

app.use(json({ limit: "10mb" }));

app.use("/", measurementRoutes);

// Middleware de tratamento de erros
app.use(errorHandler);

export default app;
