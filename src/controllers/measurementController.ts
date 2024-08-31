import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import {
  addMeasurement,
  checkExistingMeasurement,
  findMeasurementByUUID,
  confirmMeasurement,
  temporaryDatabase,
} from "../services/measurementService";
import { getMeasureValueFromGeminiLLM } from "../services/geminiService";
import { sendErrorResponse } from "../utils/responseHandler";
import { processImage } from "../utils/imageProcessor";

export const uploadMeasurement = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return sendErrorResponse(
      res,
      400,
      "INVALID_DATA",
      "Os dados fornecidos no corpo da requisição são inválidos."
    );
  }

  const { customer_code, measure_datetime, measure_type } = req.body;
  const measureDate = new Date(measure_datetime);
  const normalizedMeasureType = measure_type.toUpperCase();

  try {
    if (
      checkExistingMeasurement(
        customer_code,
        normalizedMeasureType,
        measureDate
      )
    ) {
      return sendErrorResponse(
        res,
        409,
        "DOUBLE_REPORT",
        "Leitura do mês já realizada"
      );
    }

    const imageBuffer = processImage(req);
    const measureValue = await getMeasureValueFromGeminiLLM(imageBuffer!);
    const measurement = addMeasurement(
      customer_code,
      normalizedMeasureType,
      measureDate,
      measureValue
    );
    const imageUrl = `https://your-storage-service.com/images/${measurement.measureUUID}.png`;

    return res.status(200).json({
      image_url: imageUrl,
      measure_value: measurement.measureValue,
      measure_uuid: measurement.measureUUID,
    });
  } catch (error) {
    console.error("Erro ao processar a imagem:", error);
    return sendErrorResponse(
      res,
      400,
      "INVALID_DATA",
      "Erro ao processar a imagem."
    );
  }
};

export const confirmMeasurementReading = (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendErrorResponse(
      res,
      400,
      "INVALID_DATA",
      errors
        .array()
        .map((err) => err.msg)
        .join(", ")
    );
  }

  const { measure_uuid, confirmed_value } = req.body;
  const measurement = findMeasurementByUUID(measure_uuid);

  if (!measurement) {
    return sendErrorResponse(
      res,
      404,
      "MEASURE_NOT_FOUND",
      "Leitura do mês já realizada"
    );
  }

  if (measurement.confirmed) {
    return sendErrorResponse(
      res,
      409,
      "CONFIRMATION_DUPLICATE",
      "Leitura do mês já realizada."
    );
  }

  confirmMeasurement(measurement, confirmed_value);

  return res.status(200).json({ success: true });
};

export const listMeasurements = (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendErrorResponse(
      res,
      400,
      "INVALID_QUERY",
      errors
        .array()
        .map((err) => err.msg)
        .join(", ")
    );
  }

  const { customer_code } = req.params;
  const { measure_type } = req.query;

  let customerMeasurements = temporaryDatabase.filter(
    (measurement) => measurement.customerCode === customer_code
  );

  if (measure_type) {
    const normalizedMeasureType = (measure_type as string).toUpperCase();
    customerMeasurements = customerMeasurements.filter(
      (measurement) => measurement.measureType === normalizedMeasureType
    );
  }

  if (customerMeasurements.length === 0) {
    return sendErrorResponse(
      res,
      404,
      "MEASURES_NOT_FOUND",
      "Nenhuma leitura encontrada."
    );
  }

  return res.status(200).json(customerMeasurements);
};
