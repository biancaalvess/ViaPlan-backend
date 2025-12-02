// ============================================================================
// SERVIÇO PRINCIPAL PARA GERENCIAR MEDIÇÕES VIAPLAN
// Especificação v1.0 - 2024-01-15
// ============================================================================

import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { log } from '../utils/winstonLogger';
import {
  Measurement,
  MeasurementData,
  MeasurementType,
  CreateMeasurementRequest,
  UpdateMeasurementRequest,
  MeasurementFilters,
  MeasurementSummary,
  TrenchMeasurement,
  BoreShotMeasurement,
  HydroExcavationMeasurement,
  ConduitMeasurement,
  VaultMeasurement,
  AreaMeasurement,
  NoteMeasurement,
  SelectMeasurement
} from '../types/measurement';
import {
  calculateTrenchLength,
  calculateTrenchVolume,
  calculateBoreShotLength,
  validateBoreShotRadius,
  validateBoreShotDepth,
  calculateHydroExcavationVolume,
  calculateConduitLength,
  calculateConduitInternalVolume,
  estimateConduitWeight,
  calculateVaultExcavationVolume,
  calculatePolygonArea,
  calculatePolygonPerimeter,
  validatePolygon,
  calculateVolumeFromArea
} from './measurement-calculations-viaplan';

// Interface simples para projeto (armazenamento)
interface ProjectStorage {
  id: string;
  name: string;
  description?: string;
  measurements: string[]; // IDs das medições
  created_at: string;
  updated_at: string;
}

export class MeasurementService {
  private measurementsDir: string;
  private projectsDir: string;

