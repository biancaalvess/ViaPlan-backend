// ============================================================================
// TIPOS E INTERFACES PARA FERRAMENTAS DE MEDIÇÃO - ENGENHARIA CIVIL PREDIAL
// Especificação v1.0 - 2024-01-20
// ============================================================================

// ============================================================================
// TIPOS BASE
// ============================================================================

export type CivilMeasurementType =
  | 'layout'
  | 'wall'
  | 'area'
  | 'opening'
  | 'slab'
  | 'foundation'
  | 'structure'
  | 'finishing'
  | 'roof'
  | 'note';

export interface Coordinate {
  x: number;
  y: number;
  z?: number;
}

export interface BaseCivilMeasurement {
  id: string;
  type: CivilMeasurementType;
  project_id: string;
  label: string;
  created_at: string; // ISO8601
  updated_at: string; // ISO8601
  created_by?: string;
}

// ============================================================================
// 1. PLANTA/LAYOUT
// ============================================================================

export interface LayoutMeasurement extends BaseCivilMeasurement {
  type: 'layout';
  geometry: {
    lines: Coordinate[][]; // Array de polilinhas
  };
  attributes: {
    default_wall_thickness_m?: number; // Espessura padrão da parede (m) - opcional
    axis?: string; // Eixo (ex: "A", "B", "1", "2")
    layer?: string; // Layer/Camada
  };
  output: {
    coordinates: Coordinate[];
    total_length_m: number; // Comprimento total (m)
    segment_directions?: Array<{ // Direção segmentada (vetor normalizado por segmento)
      segment_index: number;
      direction: { x: number; y: number }; // Vetor normalizado
      length_m: number;
    }>;
  };
}

// ============================================================================
// 2. PAREDES
// ============================================================================

export type WallMaterial = 
  | 'bloco_ceramico'
  | 'bloco_concreto'
  | 'tijolo_ceramico'
  | 'tijolo_baiano'
  | 'alvenaria_estrutural'
  | 'drywall'
  | 'outro';

export interface BlockParameters {
  length_mm: number; // Comprimento do bloco (mm) - L
  height_mm: number; // Altura do bloco (mm) - A
  width_mm: number; // Largura do bloco (mm) - espessura
  mortar_joint_horizontal_mm: number; // Junta horizontal (mm) - padrão: 10-15mm
  mortar_joint_vertical_mm: number; // Junta vertical (mm) - padrão: 10-15mm
}

export interface OpeningReference {
  opening_id: string; // ID da medição de vão
  width_m: number;
  height_m: number;
  area_m2: number;
}

export interface WallMeasurement extends BaseCivilMeasurement {
  type: 'wall';
  geometry: {
    polyline: Coordinate[]; // Polilinha da parede (fechada ou linear)
    height_m: number; // Altura H (m)
    thickness_m: number; // Espessura E (m)
  };
  attributes: {
    material: WallMaterial;
    custom_material?: string; // Se material = 'outro'
    density_kg_m3?: number; // Densidade do material (kg/m³)
    block_parameters?: BlockParameters; // Dimensões do bloco + juntas
  };
  openings?: OpeningReference[]; // Lista de vãos (janelas/portas) que impactam esta parede
  calculations: {
    length_m: number; // Comprimento da polilinha (m)
    masonry_area_m2: number; // Área de alvenaria sem vãos = Comprimento × H
    net_area_m2: number; // Área líquida com vãos = A_parede - Σ Áreas_de_vãos
    volume_m3: number; // Volume de alvenaria = A_liquida × E
    estimated_blocks?: number; // N_blocos = A_liquida / (L_eff × A_eff)
    estimated_mortar_m3?: number; // Volume de argamassa (8-12% do volume)
    estimated_weight_kg?: number; // Peso estimado (kg)
  };
}

// ============================================================================
// 3. ÁREA
// ============================================================================

export type AreaUsage = 
  | 'quarto'
  | 'sala'
  | 'cozinha'
  | 'banheiro'
  | 'circulacao'
  | 'area_comum'
  | 'garagem'
  | 'varanda'
  | 'outro';

export interface AreaMeasurement extends BaseCivilMeasurement {
  type: 'area';
  geometry: {
    polygon: Coordinate[]; // Polígono fechado (primeiro = último)
  };
  attributes: {
    usage: AreaUsage;
    custom_usage?: string; // Se usage = 'outro'
  };
  calculations: {
    total_area_m2: number; // Área total (m²)
    perimeter_m: number; // Perímetro (m)
  };
}

