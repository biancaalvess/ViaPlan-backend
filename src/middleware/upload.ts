import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request, Response, NextFunction } from 'express';

// Configuração básica do Multer
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Aceitar apenas PDFs e imagens
  if (file.mimetype === 'application/pdf' || file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de arquivo não suportado'));
  }
};

// Configuração básica do upload
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 200 * 1024 * 1024, // 200MB
    files: 1
  }
});

// Middleware de upload simplificado
export const uploadMiddleware = {
  single: (fieldName: string) => upload.single(fieldName),
  multiple: (fieldName: string, maxCount: number = 10) => upload.array(fieldName, maxCount),
  fields: (fields: multer.Field[]) => upload.fields(fields),
  
  // Middleware de validação básico
  validate: (req: Request, res: Response, next: NextFunction) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Arquivo não fornecido',
        message: 'Por favor, selecione um arquivo para upload'
      });
    }
    return next();
  },
  
  // Middleware de pré-validação
  preValidation: (_req: Request, _res: Response, next: NextFunction) => {
    // Validação básica - sempre passa
    return next();
  }
};

// Função para criar rate limiter (simplificada)
export const createRateLimiter = (_options: any = {}) => {
  return (_req: Request, _res: Response, next: NextFunction) => {
    // Implementação básica - sempre permite
    next();
  };
};
