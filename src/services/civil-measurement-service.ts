// ============================================================================
// SERVIÇO PRINCIPAL PARA GERENCIAR MEDIÇÕES DE ENGENHARIA CIVIL PREDIAL
// Especificação v1.0 - 2024-01-20
// ============================================================================

import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { log } from '../utils/winstonLogger';
import {
  CivilMeasurement,
  CivilMeasurementData,
  CivilMeasurementType,
  CreateCivilMeasurementRequest,
  UpdateCivilMeasurementRequest,
  LayoutMeasurement,
  WallMeasurement,
  AreaMeasurement,
  OpeningMeasurement,
  SlabMeasurement,
  FoundationMeasurement,
  StructureMeasurement,
  FinishingMeasurement,
  RoofMeasurement,
  NoteMeasurement,
  Coordinate
} from '../types/civil-measurement';
import {
  calculateLayoutOutput,
  calculateWallMeasurements,
  calculateAreaMeasurements,
  calculateOpeningMeasurements,
  calculateSlabMeasurements,
  calculateFoundationVolume,
  calculateStructureVolume,
  calculateFinishingMeasurements,
  calculateRoofMeasurements,
  BRAZILIAN_PRESETS
} from './civil-measurement-calculations';

export class CivilMeasurementService {
  private measurementsDir: string;
  private projectsDir: string;

