import express, { Request, Response } from "express";
import { body, validationResult } from "express-validator";
import { v4 as uuidv4 } from "uuid";
import multer from "multer";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Buffer } from "buffer";

// Tipo para armazenar leituras no banco de dados temporário
interface Measurement {
  customerCode: string;
  measureType: string;
  measureDate: Date;
}

const app = express();
const port = process.env.PORT || 3000;

// Configurar o middleware express.json() para permitir corpos de requisição maiores
app.use(express.json({ limit: "10mb" }));

// Configurar o multer para armazenar arquivos na memória
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Banco de dados temporário para leituras
const temporaryDatabase: Measurement[] = [];

// Middleware para validar os dados enviados
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
    .withMessage('Measure type deve ser "WATER" ou "GAS" (case insensitive).'),
];

// Função para verificar se já existe uma leitura para o mês atual
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

// Função para adicionar uma leitura ao banco de dados temporário
const addMeasurement = (
  customerCode: string,
  measureType: string,
  measureDate: Date
): void => {
  temporaryDatabase.push({ customerCode, measureType, measureDate });
};

// Configurar o cliente do Google Generative AI
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

// Função para enviar resposta de erro
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
        errors
          .array()
          .map((err) => err.msg)
          .join(", ")
      );
    }

    const { customer_code, measure_datetime, measure_type } = req.body;
    const measureDate = new Date(measure_datetime);
    const normalizedMeasureType = measure_type.toUpperCase();

    try {
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

      if (!req.file) {
        return sendErrorResponse(
          res,
          400,
          "INVALID_FILE",
          "Arquivo de imagem não enviado."
        );
      }

      const imageBuffer = req.file.buffer;
      const measureValue = await getMeasureValueFromGeminiLLM(imageBuffer);
      const measureUUID = uuidv4();
      const imageUrl = `https://your-storage-service.com/images/${measureUUID}.png`;

      // Adiciona a nova leitura ao banco de dados temporário
      addMeasurement(customer_code, normalizedMeasureType, measureDate);

      return res.status(200).json({
        image_url: imageUrl,
        measure_value: measureValue,
        measure_uuid: measureUUID,
      });
    } catch (error) {
      console.error("Erro ao processar a imagem:", error);
      return sendErrorResponse(
        res,
        500,
        "PROCESSING_ERROR",
        "Erro ao processar a imagem."
      );
    }
  }
);

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
