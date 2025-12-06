// ============================================================================
// TIPOS E INTERFACES PARA FERRAMENTAS DE MEDIÇÃO VIAPLAN
// Especificação v1.0 - 2024-01-15
// ============================================================================

// ============================================================================
// TIPOS BASE
// ============================================================================

export type MeasurementType = 
  | 'select'
  | 'trench'
  | 'bore-shot'
  | 'hydro-excavation'
  | 'conduit'
  | 'vault'
  | 'area'
  | 'note';

export type Unit = 'meters';
export type AreaUnit = 'square_meters';
export type VolumeUnit = 'cubic_meters';

export interface Coordinate {
  x: number;
  y: number;
  z?: number; // Para medições 3D (HDD, condutos)
}

export interface BaseMeasurement {
  id: string;
  type: MeasurementType;
  project_id: string;
  label: string;
  created_at: string; // ISO8601
  updated_at: string; // ISO8601
}

// ============================================================================
// 1. SELECIONAR (Não mede, apenas edita)
// ============================================================================

export interface SelectMeasurement extends BaseMeasurement {
  type: 'select';
  selected_measurements: string[]; // IDs das medições selecionadas
  filters?: {
    type?: MeasurementType;
    date_range?: {
      start: string; // ISO8601
      end: string; // ISO8601
    };
  };
}

// ============================================================================
// 2. TRINCHEIRA ABERTA
// ============================================================================

export type SoilType = 'argila' | 'areia' | 'rocha' | 'misturado';

/**
 * Configuração de fatores de solo para cálculos de terraplenagem
 * Conforme normas técnicas brasileiras (Manual de Terraplenagem - Aldo Dórea Mattos)
 */
export interface SoilExpansionConfig {
  soil_type: SoilType;
  expansion_rate?: number; // Taxa de empolamento (decimal, ex: 0.25 para 25%)
  contraction_rate?: number; // Taxa de contração (decimal, ex: 0.10 para 10%)
  contraction_type?: 'normal' | 'alta'; // Tipo de contração para usar valores padrão
}
export type BackfillType = 'solo_nativo' | 'reaterro_fluido' | 'areia' | 'cascalho' | 'pedra_britada' | 'personalizado';

export interface WidthDepth {
  type: 'constant' | 'variable';
  value?: number; // Para constante
  values?: number[]; // Para variável (um por segmento)
  unit: 'm';
}

export interface AsphaltRemoval {
  width: number;
  thickness: number;
  volume_m3: number;
  unit: 'm';
}

export interface ConcreteRemoval {
  width: number;
  thickness: number;
  volume_m3: number;
  unit: 'm';
}

export interface Backfill {
  type: BackfillType;
  custom_type?: string;
  width: number;
  depth: number;
  volume_m3: number;
  unit: 'm';
}

export interface CrossSection {
  position: number; // Posição ao longo do traçado (0-1)
  width: number;
  depth: number;
  profile: Coordinate[]; // Perfil técnico
}

export interface TrenchMeasurement extends BaseMeasurement {
  type: 'trench';
  coordinates: Coordinate[]; // Polilinha (mínimo 2 pontos)
  width: WidthDepth;
  depth: WidthDepth;
  soil_type?: SoilType;
  soil_expansion_config?: SoilExpansionConfig; // Configuração de empolamento/contração
  length: number; // Comprimento total em metros
  volume_m3: number; // Volume de escavação (corte)
  volume_loose_m3?: number; // Volume solto (com empolamento) para transporte
  volume_compacted_m3?: number; // Volume compactado (após contração)
  asphalt_removal?: AsphaltRemoval;
  concrete_removal?: ConcreteRemoval;
  backfill?: Backfill;
  cross_sections?: CrossSection[];
}

// ============================================================================
// 3. PERFURAÇÃO DIRECIONAL (HDD)
// ============================================================================

export type ConduitMaterial = 'PVC' | 'HDPE' | 'Steel' | 'Aluminum' | 'Fiber Optic' | 'Copper' | 'Other';

