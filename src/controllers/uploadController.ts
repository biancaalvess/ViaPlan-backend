import { Request, Response } from 'express';
import multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { PlantsUnifiedService } from '../services/plants-unified-service';
import { TakeoffController } from './takeoffController';

// Configuração do multer para upload de arquivos
const createStorage = (type: 'plants' | 'takeoff') => {
  return multer.diskStorage({
    destination: (_req, _file, cb) => {
      const uploadDir = path.join(process.cwd(), 'uploads', type);
      
      // Criar diretório se não existir
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
        console.log(`📁 Diretório de upload criado: ${uploadDir}`);
      }
      
      cb(null, uploadDir);
    },
    filename: (_req, file, cb) => {
      // Preservar extensão original e criar nome único
      const ext = path.extname(file.originalname);
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const filename = `${type}-${uniqueSuffix}${ext}`;
      
      console.log(`📄 Nome do arquivo gerado para ${type}:`, filename);
      cb(null, filename);
    }
  });
};

// Filtros de arquivo específicos para cada tipo
const createFileFilter = (type: 'plants' | 'takeoff') => {
  if (type === 'plants') {
    return (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
      const allowedTypes = [
        'application/pdf',
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/tiff',
        'image/bmp',
        'application/dwg',
        'application/dxf'
      ];

      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Tipo de arquivo não suportado para plantas. Use PDF, imagens ou arquivos CAD.'));
      }
    };
  } else {
    return (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
      // Para takeoff, aceitar apenas PDFs
      if (file.mimetype === 'application/pdf') {
        cb(null, true);
      } else {
        cb(new Error('Para takeoff, apenas arquivos PDF são permitidos.'));
      }
    };
  }
};

// Configurações de upload para cada tipo
const createUpload = (type: 'plants' | 'takeoff') => {
  return multer({
    storage: createStorage(type),
    limits: {
      fileSize: type === 'plants' ? 50 * 1024 * 1024 : 200 * 1024 * 1024, // 50MB para plantas, 200MB para takeoff
      files: 1
    },
    fileFilter: createFileFilter(type)
  });
};

export class UploadController {
  private plantsService: PlantsUnifiedService;

  constructor() {
    this.plantsService = new PlantsUnifiedService();
    
    // Criar pastas necessárias
    this.ensureDirectories();
  }

