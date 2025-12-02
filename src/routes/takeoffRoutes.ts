import express from 'express';
import { TakeoffController } from '../controllers/takeoffController';
import { authenticate } from '../middleware/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// Configuração do Multer para upload de arquivos
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    // Usar pasta uploads/takeoff na raiz do projeto
    const uploadDir = path.join(process.cwd(), 'uploads', 'takeoff');
    
    // Criar diretório se não existir
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
      console.log('📁 Diretório de upload criado:', uploadDir);
    }
    
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    // Preservar extensão original e criar nome único
    const ext = path.extname(file.originalname);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = `takeoff-${uniqueSuffix}${ext}`;
    
    console.log('📄 Nome do arquivo gerado:', filename);
    cb(null, filename);
  }
});

const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Aceitar apenas PDFs
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed. Please upload a valid PDF document.'));
  }
};

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 200 * 1024 * 1024, // 200MB
    files: 1 // Máximo 1 arquivo por vez para evitar problemas
  },
  fileFilter: fileFilter
});

// Aplicar middleware de autenticação em todas as rotas
router.use(authenticate);

// ============================================================================
// MEASUREMENTS - Medições de takeoff
// ============================================================================
router.get('/measurements/:projectId', TakeoffController.getMeasurements);
router.post('/measurements', TakeoffController.createMeasurement);
router.put('/measurements/:id', TakeoffController.updateMeasurement);
router.delete('/measurements/:id', TakeoffController.deleteMeasurement);

// ============================================================================
// TAKEOFF DRAWINGS - Desenhos de takeoff
// ============================================================================
router.get('/drawings/:projectId', TakeoffController.getTakeoffDrawings);
router.post('/drawings', TakeoffController.createTakeoffDrawing);

// ============================================================================
// FILE UPLOAD - Upload de arquivos
// ============================================================================
router.post('/upload/:projectId', upload.single('file'), TakeoffController.uploadTakeoffFile);

// Endpoint para verificar se arquivo existe
router.get('/file/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(process.cwd(), 'uploads', 'takeoff', filename);
    
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      res.json({
        success: true,
        exists: true,
        filename,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        url: `/uploads/takeoff/${filename}`
      });
    } else {
      res.status(404).json({
        success: false,
        exists: false,
        filename,
        message: 'Arquivo não encontrado'
      });
    }
  } catch (error) {
    console.error('Erro ao verificar arquivo:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// ============================================================================
// TRENCHES - Valas/escavações
// ============================================================================
router.get('/trenches/:projectId', TakeoffController.getTrenches);
router.post('/trenches', TakeoffController.createTrench);

// ============================================================================
// CONDUITS - Tubulações
// ============================================================================
router.get('/conduits/:projectId', TakeoffController.getConduits);
router.post('/conduits', TakeoffController.createConduit);

// ============================================================================
// VAULTS - Poços/caixas
// ============================================================================
router.get('/vaults/:projectId', TakeoffController.getVaults);
router.post('/vaults', TakeoffController.createVault);

// ============================================================================
// YARDAGES - Volumes
// ============================================================================
router.get('/yardages/:projectId', TakeoffController.getYardages);
router.post('/yardages', TakeoffController.createYardage);

// ============================================================================
// NOTES - Anotações
// ============================================================================
router.get('/notes/:projectId', TakeoffController.getNotes);
router.post('/notes', TakeoffController.createNote);

// ============================================================================
// SUMMARIES AND EXPORTS - Resumos e exportações
// ============================================================================
router.get('/summary/:projectId', TakeoffController.getTakeoffSummary);
// exportMeasurements e clearProjectMeasurements não implementados - usar endpoints de medições

export default router; 