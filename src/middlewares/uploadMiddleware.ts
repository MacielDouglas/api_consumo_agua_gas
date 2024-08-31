import multer from "multer";

// Configuração do armazenamento em memória
const storage = multer.memoryStorage();

// Configuração do middleware de upload
const upload = multer({ storage });

export default upload;