export interface ConduitSpec {
  size_mm: string; // Tamanho nominal em milímetros (ex: "100")
  count: number;
  material: ConduitMaterial;
  sdr?: string; // Ex: "11", "17"
  outer_diameter_mm: number;
  min_curvature_radius_m: number;
}

export interface RadiusCheck {
  passed: boolean;
  min_radius_required_m: number;
  min_radius_actual_m: number;
  violations: Array<{
    segment_index: number;
    actual_radius_m: number;
    required_radius_m: number;
  }>;
}

export interface DepthCheck {
  passed: boolean;
  min_depth_required_m: number;
  min_depth_actual_m: number;
  violations: Array<{
    point_index: number;
    actual_depth_m: number;
    required_depth_m: number;
  }>;
}

export interface BoreShotValidation {
  radius_check: RadiusCheck;
  depth_check: DepthCheck;
}

export interface BoreShotMeasurement extends BaseMeasurement {
  type: 'bore-shot';
  coordinates: Coordinate[]; // Polilinha ou spline 3D (x, y, z)
  conduits: ConduitSpec[];
  entry_angle_degrees: number; // 0-90°
  exit_angle_degrees: number; // 0-90°
  min_depth_guaranteed_m: number;
  drill_diameter_mm: number;
  backreamer_diameter_mm: number;
  length_m: number; // Comprimento perfurado
  validation: BoreShotValidation;
}

// ============================================================================
// 4. HIDROESCAVAÇÃO
// ============================================================================

export type HydroExcavationSubtype = 'trench' | 'hole' | 'potholing';
export type SurfaceType = 'asphalt' | 'concrete' | 'dirt';

export interface HydroSection {
  shape: 'circular' | 'rectangular';
  diameter_m?: number; // Para circular
  width_m?: number; // Para retangular
  length_m?: number; // Para retangular
}

export interface HydroConduit {
  size_mm: string;
  count: number;
  material: ConduitMaterial;
}

export interface HydroExcavationMeasurement extends BaseMeasurement {
  type: 'hydro-excavation';
  subtype: HydroExcavationSubtype;
  coordinates: Coordinate[]; // Reta ou polilinha (trench) ou ponto único (hole)
  section: HydroSection;
  depth_m: number;
  volume_removed_m3: number; // Volume removido em metros cúbicos
  efficiency_ratio?: number; // 0-1 (perda por colapso)
  surface_type?: SurfaceType;
  include_restoration?: boolean;
  conduits?: HydroConduit[];
}

// ============================================================================
// 5. CONDUTO
// ============================================================================

export type InstallationMethod = 'trench' | 'hdd' | 'direct_bury';

export interface ConduitConnection {
  type: 'elbow' | 'tee' | 'reducer' | 'valve' | 'joint';
  position_m: number; // Posição ao longo do trajeto
  specifications: Record<string, unknown>;
}

export interface CompatibilityCheck {
  trench: boolean;
  hdd: boolean;
  direct_bury: boolean;
}

export interface ConduitMeasurement extends BaseMeasurement {
  type: 'conduit';
  coordinates: Coordinate[]; // Polilinha 3D (x, y, z)
  conduits: Array<{
    size_mm: string;
    count: number;
    material: ConduitMaterial;
    sdr?: string;
    nominal_diameter_mm: number;
    outer_diameter_mm: number;
    wall_thickness_mm: number;
    length_m: number;
  }>;
  connections?: ConduitConnection[];
  total_length_m: number;
  internal_volume_m3?: number; // Volume interno em metros cúbicos
  estimated_weight_kg?: number; // Peso estimado em quilogramas
  installation_method?: InstallationMethod;
  compatibility_check?: CompatibilityCheck;
}

// ============================================================================
// 6. CÂMARA / BURACO DE MÃO
// ============================================================================

export type VaultType = 'poço_visita' | 'caixa_passagem' | 'buraco_mao' | 'câmara';
export type VaultShape = 'rectangular' | 'circular';

