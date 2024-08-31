import { Response } from "express";

export const sendErrorResponse = (
  res: Response,
  statusCode: number,
  errorCode: string,
  errorDescription: string
) => {
  return res.status(statusCode).json({
    error_code: errorCode,
    error_description: errorDescription,
  });
};

export const extractMeasureValue = (text: string): number => {
  const match = text.match(/\d+/);
  if (match) {
    const measureValue = parseInt(match[0], 10);
    if (isNaN(measureValue)) {
      throw new Error("Valor da medição não reconhecido.");
    }
    return measureValue;
  }
  throw new Error("Valor da medição não encontrado.");
};