// ============================================================================
// 4. VÃOS/ABERTURAS
// ============================================================================

export type OpeningType = 'porta' | 'janela' | 'portao' | 'vazamento' | 'outro';

export type OpeningMaterial = 
  | 'madeira'
  | 'aluminio'
  | 'ferro'
  | 'pvc'
  | 'vidro'
  | 'outro';

export interface OpeningMeasurement extends BaseCivilMeasurement {
  type: 'opening';
  geometry: {
    shape: 'line' | 'rectangle';
    coordinates: Coordinate[]; // Linha ou retângulo (2 pontos para linha, 4 para retângulo)
    width_m: number; // Largura W (m)
    height_m: number; // Altura H (m)
  };
  attributes: {
    opening_type: OpeningType;
    material: OpeningMaterial;
    custom_type?: string;
    custom_material?: string;
  };
  wall_id?: string; // ID da parede associada (opcional)
  calculations: {
    quantity: number; // Quantidade Q
    opening_area_m2: number; // Área do vão A = W × H
  };
}

// ============================================================================
// 5. LAJES/PISOS
// ============================================================================

export type SlabStructuralType = 
  | 'macica'
  | 'nervurada'
  | 'pre_fabricada'
  | 'mista'
  | 'outro';

export type SlabMaterial = 
  | 'concreto'
  | 'concreto_armado'
  | 'laje_pre_moldada'
  | 'outro';

export interface SlabMeasurement extends BaseCivilMeasurement {
  type: 'slab';
  geometry: {
    polygon: Coordinate[]; // Polígono fechado
    thickness_m: number; // Espessura E (m)
  };
  attributes: {
    structural_type: SlabStructuralType;
    material: SlabMaterial;
    custom_type?: string;
    custom_material?: string;
    fck_mpa?: number; // Resistência do concreto (MPa)
    concrete_density_kg_m3?: number; // Densidade do concreto (kg/m³) - padrão: 2500
  };
  calculations: {
    area_m2: number; // Área (m²) - Shoelace
    volume_m3: number; // Volume de concreto V = Área × E
    estimated_consumption?: number; // Consumo de material (para pisos acabados)
    estimated_consumption_unit?: string; // Unidade do consumo
  };
}

// ============================================================================
// 6. FUNDAÇÃO
// ============================================================================

export type FoundationType = 
  | 'bloco'
  | 'sapata'
  | 'viga_baldrame'
  | 'radier'
  | 'estaca'
  | 'outro';

export type SoilType = 
  | 'argila'
  | 'areia'
  | 'siltoso'
  | 'rochoso'
  | 'misturado'
  | 'nao_especificado';

export interface FoundationMeasurement extends BaseCivilMeasurement {
  type: 'foundation';
  geometry: {
    foundation_type: FoundationType;
    // Para bloco/sapata
    dimensions?: {
      length_m: number;
      width_m: number;
      height_m: number;
    };
    // Para viga baldrame
    polyline?: Coordinate[];
    width_m?: number;
    height_m?: number;
    // Para radier
    polygon?: Coordinate[];
    thickness_m?: number;
  };
  attributes: {
    soil_type?: SoilType; // Opcional
    custom_type?: string;
  };
  calculations: {
    volume_m3: number; // Volume (m³)
    quantity?: number; // Quantidade (para blocos/sapatas)
  };
}

// ============================================================================
// 7. ESTRUTURA (CONCRETO)
// ============================================================================

export type StructuralElementType = 'viga' | 'pilar' | 'laje_estrutural';

export interface StructuralSection {
  type: 'rectangular' | 'circular' | 'custom';
  // Para retangular
  width_m?: number;
  height_m?: number;
  // Para circular
  diameter_m?: number;
  // Para custom
  area_m2?: number;
}

export interface StructureMeasurement extends BaseCivilMeasurement {
  type: 'structure';
  geometry: {
    element_type: StructuralElementType;
    // Para vigas
    polyline?: Coordinate[]; // Trajetória do elemento
    length_m?: number; // Comprimento L (m)
    section?: StructuralSection; // Seção A × B
    // Para pilares
    height_m?: number; // Altura H (m)
    // Para lajes estruturais
    polygon?: Coordinate[];
    thickness_m?: number; // Espessura E (m)
  };
  attributes: {
    material: 'concreto_armado' | 'concreto_protendido' | 'outro';
    custom_material?: string;
    fck_mpa?: number; // Resistência do concreto (MPa)
    rebar_rate_kg_m3?: number; // Taxa de armadura (kg/m³) - padrão: 80-120
  };
  calculations: {
    volume_m3: number; // Volume (m³)
    area_m2?: number; // Área (para lajes)
    estimated_rebar_kg?: number; // Estimativa de armadura kg_aco = V × taxa_kg/m3
  };
}

