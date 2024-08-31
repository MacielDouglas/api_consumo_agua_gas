import { body, query } from "express-validator";

export const validateRequest = [
  body("customer_code")
    .isString()
    .withMessage("Customer code deve ser uma string."),
  body("measure_datetime")
    .isISO8601()
    .withMessage("Measure_datetime deve ser uma data válida."),
  body("measure_type")
    .isString()
    .custom((value) => ["WATER", "GAS"].includes(value.toUpperCase()))
    .withMessage('MeasureType deve ser "WATER" ou "GAS".'),
];

export const validateConfirmation = [
  body("measure_uuid")
    .isUUID()
    .withMessage("Os dados fornecidos no corpo da requisição são inválidos."),
  body("confirmed_value")
    .isFloat({ min: 0 })
    .withMessage("Confirmed value deve ser um número positivo."),
];

export const validateQuery = [
  query("measure_type")
    .optional()
    .isString()
    .custom((value) => ["WATER", "GAS"].includes(value.toUpperCase()))
    .withMessage('Measure type deve ser "WATER" ou "GAS".'),
];
