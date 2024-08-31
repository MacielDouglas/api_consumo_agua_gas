import { Request } from "express";
import { Buffer } from "buffer";

export const processImage = (req: Request): Buffer | undefined => {
  let imageBuffer: Buffer | undefined;

  if (req.file) {
    imageBuffer = req.file.buffer;
  } else if (req.body.image && typeof req.body.image === "string") {
    const base64Pattern = /^data:image\/[a-zA-Z]+;base64,/;
    if (base64Pattern.test(req.body.image)) {
      imageBuffer = Buffer.from(req.body.image.split(",")[1], "base64");
    } else {
      throw new Error("Formato de base64 inválido.");
    }
  } else {
    throw new Error("Imagem não enviada ou formato inválido.");
  }

  return imageBuffer;
};
