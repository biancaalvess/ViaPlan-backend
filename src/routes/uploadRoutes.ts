import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { PlantsUnifiedService } from '../services/plants-unified-service';

const router = Router();
const plantsService = new PlantsUnifiedService();

// Configuração do Multer para upload de arquivos
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'plants');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 200 * 1024 * 1024, // 200MB
  }
});

// ============================================================================
// UPLOAD DE PLANTAS - ENDPOINT PRINCIPAL
// ============================================================================

router.post('/plants', upload.single('file'), async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('🌿 UPLOAD DE PLANTA INICIADO!');
    console.log('📄 Headers:', req.headers);
    console.log('📄 Body:', req.body);
    console.log('📄 File:', req.file);
    
    // Validações
    if (!req.file) {
      console.log('❌ Arquivo não encontrado no request');
      res.status(400).json({
        success: false,
        error: 'Arquivo é obrigatório',
        message: 'Por favor, selecione um arquivo para upload'
      });
      return;
    }
    
    const { name, code, description, project_id, status, location } = req.body;
    
    if (!name || !code) {
      res.status(400).json({
        success: false,
        error: 'Dados obrigatórios',
        message: 'Nome e código da planta são obrigatórios'
      });
      return;
    }
    
    // Criar planta usando o serviço
    if (!req.file) {
      res.status(400).json({
        success: false,
        error: 'Arquivo é obrigatório'
      });
      return;
    }
    
    const plant = await plantsService.createPlant({
      name,
      code,
      description: description || undefined,
      project_id: project_id || '',
      status: status || 'active',
      location: location || undefined,
      created_by: 'system',
      file_path: req.file.path,
      file_url: `/uploads/plants/${req.file.filename}`,
      file_size: req.file.size,
      file_type: path.extname(req.file.originalname).substring(1) || 'pdf',
      mime_type: req.file.mimetype,
      original_filename: req.file.originalname
    } as any, req.file);
    
    console.log('✅ Planta criada com sucesso:', plant.id);
    
    // Retornar resposta de sucesso
    res.status(201).json({
      success: true,
      message: 'Planta criada com sucesso!',
      data: {
        plant: {
          id: plant.id,
          name: plant.name,
          code: plant.code,
          description: plant.description,
          file_path: plant.file_path,
          file_size: plant.file_size,
          mime_type: plant.mime_type,
          original_filename: plant.original_filename,
          status: plant.status,
          created_at: plant.created_at
        }
      }
    });
    
  } catch (error: any) {
    console.error('❌ Erro no upload de planta:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno no upload',
      message: 'Falha ao criar planta',
      details: error.message
    });
  }
});

// ============================================================================
// LISTAR PLANTAS
// ============================================================================

router.get('/plants', async (_req: Request, res: Response): Promise<void> => {
  try {
    const plants = await plantsService.listPlants();
    
    res.json({
      success: true,
      data: plants,
      total: plants.length
    });
  } catch (error: any) {
    console.error('❌ Erro ao listar plantas:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno',
      message: 'Falha ao listar plantas',
      details: error.message
    });
  }
});

// ============================================================================
// OBTER PLANTA POR ID
// ============================================================================

router.get('/plants/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const plant = await plantsService.getPlantById(id);
    
    if (!plant) {
      res.status(404).json({
        success: false,
        error: 'Planta não encontrada',
        message: `Planta com ID ${id} não foi encontrada`
      });
    }
    
    res.json({
      success: true,
      data: { plant }
    });
  } catch (error: any) {
    console.error('❌ Erro ao obter planta:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno',
      message: 'Falha ao obter planta',
      details: error.message
    });
  }
});

// ============================================================================
// EXPORTAR PLANTA COM EDIÇÕES
// ============================================================================

