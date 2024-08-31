import { Router } from "express";
import {
  uploadMeasurement,
  confirmMeasurementReading,
  listMeasurements,
} from "../controllers/measurementController";
import {
  validateRequest,
  validateConfirmation,
  validateQuery,
} from "../middlewares/validationMiddleware";
import upload from "../middlewares/uploadMiddleware";

const router = Router();

router.post(
  "/upload",
  upload.single("image"),
  validateRequest,
  uploadMeasurement
);
router.patch("/confirm", validateConfirmation, confirmMeasurementReading);
router.get("/:customer_code/list", validateQuery, listMeasurements);

export default router;