  private ensureDirectories() {
    const dirs = [
      'uploads/plants',
      'uploads/takeoff',
      'thumbnails/plants',
      'thumbnails/takeoff'
    ];

    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`📁 Diretório criado: ${dir}`);
      }
    });
  }

  // Upload unificado para plantas
  uploadPlant = [
    createUpload('plants').single('file'),
    async (req: Request, res: Response): Promise<void> => {
      try {
        if (!req.file) {
          res.status(400).json({ 
            success: false,
            error: 'Nenhum arquivo enviado' 
          });
          return;
        }

        const { name, code, description, project_id, status, location } = req.body;
        const userId = (req as any).user?.id || (req as any).user?.userId || 'system';

        if (!name || !code) {
          res.status(400).json({ 
            success: false,
            error: 'Nome e código são obrigatórios' 
          });
          return;
        }

        const plant = await this.plantsService.createPlant({
          name,
          code,
          description: description || undefined,
          project_id: project_id || '',
          status: status || 'active',
          location: location || undefined,
          created_by: userId,
          file_path: req.file.path,
          file_url: `/uploads/plants/${req.file.filename}`,
          file_size: req.file.size,
          file_type: path.extname(req.file.originalname).substring(1) || 'pdf',
          mime_type: req.file.mimetype,
          original_filename: req.file.originalname
        } as any, req.file);

        res.status(201).json({
          success: true,
          message: 'Planta criada com sucesso',
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
              created_at: plant.created_at,
              updated_at: plant.updated_at
            }
          }
        });
      } catch (error) {
        console.error('❌ Erro ao criar planta:', error);
        res.status(500).json({ 
          success: false,
          error: 'Erro interno do servidor',
          message: error instanceof Error ? error.message : 'Erro desconhecido'
        });
      }
    }
  ];

  // Upload unificado para takeoff
  uploadTakeoff = [
    createUpload('takeoff').single('file'),
    async (req: Request, res: Response): Promise<void> => {
      try {
        if (!req.file) {
          res.status(400).json({ 
            success: false,
            error: 'Nenhum arquivo enviado' 
          });
          return;
        }

        const { projectId } = req.params;
        // const userId = (req as any).user?.id; // Não usado

        if (!projectId) {
          res.status(400).json({ 
            success: false,
            error: 'ID do projeto é obrigatório' 
          });
          return;
        }

        // Usar o método estático do TakeoffController
        await TakeoffController.uploadTakeoffFile(req, res);

        // Se chegou até aqui, o upload foi bem-sucedido
        res.status(200).json({
          success: true,
          message: 'Arquivo de takeoff enviado com sucesso',
          data: {
            file: {
              originalName: req.file.originalname,
              filename: req.file.filename,
              size: req.file.size,
              mimetype: req.file.mimetype,
              path: req.file.path,
              projectId: parseInt(projectId)
            }
          }
        });

      } catch (error) {
        console.error('❌ Erro ao fazer upload de takeoff:', error);
        res.status(500).json({ 
          success: false,
          error: 'Erro interno do servidor',
          message: error instanceof Error ? error.message : 'Erro desconhecido'
        });
      }
    }
  ];

  // Upload genérico que detecta automaticamente o tipo
  uploadFile = [
    multer({
      storage: multer.diskStorage({
        destination: (req, _file, cb) => {
          // Detectar tipo baseado no endpoint ou parâmetros
          const type = req.path.includes('plants') ? 'plants' : 'takeoff';
          const uploadDir = path.join(process.cwd(), 'uploads', type);
          
          if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
          }
          
          cb(null, uploadDir);
        },
        filename: (req, file, cb) => {
          const type = req.path.includes('plants') ? 'plants' : 'takeoff';
          const ext = path.extname(file.originalname);
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
          const filename = `${type}-${uniqueSuffix}${ext}`;
          
          cb(null, filename);
        }
      }),
      limits: {
        fileSize: 200 * 1024 * 1024, // 200MB máximo
        files: 1
      },
      fileFilter: (req, file, cb) => {
        const type = req.path.includes('plants') ? 'plants' : 'takeoff';
        
        if (type === 'plants') {
          const allowedTypes = [
            'application/pdf',
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/tiff',
            'image/bmp',
            'application/dwg',
            'application/dxf'
          ];
          
          if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
          } else {
            cb(new Error('Tipo de arquivo não suportado para plantas.'));
          }
        } else {
          if (file.mimetype === 'application/pdf') {
            cb(null, true);
          } else {
            cb(new Error('Para takeoff, apenas PDFs são permitidos.'));
          }
        }
      }
    }).single('file'),
    async (req: Request, res: Response): Promise<void> => {
      try {
        if (!req.file) {
          res.status(400).json({ 
            success: false,
            error: 'Nenhum arquivo enviado' 
          });
          return;
        }

        const type = req.path.includes('plants') ? 'plants' : 'takeoff';
        console.log(`📤 Upload de arquivo detectado como: ${type}`);

        // Redirecionar para o método apropriado
        if (type === 'plants') {
          const handler = this.uploadPlant[1] as (req: Request, res: Response) => Promise<void>;
          await handler(req, res);
        } else {
          const handler = this.uploadTakeoff[1] as (req: Request, res: Response) => Promise<void>;
          await handler(req, res);
        }

      } catch (error) {
        console.error('❌ Erro no upload genérico:', error);
        res.status(500).json({ 
          success: false,
          error: 'Erro interno do servidor',
          message: error instanceof Error ? error.message : 'Erro desconhecido'
        });
      }
    }
  ];

  // Verificar status de arquivo
  checkFileStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const { filename, type } = req.params;
      const filePath = path.join(process.cwd(), 'uploads', type, filename);
      
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        res.json({
          success: true,
          exists: true,
          filename,
          type,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime,
          url: `/uploads/${type}/${filename}`
        });
      } else {
        res.status(404).json({
          success: false,
          exists: false,
          filename,
          type,
          message: 'Arquivo não encontrado'
        });
      }
    } catch (error) {
      console.error('❌ Erro ao verificar arquivo:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  };

  // Listar arquivos por tipo
  listFiles = async (req: Request, res: Response) => {
    try {
      const { type } = req.params;
      const uploadDir = path.join(process.cwd(), 'uploads', type);
      
      if (!fs.existsSync(uploadDir)) {
        res.json({
          success: true,
          files: [],
          count: 0
        });
        return;
      }

      const files = fs.readdirSync(uploadDir);
      const fileStats = files.map(filename => {
        const filePath = path.join(uploadDir, filename);
        const stats = fs.statSync(filePath);
        return {
          filename,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime,
          url: `/uploads/${type}/${filename}`
        };
      });

      res.json({
        success: true,
        files: fileStats,
        count: fileStats.length,
        type
      });
    } catch (error) {
      console.error('❌ Erro ao listar arquivos:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  };
}
