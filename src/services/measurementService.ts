import { v4 as uuidv4 } from "uuid";
import { Measurement } from "../models/measurement";

export const temporaryDatabase: Measurement[] = [];

export const checkExistingMeasurement = (
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

export const addMeasurement = (
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

export const findMeasurementByUUID = (
  measureUUID: string
): Measurement | undefined => {
  return temporaryDatabase.find(
    (measurement) => measurement.measureUUID === measureUUID
  );
};

export const confirmMeasurement = (
  measurement: Measurement,
  confirmedValue: number
): void => {
  measurement.measureValue = confirmedValue;
  measurement.confirmed = true;
};