// ============================================================================
// 8. ACABAMENTOS
// ============================================================================

export type FinishingType = 
  | 'piso'
  | 'revestimento_parede'
  | 'pintura'
  | 'azulejo'
  | 'porcelanato'
  | 'granito'
  | 'outro';

export interface FinishingMeasurement extends BaseCivilMeasurement {
  type: 'finishing';
  geometry: {
    surface_area: {
      // Para piso/revestimento
      polygon?: Coordinate[];
      // Para pintura (múltiplas superfícies)
      surfaces?: Array<{
        polygon: Coordinate[];
        height_m?: number; // Para paredes
      }>;
    };
  };
  attributes: {
    finishing_type: FinishingType;
    custom_type?: string;
    standard_loss_percent: number; // Perda padrão (%)
    material_unit?: string; // Unidade do material (ex: "m²", "kg", "L")
  };
  calculations: {
    net_area_m2: number; // Área líquida (m²)
    estimated_consumption?: number; // Consumo estimado
    estimated_consumption_unit?: string; // Unidade do consumo
  };
}

// ============================================================================
// 9. COBERTURA
// ============================================================================

export type RoofMaterial = 
  | 'telha_ceramica'
  | 'telha_metalica'
  | 'laje'
  | 'membrana'
  | 'outro';

export interface RoofMeasurement extends BaseCivilMeasurement {
  type: 'roof';
  geometry: {
    // Plano inclinado ou múltiplos planos
    planes: Array<{
      polygon: Coordinate[]; // Polígono do plano
      inclination_degrees?: number; // Inclinação em graus
      inclination_percent?: number; // Inclinação em % (altura/100)
      azimuth_degrees?: number; // Orientação (azimute) em graus
    }>;
  };
  attributes: {
    material: RoofMaterial;
    custom_material?: string;
  };
  calculations: {
    real_area_m2: number; // Área real (m²) - considerando inclinação
    projected_area_m2: number; // Área projetada (m²) - projeção horizontal
  };
}

// ============================================================================
// 10. NOTA
// ============================================================================

export interface NoteMeasurement extends BaseCivilMeasurement {
  type: 'note';
  attributes: {
    text: string; // Texto da nota
    author?: string;
    date?: string; // ISO8601
  };
  geometry: {
    coordinates: Coordinate[]; // Georreferência no plano
    linked_measurement_id?: string; // ID de medição vinculada
  };
}

// ============================================================================
// UNION TYPE PARA TODAS AS MEDIÇÕES
// ============================================================================

export type CivilMeasurementData =
  | LayoutMeasurement
  | WallMeasurement
  | AreaMeasurement
  | OpeningMeasurement
  | SlabMeasurement
  | FoundationMeasurement
  | StructureMeasurement
  | FinishingMeasurement
  | RoofMeasurement
  | NoteMeasurement;

// ============================================================================
// REQUESTS E RESPONSES
// ============================================================================

export interface CreateCivilMeasurementRequest {
  project_id: string;
  type: CivilMeasurementType;
  data: Partial<CivilMeasurementData>;
  label: string;
}

export interface UpdateCivilMeasurementRequest {
  data?: Partial<CivilMeasurementData>;
  label?: string;
}

export interface CivilMeasurementListResponse {
  measurements: CivilMeasurement[];
  total: number;
  page?: number;
  limit?: number;
}

export interface CivilMeasurement {
  id: string;
  project_id: string;
  type: CivilMeasurementType;
  data: CivilMeasurementData;
  created_at: Date;
  updated_at: Date;
  created_by?: string;
}

// ============================================================================
// PRESETS BRASILEIROS
// ============================================================================

export interface BrazilianPresets {
  block_dimensions: {
    ceramico_9x19x19: BlockParameters; // 9x19x19 cm
    ceramico_14x19x19: BlockParameters; // 14x19x19 cm
    concreto_14x19x39: BlockParameters; // 14x19x39 cm
    tijolo_baiano: BlockParameters; // 9x19x19 cm
  };
  standard_thicknesses: {
    wall_external_m: number; // 0.20 m
    wall_internal_m: number; // 0.15 m
    slab_m: number; // 0.12 m
    foundation_m: number; // 0.20 m
  };
  standard_losses: {
    piso_percent: number; // 5%
    revestimento_percent: number; // 10%
    pintura_percent: number; // 5%
  };
}