  constructor() {
    this.measurementsDir = path.join(process.cwd(), 'data', 'civil-measurements');
    this.projectsDir = path.join(process.cwd(), 'data', 'projects');
    
    // Criar diretórios se não existirem
    [this.measurementsDir, this.projectsDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        log.info(`Diretório criado: ${dir}`);
      }
    });
    
    log.info('CivilMeasurementService inicializado');
  }

  /**
   * Criar nova medição
   */
  async createMeasurement(request: CreateCivilMeasurementRequest): Promise<CivilMeasurement> {
    try {
      const measurementId = uuidv4();
      const now = new Date().toISOString();
      
      // Construir dados completos da medição com cálculos
      const fullData = await this.buildMeasurementData(request.type, request.data);
      
      const measurement: CivilMeasurement = {
        id: measurementId,
        project_id: request.project_id,
        type: request.type,
        data: fullData as CivilMeasurementData,
        created_at: new Date(now),
        updated_at: new Date(now)
      };
      
      // Salvar medição
      const measurementPath = path.join(this.measurementsDir, `${measurementId}.json`);
      fs.writeFileSync(measurementPath, JSON.stringify(measurement, null, 2));
      
      // Atualizar lista de medições do projeto
      await this.addMeasurementToProject(request.project_id, measurementId);
      
      log.info('Medição civil criada', { measurementId, type: request.type });
      
      return measurement;
    } catch (error) {
      log.error('Erro ao criar medição civil', error);
      throw error;
    }
  }

  /**
   * Construir dados completos da medição com cálculos
   */
  private async buildMeasurementData(
    type: CivilMeasurementType,
    partialData: Partial<CivilMeasurementData>
  ): Promise<CivilMeasurementData> {
    const now = new Date().toISOString();
    
    switch (type) {
      case 'layout': {
        const data = partialData as Partial<LayoutMeasurement>;
        const output = calculateLayoutOutput(
          data.geometry?.lines || [],
          data.scale
        );
        
        return {
          id: '',
          type: 'layout',
          project_id: data.project_id || '',
          label: data.label || '',
          scale: data.scale,
          geometry: {
            lines: data.geometry?.lines || []
          },
          attributes: {
            default_wall_thickness_m: data.attributes?.default_wall_thickness_m || 
              BRAZILIAN_PRESETS.standard_thicknesses.wall_internal_m,
            axis: data.attributes?.axis,
            layer: data.attributes?.layer
          },
          output,
          created_at: now,
          updated_at: now
        } as LayoutMeasurement;
      }
      
      case 'wall': {
        const data = partialData as Partial<WallMeasurement>;
        if (!data.geometry?.polyline || data.geometry.polyline.length < 2) {
          throw new Error('Parede deve ter pelo menos 2 pontos');
        }
        
        // Preparar parâmetros do bloco com juntas padrão se não fornecidos
        let blockParams = data.attributes?.block_parameters;
        if (!blockParams && data.attributes?.material === 'bloco_ceramico') {
          blockParams = {
            ...BRAZILIAN_PRESETS.block_dimensions.ceramico_9x19x19
          };
        }
        
        const calculations = calculateWallMeasurements(
          data.geometry.polyline,
          data.geometry.height_m || 2.70, // Altura padrão brasileira
          data.geometry.thickness_m || BRAZILIAN_PRESETS.standard_thicknesses.wall_internal_m,
          blockParams,
          data.openings, // Lista de vãos que impactam esta parede
          data.scale // Escala para conversão de pixels para metros
        );
        
        return {
          id: '',
          type: 'wall',
          project_id: data.project_id || '',
          label: data.label || '',
          scale: data.scale,
          geometry: {
            polyline: data.geometry.polyline,
            height_m: data.geometry.height_m || 2.70,
            thickness_m: data.geometry.thickness_m || BRAZILIAN_PRESETS.standard_thicknesses.wall_internal_m
          },
          attributes: {
            material: data.attributes?.material || 'bloco_ceramico',
            custom_material: data.attributes?.custom_material,
            density_kg_m3: data.attributes?.density_kg_m3,
            block_parameters: blockParams
          },
          openings: data.openings,
          calculations,
          created_at: now,
          updated_at: now
        } as WallMeasurement;
      }
      
      case 'area': {
        const data = partialData as Partial<AreaMeasurement>;
        if (!data.geometry?.polygon || data.geometry.polygon.length < 3) {
          throw new Error('Área deve ter pelo menos 3 pontos');
        }
        
        const calculations = calculateAreaMeasurements(
          data.geometry.polygon,
          data.scale
        );
        
        return {
          id: '',
          type: 'area',
          project_id: data.project_id || '',
          label: data.label || '',
          scale: data.scale,
          geometry: {
            polygon: data.geometry.polygon
          },
          attributes: {
            usage: data.attributes?.usage || 'outro',
            custom_usage: data.attributes?.custom_usage
          },
          calculations,
          created_at: now,
          updated_at: now
        } as AreaMeasurement;
      }
      
      case 'opening': {
        const data = partialData as Partial<OpeningMeasurement>;
        const calculations = calculateOpeningMeasurements(
          data.geometry?.width_m || 0.70,
          data.geometry?.height_m || 2.10,
          1
        );
        
        return {
          id: '',
          type: 'opening',
          project_id: data.project_id || '',
          label: data.label || '',
          geometry: {
            shape: data.geometry?.shape || 'rectangle',
            coordinates: data.geometry?.coordinates || [],
            width_m: data.geometry?.width_m || 0.70,
            height_m: data.geometry?.height_m || 2.10
          },
          attributes: {
            opening_type: data.attributes?.opening_type || 'porta',
            material: data.attributes?.material || 'madeira',
            custom_type: data.attributes?.custom_type,
            custom_material: data.attributes?.custom_material
          },
          calculations,
          created_at: now,
          updated_at: now
        } as OpeningMeasurement;
      }
      
      case 'slab': {
        const data = partialData as Partial<SlabMeasurement>;
        if (!data.geometry?.polygon || data.geometry.polygon.length < 3) {
          throw new Error('Laje deve ter pelo menos 3 pontos');
        }
        
        const calculations = calculateSlabMeasurements(
          data.geometry.polygon,
          data.geometry.thickness_m || BRAZILIAN_PRESETS.standard_thicknesses.slab_m,
          data.scale
        );
        
        return {
          id: '',
          type: 'slab',
          project_id: data.project_id || '',
          label: data.label || '',
          scale: data.scale,
          geometry: {
            polygon: data.geometry.polygon,
            thickness_m: data.geometry.thickness_m || BRAZILIAN_PRESETS.standard_thicknesses.slab_m
          },
          attributes: {
            structural_type: data.attributes?.structural_type || 'macica',
            material: data.attributes?.material || 'concreto_armado',
            custom_type: data.attributes?.custom_type,
            custom_material: data.attributes?.custom_material,
            fck_mpa: data.attributes?.fck_mpa,
            concrete_density_kg_m3: data.attributes?.concrete_density_kg_m3 || 2500
          },
          calculations,
          created_at: now,
          updated_at: now
        } as SlabMeasurement;
      }
      
      case 'foundation': {
        const data = partialData as Partial<FoundationMeasurement>;
        const foundationType = data.geometry?.foundation_type || 'bloco';
        
        const calculations = calculateFoundationVolume(
          foundationType,
          data.geometry?.dimensions,
          data.geometry?.polyline,
          data.geometry?.width_m,
          data.geometry?.height_m,
          data.geometry?.polygon,
          data.geometry?.thickness_m,
          1,
          data.scale
        );
        
        return {
          id: '',
          type: 'foundation',
          project_id: data.project_id || '',
          label: data.label || '',
          scale: data.scale,
          geometry: {
            foundation_type: foundationType,
            dimensions: data.geometry?.dimensions,
            polyline: data.geometry?.polyline,
            width_m: data.geometry?.width_m,
            height_m: data.geometry?.height_m,
            polygon: data.geometry?.polygon,
            thickness_m: data.geometry?.thickness_m
          },
          attributes: {
            soil_type: data.attributes?.soil_type,
            custom_type: data.attributes?.custom_type
          },
          calculations,
          created_at: now,
          updated_at: now
        } as FoundationMeasurement;
      }
      
      case 'structure': {
        const data = partialData as Partial<StructureMeasurement>;
        const elementType = data.geometry?.element_type || 'viga';
        
        const calculations = calculateStructureVolume(
          elementType,
          data.geometry?.polyline,
          data.geometry?.section,
          data.geometry?.length_m,
          data.geometry?.height_m, // Para pilares
          data.geometry?.polygon,
          data.geometry?.thickness_m,
          data.attributes?.rebar_rate_kg_m3,
          data.scale
        );
        
        return {
          id: '',
          type: 'structure',
          project_id: data.project_id || '',
          label: data.label || '',
          scale: data.scale,
          geometry: {
            element_type: elementType,
            polyline: data.geometry?.polyline,
            section: data.geometry?.section || { type: 'rectangular', width_m: 0.20, height_m: 0.40 },
            length_m: data.geometry?.length_m,
            height_m: data.geometry?.height_m,
            polygon: data.geometry?.polygon,
            thickness_m: data.geometry?.thickness_m
          },
          attributes: {
            material: data.attributes?.material || 'concreto_armado',
            custom_material: data.attributes?.custom_material,
            fck_mpa: data.attributes?.fck_mpa,
            rebar_rate_kg_m3: data.attributes?.rebar_rate_kg_m3
          },
          calculations,
          created_at: now,
          updated_at: now
        } as StructureMeasurement;
      }
      
      case 'finishing': {
        const data = partialData as Partial<FinishingMeasurement>;
        const lossPercent = data.attributes?.standard_loss_percent || 
          BRAZILIAN_PRESETS.standard_losses.piso_percent;
        
        const calculations = calculateFinishingMeasurements(
          data.geometry?.surface_area?.polygon,
          data.geometry?.surface_area?.surfaces,
          lossPercent,
          data.scale
        );
        
        return {
          id: '',
          type: 'finishing',
          project_id: data.project_id || '',
          label: data.label || '',
          scale: data.scale,
          geometry: {
            surface_area: {
              polygon: data.geometry?.surface_area?.polygon,
              surfaces: data.geometry?.surface_area?.surfaces
            }
          },
          attributes: {
            finishing_type: data.attributes?.finishing_type || 'piso',
            custom_type: data.attributes?.custom_type,
            standard_loss_percent: lossPercent,
            material_unit: data.attributes?.material_unit
          },
          calculations: {
            ...calculations,
            estimated_consumption_unit: data.attributes?.material_unit
          },
          created_at: now,
          updated_at: now
        } as FinishingMeasurement;
      }
      
      case 'roof': {
        const data = partialData as Partial<RoofMeasurement>;
        if (!data.geometry?.planes || data.geometry.planes.length === 0) {
          throw new Error('Cobertura deve ter pelo menos 1 plano');
        }
        
        // Converter planes para formato esperado (inclination_degrees ou inclination_percent)
        const planes = data.geometry.planes.map(plane => {
          const result: {
            polygon: Coordinate[];
            inclination_degrees?: number;
            inclination_percent?: number;
            azimuth_degrees?: number;
          } = {
            polygon: plane.polygon
          };
          
          if (plane.inclination_degrees !== undefined) {
            result.inclination_degrees = plane.inclination_degrees;
          }
          if (plane.inclination_percent !== undefined) {
            result.inclination_percent = plane.inclination_percent;
          }
          if (plane.azimuth_degrees !== undefined) {
            result.azimuth_degrees = plane.azimuth_degrees;
          }
          
          return result;
        });
        
        const calculations = calculateRoofMeasurements(planes, data.scale);
        
        return {
          id: '',
          type: 'roof',
          project_id: data.project_id || '',
          label: data.label || '',
          scale: data.scale,
          geometry: {
            planes: data.geometry.planes
          },
          attributes: {
            material: data.attributes?.material || 'telha_ceramica',
            custom_material: data.attributes?.custom_material
          },
          calculations,
          created_at: now,
          updated_at: now
        } as RoofMeasurement;
      }
      
      case 'note': {
        const data = partialData as Partial<NoteMeasurement>;
        
        return {
          id: '',
          type: 'note',
          project_id: data.project_id || '',
          label: data.label || '',
          attributes: {
            text: data.attributes?.text || '',
            author: data.attributes?.author,
            date: data.attributes?.date || now
          },
          geometry: {
            coordinates: data.geometry?.coordinates || [],
            linked_measurement_id: data.geometry?.linked_measurement_id
          },
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
  async getMeasurementById(id: string): Promise<CivilMeasurement | null> {
    try {
      const measurementPath = path.join(this.measurementsDir, `${id}.json`);
      
      if (!fs.existsSync(measurementPath)) {
        return null;
      }
      
      const content = fs.readFileSync(measurementPath, 'utf-8');
      const parsed = JSON.parse(content);
      
      return {
        ...parsed,
        created_at: new Date(parsed.created_at),
        updated_at: new Date(parsed.updated_at)
      };
    } catch (error) {
      log.error('Erro ao obter medição civil', error);
      return null;
    }
  }

  /**
   * Listar medições com filtros
   */
  async listMeasurements(projectId?: string, type?: CivilMeasurementType): Promise<CivilMeasurement[]> {
    try {
      let measurements: CivilMeasurement[] = [];
      
      if (projectId) {
        const projectPath = path.join(this.projectsDir, `${projectId}.json`);
        if (fs.existsSync(projectPath)) {
          const projectContent = fs.readFileSync(projectPath, 'utf-8');
          const project = JSON.parse(projectContent);
          
          if (project.civil_measurements) {
            for (const measurementId of project.civil_measurements) {
              const measurement = await this.getMeasurementById(measurementId);
              if (measurement) {
                measurements.push(measurement);
              }
            }
          }
        }
      } else {
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
      
      if (type) {
        measurements = measurements.filter(m => m.type === type);
      }
      
      measurements.sort((a, b) => 
        b.created_at.getTime() - a.created_at.getTime()
      );
      
      return measurements;
    } catch (error) {
      log.error('Erro ao listar medições civis', error);
      return [];
    }
  }

  /**
   * Atualizar medição
   */
  async updateMeasurement(id: string, update: UpdateCivilMeasurementRequest): Promise<CivilMeasurement | null> {
    try {
      const measurement = await this.getMeasurementById(id);
      
      if (!measurement) {
        return null;
      }
      
      if (update.data) {
        const currentData = measurement.data as any;
        const updatedData = await this.buildMeasurementData(measurement.type, {
          ...currentData,
          ...update.data
        } as Partial<CivilMeasurementData>);
        measurement.data = updatedData;
      }
      
      if (update.label) {
        (measurement.data as any).label = update.label;
      }
      
      measurement.updated_at = new Date();
      
      const measurementPath = path.join(this.measurementsDir, `${id}.json`);
      fs.writeFileSync(measurementPath, JSON.stringify(measurement, null, 2));
      
      log.info('Medição civil atualizada', { id });
      
      return measurement;
    } catch (error) {
      log.error('Erro ao atualizar medição civil', error);
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
      
      const measurementPath = path.join(this.measurementsDir, `${id}.json`);
      if (fs.existsSync(measurementPath)) {
        fs.unlinkSync(measurementPath);
      }
      
      await this.removeMeasurementFromProject(measurement.project_id, id);
      
      log.info('Medição civil deletada', { id });
      
      return true;
    } catch (error) {
      log.error('Erro ao deletar medição civil', error);
      return false;
    }
  }

  /**
   * Adicionar medição ao projeto
   */
  private async addMeasurementToProject(projectId: string, measurementId: string): Promise<void> {
    const projectPath = path.join(this.projectsDir, `${projectId}.json`);
    
    let project: any;
    if (fs.existsSync(projectPath)) {
      const content = fs.readFileSync(projectPath, 'utf-8');
      project = JSON.parse(content);
    } else {
      throw new Error(`Projeto ${projectId} não encontrado`);
    }
    
    if (!project.civil_measurements) {
      project.civil_measurements = [];
    }
    
    if (!project.civil_measurements.includes(measurementId)) {
      project.civil_measurements.push(measurementId);
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
    const project = JSON.parse(content);
    
    if (project.civil_measurements) {
      project.civil_measurements = project.civil_measurements.filter((id: string) => id !== measurementId);
    }
    
    project.updated_at = new Date().toISOString();
    fs.writeFileSync(projectPath, JSON.stringify(project, null, 2));
  }
}

