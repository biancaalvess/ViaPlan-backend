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

export type Unit = 'meters' | 'feet' | 'inches' | 'millimeters';
export type AreaUnit = 'square_meters' | 'square_feet';
export type VolumeUnit = 'cubic_meters' | 'cubic_yards' | 'cubic_feet';

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
export type BackfillType = 'solo_nativo' | 'reaterro_fluido' | 'areia' | 'cascalho' | 'pedra_britada' | 'personalizado';

export interface WidthDepth {
  type: 'constant' | 'variable';
  value?: number; // Para constante
  values?: number[]; // Para variável (um por segmento)
  unit: 'm' | 'ft';
}

export interface AsphaltRemoval {
  width: number;
  thickness: number;
  volume_m3: number;
  unit: 'm' | 'ft';
}

export interface ConcreteRemoval {
  width: number;
  thickness: number;
  volume_m3: number;
  unit: 'm' | 'ft';
}

export interface Backfill {
  type: BackfillType;
  custom_type?: string;
  width: number;
  depth: number;
  volume_m3: number;
  unit: 'm' | 'ft';
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
  length: number; // Comprimento total em metros
  volume_m3: number; // Volume de escavação
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
  size_in: string; // Tamanho nominal (ex: "4")
  count: number;
  material: ConduitMaterial;
  sdr?: string; // Ex: "11", "17"
  outer_diameter_in: number;
  min_curvature_radius_ft: number;
}

export interface RadiusCheck {
  passed: boolean;
  min_radius_required_ft: number;
  min_radius_actual_ft: number;
  violations: Array<{
    segment_index: number;
    actual_radius_ft: number;
    required_radius_ft: number;
  }>;
}

export interface DepthCheck {
  passed: boolean;
  min_depth_required_ft: number;
  min_depth_actual_ft: number;
  violations: Array<{
    point_index: number;
    actual_depth_ft: number;
    required_depth_ft: number;
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
  min_depth_guaranteed_ft: number;
  drill_diameter_in: number;
  backreamer_diameter_in: number;
  length_ft: number; // Comprimento perfurado
  validation: BoreShotValidation;
}

// ============================================================================
// 4. HIDROESCAVAÇÃO
// ============================================================================

export type HydroExcavationSubtype = 'trench' | 'hole' | 'potholing';
export type SurfaceType = 'asphalt' | 'concrete' | 'dirt';

export interface HydroSection {
  shape: 'circular' | 'rectangular';
  diameter_ft?: number; // Para circular
  width_ft?: number; // Para retangular
  length_ft?: number; // Para retangular
}

export interface HydroConduit {
  size_in: string;
  count: number;
  material: ConduitMaterial;
}

export interface HydroExcavationMeasurement extends BaseMeasurement {
  type: 'hydro-excavation';
  subtype: HydroExcavationSubtype;
  coordinates: Coordinate[]; // Reta ou polilinha (trench) ou ponto único (hole)
  section: HydroSection;
  depth_ft: number;
  volume_removed_cy: number; // Volume removido em jardas cúbicas
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
  position_ft: number; // Posição ao longo do trajeto
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
    size_in: string;
    count: number;
    material: ConduitMaterial;
    sdr?: string;
    nominal_diameter_in: number;
    outer_diameter_in: number;
    wall_thickness_in: number;
    length_ft: number;
  }>;
  connections?: ConduitConnection[];
  total_length_ft: number;
  internal_volume_gal?: number; // Volume interno em galões
  estimated_weight_lb?: number; // Peso estimado em libras
  installation_method?: InstallationMethod;
  compatibility_check?: CompatibilityCheck;
}

// ============================================================================
// 6. CÂMARA / BURACO DE MÃO
// ============================================================================

export type VaultType = 'poço_visita' | 'caixa_passagem' | 'buraco_mao' | 'câmara';
export type VaultShape = 'rectangular' | 'circular';

export interface VaultDimensions {
  length_ft?: number; // Para retangular
  width_ft?: number; // Para retangular
  diameter_ft?: number; // Para circular
  depth_ft: number;
}

export interface VaultVolumes {
  excavation_cy: number;
  asphalt_removal_cy?: number;
  concrete_removal_cy?: number;
  asphalt_restoration_cy?: number;
  concrete_restoration_cy?: number;
  backfill_cy: number;
  backfill_type?: BackfillType;
}

export interface HoleSize {
  length_ft: number;
  width_ft: number;
  depth_ft: number;
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
  area_sqft: number;
  area_sqm: number;
  perimeter_ft: number;
  perimeter_m: number;
  depth_ft?: number; // Opcional: para calcular volume
  volume_cy?: number; // Calculado se depth_ft fornecido
  volume_m3?: number; // Calculado se depth_ft fornecido
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
      total_length_ft: number;
      total_volume_cy: number;
    };
    conduit?: {
      count: number;
      total_length_ft: number;
    };
    vault?: {
      count: number;
      total_volume_cy: number;
    };
    area?: {
      count: number;
      total_area_sqft: number;
    };
    'bore-shot'?: {
      count: number;
      total_length_ft: number;
    };
    'hydro-excavation'?: {
      count: number;
      total_volume_cy: number;
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