router.post('/plants/:id/export', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { edits } = req.body; // Edições opcionais
    
    console.log(`📤 Exportando planta ${id}...`);
    
    const exportPath = await plantsService.exportPlant(id, edits);
    
    if (!exportPath) {
      res.status(404).json({
        success: false,
        error: 'Planta não encontrada',
        message: `Planta com ID ${id} não foi encontrada`
      });
    }
    
    // Enviar arquivo para download
    const filename = path.basename(exportPath);
    res.download(exportPath, filename, (err) => {
      if (err) {
        console.error('❌ Erro ao enviar arquivo:', err);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            error: 'Erro ao enviar arquivo',
            message: 'Falha ao exportar planta'
          });
        }
      }
    });
    
  } catch (error: any) {
    console.error('❌ Erro ao exportar planta:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno',
      message: 'Falha ao exportar planta',
      details: error.message
    });
  }
});

// ============================================================================
// DELETAR PLANTA
// ============================================================================

router.delete('/plants/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const deleted = await plantsService.deletePlant(id);
    
    if (!deleted) {
      res.status(404).json({
        success: false,
        error: 'Planta não encontrada',
        message: `Planta com ID ${id} não foi encontrada`
      });
    }
    
    res.json({
      success: true,
      message: 'Planta deletada com sucesso'
    });
  } catch (error: any) {
    console.error('❌ Erro ao deletar planta:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno',
      message: 'Falha ao deletar planta',
      details: error.message
    });
  }
});

// ============================================================================
// UPLOAD DE TAKEOFF
// ============================================================================

router.post('/takeoff/:projectId', upload.single('file'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { projectId } = req.params;
    const userId = (req as any).user?.id;
    
    console.log('📊 Upload takeoff para projeto:', projectId);
    
    if (!req.file) {
      res.status(400).json({
        success: false,
        error: 'Arquivo é obrigatório',
        message: 'Por favor, selecione um arquivo para upload'
      });
      return;
    }

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Usuário não autenticado',
        message: 'É necessário estar autenticado para fazer upload'
      });
      return;
    }

    // Importar serviços necessários
    const { TakeoffUnifiedService } = await import('../services/takeoff-unified-service');
    const takeoffService = new TakeoffUnifiedService();

    // Construir URL do arquivo
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const fileUrl = `${baseUrl}/uploads/takeoff/${req.file.filename}`;
    const relativePath = `/uploads/takeoff/${req.file.filename}`;

    // Extrair escala do body ou usar padrão
    const scale = req.body.scale ? parseFloat(req.body.scale) : 1.0;

    // Criar takeoff automaticamente associado ao arquivo
    const takeoffOperation = {
      data: {
        project_id: projectId,
        name: `Takeoff - ${req.file.originalname}`,
        description: `Takeoff criado automaticamente a partir do upload do arquivo ${req.file.originalname}`,
        type: 'custom' as const,
        priority: 'medium' as const,
        metadata: {
          isDrawing: true,
          drawing: true,
          fileName: req.file.filename,
          originalName: req.file.originalname,
          fileUrl: fileUrl,
          filePath: relativePath,
          fileSize: req.file.size,
          mimeType: req.file.mimetype,
          scale: scale,
          uploadedAt: new Date().toISOString(),
          uploadedBy: userId,
          quickTakeoff: true
        }
      },
      user_id: userId
    };

    const takeoffResult = await takeoffService.createTakeoff(takeoffOperation);

    if (!takeoffResult.success) {
      console.error('❌ Erro ao criar takeoff:', takeoffResult.error);
      res.status(500).json({
        success: false,
        error: 'Erro ao criar takeoff',
        message: takeoffResult.message || 'Falha ao processar takeoff',
        details: takeoffResult.error
      });
      return;
    }

    // Resposta de sucesso com dados do takeoff criado
    res.status(201).json({
      success: true,
      message: 'Takeoff enviado e processado com sucesso!',
      data: {
        takeoff: takeoffResult.data,
        file: {
          id: req.file.filename,
          filename: req.file.filename,
          originalName: req.file.originalname,
          size: req.file.size,
          mimeType: req.file.mimetype,
          url: fileUrl,
          path: relativePath
        },
        projectId,
        scale
      }
    });
    
  } catch (error: any) {
    console.error('❌ Erro no upload de takeoff:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno no upload',
      message: 'Falha ao processar takeoff',
      details: error.message
    });
  }
});

console.log('✅ Rotas de upload registradas com sucesso!');

export default router;
