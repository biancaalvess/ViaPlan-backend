// ============================================================================
// PLANTS UNIFIED SERVICE - SERVICE LAYER PARA PLANTAS (SEM BANCO DE DADOS)
// ============================================================================

import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { log } from '../utils/winstonLogger';

export interface Plant {
  id: string;
  name: string;
  code: string;
  description?: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  original_filename: string;
  status: 'active' | 'archived' | 'processing' | 'completed' | 'error';
  created_at: string;
  updated_at: string;
}

export interface PlantCreationAttributes {
  name: string;
  code: string;
  description?: string;
  file: Express.Multer.File;
  project_id?: string;
  status?: string;
  location?: string;
  created_by?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export class PlantsUnifiedService {
  private uploadDir: string;
  private exportsDir: string;

  constructor() {
    this.uploadDir = path.join(process.cwd(), 'uploads', 'plants');
    this.exportsDir = path.join(process.cwd(), 'exports', 'plants');
    
    // Criar diretórios se não existirem
    [this.uploadDir, this.exportsDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        log.info(`Diretório criado: ${dir}`);
      }
    });
    
    log.info('PlantsUnifiedService inicializado (modo arquivo)');
  }

  /**
   * Criar uma nova planta (apenas salvar arquivo)
   */
  async createPlant(plantData: PlantCreationAttributes, file: Express.Multer.File): Promise<Plant> {
    try {
      const plantId = uuidv4();
      const timestamp = new Date().toISOString();
      
      // Criar objeto da planta
      const plant: Plant = {
        id: plantId,
        name: plantData.name,
        code: plantData.code,
        ...(plantData.description && { description: plantData.description }),
        file_path: file.path,
        file_size: file.size,
        mime_type: file.mimetype,
        original_filename: file.originalname,
        status: (plantData.status as any) || 'active',
        created_at: timestamp,
        updated_at: timestamp
      };

      // Salvar metadados em arquivo JSON (opcional, para referência)
      const metadataPath = path.join(this.uploadDir, `${plantId}.json`);
      fs.writeFileSync(metadataPath, JSON.stringify(plant, null, 2));

      log.info('Planta criada com sucesso', { plantId: plant.id, name: plant.name });
      
      return plant;
    } catch (error) {
      log.error('Erro ao criar planta', error);
      throw error;
    }
  }

  /**
   * Obter planta por ID (lê do arquivo de metadados)
   */
  async getPlantById(plantId: string): Promise<Plant | null> {
    try {
      const metadataPath = path.join(this.uploadDir, `${plantId}.json`);
      
      if (!fs.existsSync(metadataPath)) {
        return null;
      }

      const metadata = fs.readFileSync(metadataPath, 'utf-8');
      return JSON.parse(metadata);
    } catch (error) {
      log.error('Erro ao obter planta', error);
      return null;
    }
  }

  /**
   * Listar todas as plantas (lê todos os arquivos de metadados)
   */
  async listPlants(): Promise<Plant[]> {
    try {
      const files = fs.readdirSync(this.uploadDir);
      const plants: Plant[] = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const metadataPath = path.join(this.uploadDir, file);
            const metadata = fs.readFileSync(metadataPath, 'utf-8');
            const plant = JSON.parse(metadata);
            
            // Verificar se o arquivo ainda existe
            if (fs.existsSync(plant.file_path)) {
              plants.push(plant);
            }
          } catch (error) {
            log.warn(`Erro ao ler metadados de ${file}`, error);
          }
        }
      }

      return plants.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    } catch (error) {
      log.error('Erro ao listar plantas', error);
      return [];
    }
  }

  /**
   * Exportar planta (copia arquivo para pasta de exportação)
   */
  async exportPlant(plantId: string, edits?: any): Promise<string> {
    try {
      const plant = await this.getPlantById(plantId);
      
      if (!plant) {
        throw new Error('Planta não encontrada');
      }

      if (!fs.existsSync(plant.file_path)) {
        throw new Error('Arquivo da planta não encontrado');
      }

      // Criar nome do arquivo de exportação
      const ext = path.extname(plant.original_filename);
      const baseName = path.basename(plant.original_filename, ext);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const exportFilename = `${baseName}_${timestamp}${ext}`;
      const exportPath = path.join(this.exportsDir, exportFilename);

      // Copiar arquivo para pasta de exportação
      fs.copyFileSync(plant.file_path, exportPath);

      // Se houver edições, salvar em arquivo separado
      if (edits) {
        const editsPath = path.join(this.exportsDir, `${baseName}_${timestamp}_edits.json`);
        fs.writeFileSync(editsPath, JSON.stringify(edits, null, 2));
      }

      log.info('Planta exportada com sucesso', { plantId, exportPath });
      
      return exportPath;
    } catch (error) {
      log.error('Erro ao exportar planta', error);
      throw error;
    }
  }

  /**
   * Deletar planta
   */
  async deletePlant(plantId: string): Promise<boolean> {
    try {
      const plant = await this.getPlantById(plantId);
      
      if (!plant) {
        return false;
      }

      // Deletar arquivo
      if (fs.existsSync(plant.file_path)) {
        fs.unlinkSync(plant.file_path);
      }

      // Deletar metadados
      const metadataPath = path.join(this.uploadDir, `${plantId}.json`);
      if (fs.existsSync(metadataPath)) {
        fs.unlinkSync(metadataPath);
      }

      log.info('Planta deletada com sucesso', { plantId });
      return true;
    } catch (error) {
      log.error('Erro ao deletar planta', error);
      return false;
    }
  }
}