export interface VaultDimensions {
  length_m?: number; // Para retangular
  width_m?: number; // Para retangular
  diameter_m?: number; // Para circular
  depth_m: number;
}

export interface VaultVolumes {
  excavation_m3: number;
  asphalt_removal_m3?: number;
  concrete_removal_m3?: number;
  asphalt_restoration_m3?: number;
  concrete_restoration_m3?: number;
  backfill_m3: number;
  backfill_type?: BackfillType;
}

export interface HoleSize {
  length_m: number;
  width_m: number;
  depth_m: number;
}

export interface VaultMeasurement extends BaseMeasurement {
  type: 'vault';
  coordinates: Coordinate[]; // Ponto único ou múltiplos pontos
  vault_type: VaultType;
  shape: VaultShape;
  dimensions: VaultDimensions;
  material?: string; // Ex: "Concreto Classe A"
  class?: string; // Ex: "H-20"
  quantity: number; // Quantidade de unidades idênticas
  volumes?: VaultVolumes;
  hole_size?: HoleSize;
  traffic_rated?: boolean;
}

// ============================================================================
// 7. ÁREA
// ============================================================================

export interface AreaMeasurement extends BaseMeasurement {
  type: 'area';
  coordinates: Coordinate[]; // Polígono fechado (primeiro = último, mínimo 3 pontos)
  area_m2: number;
  perimeter_m: number;
  depth_m?: number; // Opcional: para calcular volume
  volume_m3?: number; // Calculado se depth_m fornecido
}

// ============================================================================
// 8. NOTA
// ============================================================================

export interface NoteMeasurement extends BaseMeasurement {
  type: 'note';
  text: string; // Texto livre
  author?: string;
  date?: string; // ISO8601
  coordinates: Coordinate[]; // Localização no plano
  linked_measurement_id?: string; // ID de uma medição vinculada
}

// ============================================================================
// UNION TYPE PARA TODAS AS MEDIÇÕES
// ============================================================================

export type MeasurementData = 
  | SelectMeasurement
  | TrenchMeasurement
  | BoreShotMeasurement
  | HydroExcavationMeasurement
  | ConduitMeasurement
  | VaultMeasurement
  | AreaMeasurement
  | NoteMeasurement;

// ============================================================================
// ENTIDADE PRINCIPAL: MEASUREMENT (Compatibilidade)
// ============================================================================

export interface Measurement {
  id: string;
  project_id: string;
  type: MeasurementType;
  data: MeasurementData;
  created_at: Date;
  updated_at: Date;
  created_by?: string;
}

// ============================================================================
// REQUESTS E RESPONSES
// ============================================================================

export interface CreateMeasurementRequest {
  project_id: string;
  type: MeasurementType;
  data: Partial<MeasurementData>;
  label: string;
}

export interface UpdateMeasurementRequest {
  data?: Partial<MeasurementData>;
  label?: string;
}

export interface MeasurementListResponse {
  measurements: Measurement[];
  total: number;
  page?: number;
  limit?: number;
}

export interface MeasurementSummary {
  project_id: string;
  totals: {
    trench?: {
      count: number;
      total_length_m: number;
      total_volume_m3: number;
    };
    conduit?: {
      count: number;
      total_length_m: number;
    };
    vault?: {
      count: number;
      total_volume_m3: number;
    };
    area?: {
      count: number;
      total_area_m2: number;
    };
    'bore-shot'?: {
      count: number;
      total_length_m: number;
    };
    'hydro-excavation'?: {
      count: number;
      total_volume_m3: number;
    };
  };
  generated_at: string; // ISO8601
}

// ============================================================================
// FILTROS E QUERIES
// ============================================================================

export interface MeasurementFilters {
  project_id?: string;
  type?: MeasurementType;
  date_from?: string; // ISO8601
  date_to?: string; // ISO8601
  limit?: number;
  offset?: number;
}

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

export interface BatchUpdateRequest {
  measurement_ids: string[];
  updates: Partial<MeasurementData>;
}

export interface BatchDeleteRequest {
  measurement_ids: string[];
}
