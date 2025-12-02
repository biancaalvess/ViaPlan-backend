import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configurações padrão de upload
export const UPLOAD_CONFIG = {
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  ALLOWED_TYPES: [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/tiff',
    'image/bmp',
    'application/dwg',
    'application/dxf'
  ],
  UPLOAD_DIRS: {
    PLANTS: 'uploads/plants',
    THUMBNAILS: 'thumbnails/plants',
    PROJECTS: 'uploads/projects',
    TAKEOFFS: 'uploads/takeoffs'
  }
};

// Criar diretórios de upload
export const ensureUploadDirectories = () => {
  Object.values(UPLOAD_CONFIG.UPLOAD_DIRS).forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

// Storage para arquivos de plantas
export const plantsStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadDir = UPLOAD_CONFIG.UPLOAD_DIRS.PLANTS;
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `plant-${uniqueSuffix}${ext}`);
  }
});

// Filtro de arquivos
export const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (UPLOAD_CONFIG.ALLOWED_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type not supported. Allowed types: ${UPLOAD_CONFIG.ALLOWED_TYPES.join(', ')}`));
  }
};

// Configuração do multer para plantas
export const plantsUpload = multer({
  storage: plantsStorage,
  limits: {
    fileSize: UPLOAD_CONFIG.MAX_FILE_SIZE
  },
  fileFilter
});

// Configuração do multer para projetos
export const projectsUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      const uploadDir = UPLOAD_CONFIG.UPLOAD_DIRS.PROJECTS;
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (_req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      cb(null, `project-${uniqueSuffix}${ext}`);
    }
  }),
  limits: {
    fileSize: UPLOAD_CONFIG.MAX_FILE_SIZE
  },
  fileFilter
});

// Middleware de erro para upload
export const handleUploadError = (error: any, _req: any, res: any, next: any) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File too large',
        message: `File size must be less than ${UPLOAD_CONFIG.MAX_FILE_SIZE / (1024 * 1024)}MB`
      });
    }
  }
  
  if (error.message.includes('File type not supported')) {
    return res.status(400).json({
      success: false,
      error: 'Invalid file type',
      message: error.message
    });
  }
  
  next(error);
};
