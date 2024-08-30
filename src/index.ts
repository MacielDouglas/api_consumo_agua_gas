import express, { Request, Response } from "express";
import { body, validationResult, query } from "express-validator";
import { v4 as uuidv4 } from "uuid";
import multer from "multer";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Buffer } from "buffer";

interface Measurement {
  customerCode: string;
  measureType: string;
  measureDate: Date;
  measureUUID: string;
  measureValue: number;
  confirmed: boolean;
}

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: "10mb" }));

const storage = multer.memoryStorage();
const upload = multer({ storage });

// Banco de dados temporário para leituras
const temporaryDatabase: Measurement[] = [];

const validateRequest = [
  body("customer_code")
    .isString()
    .withMessage("Customer code deve ser uma string."),
  body("measure_datetime")
    .isISO8601()
    .withMessage("Measure datetime deve ser uma data válida."),
  body("measure_type")
    .isString()
    .custom((value) => ["WATER", "GAS"].includes(value.toUpperCase()))
    .withMessage('Measure type deve ser "WATER" ou "GAS".'),
];

const checkExistingMeasurement = (
  customerCode: string,
  measureType: string,
  measureDate: Date
): boolean => {
  return temporaryDatabase.some(
    (measurement) =>
      measurement.customerCode === customerCode &&
      measurement.measureType === measureType &&
      measurement.measureDate.getMonth() === measureDate.getMonth() &&
      measurement.measureDate.getFullYear() === measureDate.getFullYear()
  );
};

const addMeasurement = (
  customerCode: string,
  measureType: string,
  measureDate: Date,
  measureValue: number
): Measurement => {
  const measurement: Measurement = {
    customerCode,
    measureType,
    measureDate,
    measureUUID: uuidv4(),
    measureValue,
    confirmed: false,
  };
  temporaryDatabase.push(measurement);
  return measurement;
};

const findMeasurementByUUID = (
  measureUUID: string
): Measurement | undefined => {
  return temporaryDatabase.find(
    (measurement) => measurement.measureUUID === measureUUID
  );
};

const confirmMeasurement = (
  measurement: Measurement,
  confirmedValue: number
): void => {
  measurement.measureValue = confirmedValue;
  measurement.confirmed = true;
};

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const extractMeasureValue = (text: string): number => {
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

const getMeasureValueFromGeminiLLM = async (
  imageBuffer: Buffer
): Promise<number> => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = "Qual é o valor da medição na imagem?";

    const imagePart = {
      inlineData: {
        data: imageBuffer.toString("base64"),
        mimeType: "image/png",
      },
    };

    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = await response.text();

    return extractMeasureValue(text);
  } catch (error) {
    console.error("Erro ao obter valor da medição do Gemini LLM:", error);
    throw new Error("Erro ao obter valor da medição do Gemini LLM.");
  }
};

const sendErrorResponse = (
  res: Response,
  statusCode: number,
  errorCode: string,
  description: string
) => {
  return res.status(statusCode).json({
    error_code: errorCode,
    error_description: description,
  });
};

app.post(
  "/upload",
  upload.single("image"),
  validateRequest,
  async (req: Request, res: Response) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return sendErrorResponse(
        res,
        400,
        "INVALID_DATA",
        "Os dados fornecidos no corpo da requisição são inválidos."
      );
    }

    const { customer_code, measure_datetime, measure_type, image } = req.body;
    const measureDate = new Date(measure_datetime);
    const normalizedMeasureType = measure_type.toUpperCase();

    // Verifica se a leitura já foi realizada no mês
    const existingMeasurement = checkExistingMeasurement(
      customer_code,
      normalizedMeasureType,
      measureDate
    );
    if (existingMeasurement) {
      return sendErrorResponse(
        res,
        409,
        "DOUBLE_REPORT",
        "Leitura do mês já realizada"
      );
    }

    // Processa a imagem
    let imageBuffer: Buffer | undefined;

    if (req.file) {
      imageBuffer = req.file.buffer;
    } else if (image && typeof image === "string") {
      try {
        // Verifica se a string é uma base64 válida
        const base64Pattern = /^data:image\/[a-zA-Z]+;base64,/;
        if (base64Pattern.test(image)) {
          // Remove o cabeçalho da base64 e converte para Buffer
          imageBuffer = Buffer.from(image.split(",")[1], "base64");
        } else {
          throw new Error("Formato de base64 inválido.");
        }
      } catch (error) {
        return sendErrorResponse(
          res,
          400,
          "INVALID_DATA",
          "Os dados fornecidos no corpo da requisição são inválidos."
        );
      }
    } else {
      return sendErrorResponse(
        res,
        400,
        "INVALID_DATA",
        "Imagem não enviada ou formato inválido."
      );
    }

    try {
      // Extrai o valor da medição usando a API Gemini
      const measureValue = await getMeasureValueFromGeminiLLM(imageBuffer);

      // Adiciona a medição ao banco de dados
      const measurement = addMeasurement(
        customer_code,
        normalizedMeasureType,
        measureDate,
        measureValue
      );
      const imageUrl = `https://your-storage-service.com/images/${measurement.measureUUID}.png`;

      // Retorna a resposta de sucesso
      return res.status(200).json({
        image_url: imageUrl,
        measure_value: measurement.measureValue,
        measure_uuid: measurement.measureUUID,
      });
    } catch (error) {
      console.error("Erro ao processar a imagem:", error);
      return sendErrorResponse(
        res,
        409,
        "PROCESSING_ERROR",
        "Erro ao processar a imagem."
      );
    }
  }
);

app.patch(
  "/confirm",
  [
    body("measure_uuid")
      .isString()
      .withMessage("measure_uuid deve ser uma string."),
    body("confirmed_value")
      .isInt()
      .withMessage("confirmed_value deve ser um número inteiro."),
  ],
  (req: Request, res: Response) => {
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
        "Leitura não encontrada."
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

    return res.status(200).json({
      success: true,
    });
  }
);

app.get(
  "/:customer_code/list",
  [
    query("measure_type")
      .optional()
      .isString()
      .custom((value) => ["WATER", "GAS"].includes(value.toUpperCase()))
      .withMessage('"Tipo de medição não permitida"'),
  ],
  (req: Request, res: Response) => {
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

    return res.status(200).json({
      customer_code,
      measures: customerMeasurements.map((measurement) => ({
        measure_uuid: measurement.measureUUID,
        measure_datetime: measurement.measureDate,
        measure_type: measurement.measureType,
        has_confirmed: measurement.confirmed,
        image_url: `https://your-storage-service.com/images/${measurement.measureUUID}.png`,
      })),
    });
  }
);

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