  constructor() {
    this.measurementsDir = path.join(process.cwd(), 'data', 'measurements');
    this.projectsDir = path.join(process.cwd(), 'data', 'projects');
    
    // Criar diretórios se não existirem
    [this.measurementsDir, this.projectsDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        log.info(`Diretório criado: ${dir}`);
      }
    });
    
    log.info('MeasurementService inicializado');
  }

  /**
   * Criar nova medição
   */
  async createMeasurement(request: CreateMeasurementRequest): Promise<Measurement> {
    try {
      const measurementId = uuidv4();
      const now = new Date().toISOString();
      
      // Construir dados completos da medição
      const fullData = await this.buildMeasurementData(request.type, request.data);
      
      const measurement: Measurement = {
        id: measurementId,
        project_id: request.project_id,
        type: request.type,
        data: fullData as MeasurementData,
        created_at: new Date(now),
        updated_at: new Date(now)
      };
      
      // Salvar medição
      const measurementPath = path.join(this.measurementsDir, `${measurementId}.json`);
      fs.writeFileSync(measurementPath, JSON.stringify(measurement, null, 2));
      
      // Atualizar lista de medições do projeto
      await this.addMeasurementToProject(request.project_id, measurementId);
      
      log.info('Medição criada', { measurementId, type: request.type });
      
      return measurement;
    } catch (error) {
      log.error('Erro ao criar medição', error);
      throw error;
    }
  }

  /**
   * Construir dados completos da medição com cálculos
   */
  private async buildMeasurementData(
    type: MeasurementType,
    partialData: Partial<MeasurementData>
  ): Promise<MeasurementData> {
    const now = new Date().toISOString();
    
    switch (type) {
      case 'select': {
        const data = partialData as Partial<SelectMeasurement>;
        return {
          id: '',
          type: 'select',
          project_id: data.project_id || '',
          label: data.label || '',
          selected_measurements: data.selected_measurements || [],
          filters: data.filters,
          created_at: now,
          updated_at: now
        } as SelectMeasurement;
      }
      
      case 'trench': {
        const data = partialData as Partial<TrenchMeasurement>;
        if (!data.coordinates || data.coordinates.length < 2) {
          throw new Error('Trincheira deve ter pelo menos 2 pontos');
        }
        
        const length = calculateTrenchLength(data.coordinates);
        const widthDefault: { type: 'constant' | 'variable'; value?: number; values?: number[] } = 
          data.width || { type: 'constant', value: 0.6 };
        const depthDefault: { type: 'constant' | 'variable'; value?: number; values?: number[] } = 
          data.depth || { type: 'constant', value: 0.9 };
        const volume = calculateTrenchVolume(
          data.coordinates,
          widthDefault,
          depthDefault
        );
        
        return {
          id: '',
          type: 'trench',
          project_id: data.project_id || '',
          label: data.label || '',
          coordinates: data.coordinates,
          width: data.width || { type: 'constant', value: 0.6, unit: 'm' },
          depth: data.depth || { type: 'constant', value: 0.9, unit: 'm' },
          soil_type: data.soil_type,
          length,
          volume_m3: volume,
          asphalt_removal: data.asphalt_removal,
          concrete_removal: data.concrete_removal,
          backfill: data.backfill,
          cross_sections: data.cross_sections,
          created_at: now,
          updated_at: now
        } as TrenchMeasurement;
      }
      
      case 'bore-shot': {
        const data = partialData as Partial<BoreShotMeasurement>;
        if (!data.coordinates || data.coordinates.length < 2) {
          throw new Error('Perfuração direcional deve ter pelo menos 2 pontos');
        }
        
        const length = calculateBoreShotLength(data.coordinates);
        const minRadius = data.conduits?.[0]?.min_curvature_radius_ft || 150;
        const minDepth = data.min_depth_guaranteed_ft || 8;
        
        const radiusCheck = validateBoreShotRadius(data.coordinates, minRadius);
        const depthCheck = validateBoreShotDepth(data.coordinates, minDepth);
        
        return {
          id: '',
          type: 'bore-shot',
          project_id: data.project_id || '',
          label: data.label || '',
          coordinates: data.coordinates,
          conduits: data.conduits || [],
          entry_angle_degrees: data.entry_angle_degrees || 15,
          exit_angle_degrees: data.exit_angle_degrees || 15,
          min_depth_guaranteed_ft: minDepth,
          drill_diameter_in: data.drill_diameter_in || 6,
          backreamer_diameter_in: data.backreamer_diameter_in || 7.2,
          length_ft: length,
          validation: {
            radius_check: radiusCheck,
            depth_check: depthCheck
          },
          created_at: now,
          updated_at: now
        } as BoreShotMeasurement;
      }
      
      case 'hydro-excavation': {
        const data = partialData as Partial<HydroExcavationMeasurement>;
        if (!data.coordinates || data.coordinates.length === 0) {
          throw new Error('Hidroescavação deve ter pelo menos 1 ponto');
        }
        
        const volume = calculateHydroExcavationVolume(
          data.subtype || 'trench',
          data.coordinates,
          data.section || { shape: 'circular', diameter_ft: 2 },
          data.depth_ft || 3,
          data.efficiency_ratio
        );
        
        return {
          id: '',
          type: 'hydro-excavation',
          project_id: data.project_id || '',
          label: data.label || '',
          subtype: data.subtype || 'trench',
          coordinates: data.coordinates,
          section: data.section || { shape: 'circular', diameter_ft: 2 },
          depth_ft: data.depth_ft || 3,
          volume_removed_cy: volume,
          efficiency_ratio: data.efficiency_ratio,
          surface_type: data.surface_type,
          include_restoration: data.include_restoration,
          conduits: data.conduits,
          created_at: now,
          updated_at: now
        } as HydroExcavationMeasurement;
      }
      
      case 'conduit': {
        const data = partialData as Partial<ConduitMeasurement>;
        if (!data.coordinates || data.coordinates.length < 2) {
          throw new Error('Conduto deve ter pelo menos 2 pontos');
        }
        
        const length = calculateConduitLength(data.coordinates);
        
        // Calcular volume interno e peso se houver condutos especificados
        let internalVolume: number | undefined;
        let estimatedWeight: number | undefined;
        
        if (data.conduits && data.conduits.length > 0) {
          const conduit = data.conduits[0];
          internalVolume = calculateConduitInternalVolume(
            conduit.nominal_diameter_in,
            length
          );
          estimatedWeight = estimateConduitWeight(
            conduit.material,
            conduit.outer_diameter_in,
            conduit.wall_thickness_in,
            length
          );
        }
        
        return {
          id: '',
          type: 'conduit',
          project_id: data.project_id || '',
          label: data.label || '',
          coordinates: data.coordinates,
          conduits: data.conduits || [],
          connections: data.connections,
          total_length_ft: length,
          internal_volume_gal: internalVolume,
          estimated_weight_lb: estimatedWeight,
          installation_method: data.installation_method,
          compatibility_check: data.compatibility_check,
          created_at: now,
          updated_at: now
        } as ConduitMeasurement;
      }
      
      case 'vault': {
        const data = partialData as Partial<VaultMeasurement>;
        if (!data.coordinates || data.coordinates.length === 0) {
          throw new Error('Câmara deve ter pelo menos 1 ponto');
        }
        
        calculateVaultExcavationVolume(
          data.shape || 'rectangular',
          data.dimensions || { length_ft: 4, width_ft: 4, depth_ft: 6 }
        );
        
        return {
          id: '',
          type: 'vault',
          project_id: data.project_id || '',
          label: data.label || '',
          coordinates: data.coordinates,
          vault_type: data.vault_type || 'câmara',
          shape: data.shape || 'rectangular',
          dimensions: data.dimensions || { length_ft: 4, width_ft: 4, depth_ft: 6 },
          material: data.material,
          class: data.class,
          quantity: data.quantity || 1,
          volumes: data.volumes,
          hole_size: data.hole_size,
          traffic_rated: data.traffic_rated,
          created_at: now,
          updated_at: now
        } as VaultMeasurement;
      }
      
      case 'area': {
        const data = partialData as Partial<AreaMeasurement>;
        if (!data.coordinates || data.coordinates.length < 3) {
          throw new Error('Área deve ter pelo menos 3 pontos');
        }
        
        // Validar polígono
        const validation = validatePolygon(data.coordinates);
        if (!validation.valid) {
          throw new Error(`Polígono inválido: ${validation.errors.join(', ')}`);
        }
        
        const areaSqm = calculatePolygonArea(data.coordinates);
        const areaSqft = areaSqm * 10.764; // m² para ft²
        const perimeterM = calculatePolygonPerimeter(data.coordinates);
        const perimeterFt = perimeterM * 3.28084; // m para ft
        
        let volumeCy: number | undefined;
        let volumeM3: number | undefined;
        
        if (data.depth_ft) {
          const volumes = calculateVolumeFromArea(areaSqft, data.depth_ft);
          volumeCy = volumes.volume_cy;
          volumeM3 = volumes.volume_m3;
        }
        
        return {
          id: '',
          type: 'area',
          project_id: data.project_id || '',
          label: data.label || '',
          coordinates: data.coordinates,
          area_sqft: areaSqft,
          area_sqm: areaSqm,
          perimeter_ft: perimeterFt,
          perimeter_m: perimeterM,
          depth_ft: data.depth_ft,
          volume_cy: volumeCy,
          volume_m3: volumeM3,
          created_at: now,
          updated_at: now
        } as AreaMeasurement;
      }
      
      case 'note': {
        const data = partialData as Partial<NoteMeasurement>;
        return {
          id: '',
          type: 'note',
          project_id: data.project_id || '',
          label: data.label || '',
          text: data.text || '',
          author: data.author,
          date: data.date || new Date().toISOString(),
          coordinates: data.coordinates || [],
          linked_measurement_id: data.linked_measurement_id,
          created_at: now,
          updated_at: now
        } as NoteMeasurement;
      }
      
      default:
        throw new Error(`Tipo de medição não suportado: ${type}`);
    }
  }

  /**
   * Obter medição por ID
   */
  async getMeasurementById(id: string): Promise<Measurement | null> {
    try {
      const measurementPath = path.join(this.measurementsDir, `${id}.json`);
      
      if (!fs.existsSync(measurementPath)) {
        return null;
      }
      
      const content = fs.readFileSync(measurementPath, 'utf-8');
      const parsed = JSON.parse(content);
      
      // Converter strings de data para Date objects
      return {
        ...parsed,
        created_at: new Date(parsed.created_at),
        updated_at: new Date(parsed.updated_at)
      };
    } catch (error) {
      log.error('Erro ao obter medição', error);
      return null;
    }
  }

  /**
   * Listar medições com filtros
   */
  async listMeasurements(filters: MeasurementFilters = {}): Promise<Measurement[]> {
    try {
      const { project_id, type, date_from, date_to, limit = 100, offset = 0 } = filters;
      
      let measurements: Measurement[] = [];
      
      // Se project_id fornecido, buscar do projeto
      if (project_id) {
        const projectPath = path.join(this.projectsDir, `${project_id}.json`);
        if (fs.existsSync(projectPath)) {
          const projectContent = fs.readFileSync(projectPath, 'utf-8');
          const project: ProjectStorage = JSON.parse(projectContent);
          
          for (const measurementId of project.measurements) {
            const measurement = await this.getMeasurementById(measurementId);
            if (measurement) {
              measurements.push(measurement);
            }
          }
        }
      } else {
        // Listar todas as medições
        const files = fs.readdirSync(this.measurementsDir);
        for (const file of files) {
          if (file.endsWith('.json')) {
            const id = file.replace('.json', '');
            const measurement = await this.getMeasurementById(id);
            if (measurement) {
              measurements.push(measurement);
            }
          }
        }
      }
      
      // Aplicar filtros
      if (type) {
        measurements = measurements.filter(m => m.type === type);
      }
      
      if (date_from) {
        const fromDate = new Date(date_from);
        measurements = measurements.filter(m => m.created_at >= fromDate);
      }
      
      if (date_to) {
        const toDate = new Date(date_to);
        measurements = measurements.filter(m => m.created_at <= toDate);
      }
      
      // Ordenar por data de criação (mais recente primeiro)
      measurements.sort((a, b) => 
        b.created_at.getTime() - a.created_at.getTime()
      );
      
      // Aplicar paginação
      return measurements.slice(offset, offset + limit);
    } catch (error) {
      log.error('Erro ao listar medições', error);
      return [];
    }
  }

  /**
   * Atualizar medição
   */
  async updateMeasurement(id: string, update: UpdateMeasurementRequest): Promise<Measurement | null> {
    try {
      const measurement = await this.getMeasurementById(id);
      
      if (!measurement) {
        return null;
      }
      
      // Reconstruir dados se necessário
      if (update.data) {
        const currentData = measurement.data as any;
        const updatedData = await this.buildMeasurementData(measurement.type, {
          ...currentData,
          ...update.data
        } as Partial<MeasurementData>);
        measurement.data = updatedData;
      }
      
      measurement.updated_at = new Date();
      
      // Salvar
      const measurementPath = path.join(this.measurementsDir, `${id}.json`);
      fs.writeFileSync(measurementPath, JSON.stringify(measurement, null, 2));
      
      log.info('Medição atualizada', { id });
      
      return measurement;
    } catch (error) {
      log.error('Erro ao atualizar medição', error);
      throw error;
    }
  }

  /**
   * Deletar medição
   */
  async deleteMeasurement(id: string): Promise<boolean> {
    try {
      const measurement = await this.getMeasurementById(id);
      
      if (!measurement) {
        return false;
      }
      
      // Remover arquivo
      const measurementPath = path.join(this.measurementsDir, `${id}.json`);
      if (fs.existsSync(measurementPath)) {
        fs.unlinkSync(measurementPath);
      }
      
      // Remover do projeto
      await this.removeMeasurementFromProject(measurement.project_id, id);
      
      log.info('Medição deletada', { id });
      
      return true;
    } catch (error) {
      log.error('Erro ao deletar medição', error);
      return false;
    }
  }

  /**
   * Adicionar medição ao projeto
   */
  private async addMeasurementToProject(projectId: string, measurementId: string): Promise<void> {
    const projectPath = path.join(this.projectsDir, `${projectId}.json`);
    
    let project: ProjectStorage;
    if (fs.existsSync(projectPath)) {
      const content = fs.readFileSync(projectPath, 'utf-8');
      project = JSON.parse(content);
    } else {
      throw new Error(`Projeto ${projectId} não encontrado`);
    }
    
    if (!project.measurements) {
      project.measurements = [];
    }
    
    if (!project.measurements.includes(measurementId)) {
      project.measurements.push(measurementId);
    }
    
    project.updated_at = new Date().toISOString();
    fs.writeFileSync(projectPath, JSON.stringify(project, null, 2));
  }

  /**
   * Remover medição do projeto
   */
  private async removeMeasurementFromProject(projectId: string, measurementId: string): Promise<void> {
    const projectPath = path.join(this.projectsDir, `${projectId}.json`);
    
    if (!fs.existsSync(projectPath)) {
      return;
    }
    
    const content = fs.readFileSync(projectPath, 'utf-8');
    const project: ProjectStorage = JSON.parse(content);
    
    if (project.measurements) {
      project.measurements = project.measurements.filter(id => id !== measurementId);
    }
    
    project.updated_at = new Date().toISOString();
    fs.writeFileSync(projectPath, JSON.stringify(project, null, 2));
  }

  /**
   * Obter resumo de medições do projeto
   */
  async getProjectSummary(projectId: string): Promise<MeasurementSummary> {
    const measurements = await this.listMeasurements({ project_id: projectId });
    
    const totals: MeasurementSummary['totals'] = {};
    
    for (const measurement of measurements) {
      const type = measurement.type;
      
      if (type === 'trench') {
        const data = measurement.data as TrenchMeasurement;
        if (!totals.trench) {
          totals.trench = { count: 0, total_length_ft: 0, total_volume_cy: 0 };
        }
        totals.trench.count++;
        totals.trench.total_length_ft += data.length * 3.28084; // m para ft
        totals.trench.total_volume_cy += data.volume_m3 * 1.30795; // m³ para CY
      } else if (type === 'conduit') {
        const data = measurement.data as ConduitMeasurement;
        if (!totals.conduit) {
          totals.conduit = { count: 0, total_length_ft: 0 };
        }
        totals.conduit.count++;
        totals.conduit.total_length_ft += data.total_length_ft;
      } else if (type === 'vault') {
        const data = measurement.data as VaultMeasurement;
        if (!totals.vault) {
          totals.vault = { count: 0, total_volume_cy: 0 };
        }
        totals.vault.count += data.quantity || 1;
        if (data.volumes) {
          totals.vault.total_volume_cy += data.volumes.excavation_cy;
        }
      } else if (type === 'area') {
        const data = measurement.data as AreaMeasurement;
        if (!totals.area) {
          totals.area = { count: 0, total_area_sqft: 0 };
        }
        totals.area.count++;
        totals.area.total_area_sqft += data.area_sqft;
      } else if (type === 'bore-shot') {
        const data = measurement.data as BoreShotMeasurement;
        if (!totals['bore-shot']) {
          totals['bore-shot'] = { count: 0, total_length_ft: 0 };
        }
        totals['bore-shot'].count++;
        totals['bore-shot'].total_length_ft += data.length_ft;
      } else if (type === 'hydro-excavation') {
        const data = measurement.data as HydroExcavationMeasurement;
        if (!totals['hydro-excavation']) {
          totals['hydro-excavation'] = { count: 0, total_volume_cy: 0 };
        }
        totals['hydro-excavation'].count++;
        totals['hydro-excavation'].total_volume_cy += data.volume_removed_cy;
      }
    }
    
    return {
      project_id: projectId,
      totals,
      generated_at: new Date().toISOString()
    };
  }

  /**
   * Exportar medição
   */
  async exportMeasurement(id: string, format: 'json' | 'csv' = 'json'): Promise<string> {
    const measurement = await this.getMeasurementById(id);
    
    if (!measurement) {
      throw new Error('Medição não encontrada');
    }
    
    if (format === 'json') {
      return JSON.stringify(measurement, null, 2);
    }
    
    // CSV básico
    const lines: string[] = [];
    lines.push('Tipo,ID,Projeto,Label,Criado em');
    lines.push(`${measurement.type},${measurement.id},${measurement.project_id},${(measurement.data as any).label || ''},${measurement.created_at.toISOString()}`);
    
    return lines.join('\n');
  }
}
