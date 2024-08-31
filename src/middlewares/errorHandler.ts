import { Request, Response, NextFunction } from "express";
import { sendErrorResponse } from "../utils/responseHandler";

const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error(`Erro: ${err.message}`);

  // Se o erro já tiver um status associado, use-o, caso contrário, retorne 500.
  const statusCode = res.statusCode !== 200 ? res.statusCode : 500;

  // Evitar enviar detalhes específicos do erro em ambiente de produção.
  const isProduction = process.env.NODE_ENV === "production";
  const errorDescription = isProduction ? "Internal Server Error" : err.message;

  sendErrorResponse(res, statusCode, "INTERNAL_SERVER_ERROR", errorDescription);
};

export default errorHandler;
