// ============================================================================
// SERVIÇO DE CÁLCULOS PARA MEDIÇÕES DE ENGENHARIA CIVIL PREDIAL
// Especificação v1.0 - 2024-01-20
// ============================================================================

import {
  Coordinate,
  BlockParameters,
  BrazilianPresets
} from '../types/civil-measurement';

const EPSILON = 1e-6;

/**
 * Parse escala do formato "1:100" para fator numérico
 */
function parseScale(scale: string): number {
  const match = scale.match(/^(\d+):(\d+)$/);
  if (!match) {
    throw new Error(`Formato de escala inválido: ${scale}. Use formato "1:100"`);
  }
  const [, numerator, denominator] = match;
  return parseFloat(denominator) / parseFloat(numerator);
}

/**
 * Converter coordenadas do canvas (pixels) para coordenadas reais (metros) usando escala
 */
function canvasToReal(distance: number, scale: string): number {
  const scaleFactor = parseScale(scale);
  return distance * scaleFactor;
}

// ============================================================================
// PRESETS BRASILEIROS
// ============================================================================

export const BRAZILIAN_PRESETS: BrazilianPresets = {
  block_dimensions: {
    ceramico_9x19x19: {
      length_mm: 190, // L
      height_mm: 190, // A
      width_mm: 90, // Espessura
      mortar_joint_horizontal_mm: 10, // Junta horizontal padrão
      mortar_joint_vertical_mm: 10 // Junta vertical padrão
    },
    ceramico_14x19x19: {
      length_mm: 190,
      height_mm: 190,
      width_mm: 140,
      mortar_joint_horizontal_mm: 10,
      mortar_joint_vertical_mm: 10
    },
    concreto_14x19x39: {
      length_mm: 390,
      height_mm: 190,
      width_mm: 140,
      mortar_joint_horizontal_mm: 10,
      mortar_joint_vertical_mm: 10
    },
    tijolo_baiano: {
      length_mm: 190,
      height_mm: 190,
      width_mm: 90,
      mortar_joint_horizontal_mm: 15, // Tijolo baiano geralmente usa junta maior
      mortar_joint_vertical_mm: 15
    }
  },
  standard_thicknesses: {
    wall_external_m: 0.20,
    wall_internal_m: 0.15,
    slab_m: 0.12,
    foundation_m: 0.20
  },
  standard_losses: {
    piso_percent: 5,
    revestimento_percent: 10,
    pintura_percent: 5
  }
};

// ============================================================================
// UTILITÁRIOS
// ============================================================================

/**
 * Calcular distância euclidiana entre dois pontos 2D
 */
function distance2D(p1: Coordinate, p2: Coordinate): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calcular comprimento total de uma polilinha
 * @param coordinates Coordenadas em pixels do canvas
 * @param scale Escala no formato "1:100" (opcional, se não fornecido retorna em pixels)
 */
function calculatePolylineLength(coordinates: Coordinate[], scale?: string): number {
  if (coordinates.length < 2) return 0;
  
  let totalLength = 0;
  for (let i = 0; i < coordinates.length - 1; i++) {
    const segmentLength = distance2D(coordinates[i], coordinates[i + 1]);
    if (scale) {
      // Converter de pixels para metros usando escala
      totalLength += canvasToReal(segmentLength, scale);
    } else {
      // Retornar em pixels se escala não fornecida
      totalLength += segmentLength;
    }
  }
  return totalLength;
}

/**
 * Calcular área de polígono usando fórmula do Shoelace
 * @param coordinates Coordenadas em pixels do canvas
 * @param scale Escala no formato "1:100" (opcional, se não fornecido retorna em pixels²)
 */
function calculatePolygonArea(coordinates: Coordinate[], scale?: string): number {
  if (coordinates.length < 3) return 0;
  
  // Garantir que está fechado
  const closed = coordinates.length > 0 && 
    (Math.abs(coordinates[0].x - coordinates[coordinates.length - 1].x) < EPSILON &&
     Math.abs(coordinates[0].y - coordinates[coordinates.length - 1].y) < EPSILON);
  
  const points = closed ? coordinates : [...coordinates, coordinates[0]];
  
  let sum1 = 0;
  let sum2 = 0;
  
  for (let i = 0; i < points.length - 1; i++) {
    sum1 += points[i].x * points[i + 1].y;
    sum2 += points[i + 1].x * points[i].y;
  }
  
  // Área no canvas (pixels²)
  const canvasArea = Math.abs(sum1 - sum2) / 2;
  
  if (scale) {
    // Converter para área real usando escala² (porque é área)
    const scaleFactor = parseScale(scale);
    return canvasArea * (scaleFactor * scaleFactor);
  }
  
  return canvasArea;
}

/**
 * Calcular perímetro de polígono
 * @param coordinates Coordenadas em pixels do canvas
 * @param scale Escala no formato "1:100" (opcional, se não fornecido retorna em pixels)
 */
function calculatePolygonPerimeter(coordinates: Coordinate[], scale?: string): number {
  if (coordinates.length < 3) return 0;
  
  const closed = coordinates.length > 0 && 
    (Math.abs(coordinates[0].x - coordinates[coordinates.length - 1].x) < EPSILON &&
     Math.abs(coordinates[0].y - coordinates[coordinates.length - 1].y) < EPSILON);
  
  const points = closed ? coordinates : [...coordinates, coordinates[0]];
  
  let perimeter = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const segmentLength = distance2D(points[i], points[i + 1]);
    if (scale) {
      // Converter de pixels para metros usando escala
      perimeter += canvasToReal(segmentLength, scale);
    } else {
      // Retornar em pixels se escala não fornecida
      perimeter += segmentLength;
    }
  }
  
  return perimeter;
}

// ============================================================================
// 1. PLANTA/LAYOUT
// ============================================================================

export function calculateLayoutOutput(
  lines: Coordinate[][],
  scale?: string
): { 
  coordinates: Coordinate[]; 
  total_length_m: number;
  segment_directions?: Array<{
    segment_index: number;
    direction: { x: number; y: number };
    length_m: number;
  }>;
} {
  const allCoordinates: Coordinate[] = [];
  let totalLength = 0;
  const segmentDirections: Array<{
    segment_index: number;
    direction: { x: number; y: number };
    length_m: number;
  }> = [];
  let globalSegmentIndex = 0;
  
  for (const line of lines) {
    if (line.length >= 2) {
      allCoordinates.push(...line);
      
      // Calcular direção segmentada (vetor normalizado por segmento)
      for (let i = 0; i < line.length - 1; i++) {
        const dx = line[i + 1].x - line[i].x;
        const dy = line[i + 1].y - line[i].y;
        const segmentLengthPixels = Math.sqrt(dx * dx + dy * dy);
        
        if (segmentLengthPixels > EPSILON) {
          // Vetor normalizado
          const normalizedX = dx / segmentLengthPixels;
          const normalizedY = dy / segmentLengthPixels;
          
          // Converter para metros se escala fornecida
          const segmentLengthM = scale 
            ? canvasToReal(segmentLengthPixels, scale)
            : segmentLengthPixels;
          
          segmentDirections.push({
            segment_index: globalSegmentIndex++,
            direction: { x: normalizedX, y: normalizedY },
            length_m: segmentLengthM
          });
          
          totalLength += segmentLengthM;
        }
      }
    }
  }
  
  return {
    coordinates: allCoordinates,
    total_length_m: totalLength,
    segment_directions: segmentDirections
  };
}

// ============================================================================
// 2. PAREDES
// ============================================================================

export interface OpeningReference {
  opening_id: string;
  width_m: number;
  height_m: number;
  area_m2: number;
}

export function calculateWallMeasurements(
  polyline: Coordinate[],
  height_m: number,
  thickness_m: number,
  blockParams?: BlockParameters,
  openings?: OpeningReference[],
  scale?: string
): {
  length_m: number;
  masonry_area_m2: number;
  net_area_m2: number;
  volume_m3: number;
  estimated_blocks?: number;
  estimated_mortar_m3?: number;
  estimated_weight_kg?: number;
} {
  // 2.1 Comprimento (m) - converter de pixels para metros usando escala
  const length = calculatePolylineLength(polyline, scale);
  
  // 2.2 Área de alvenaria (sem vãos)
  const masonryArea = length * height_m;
  
  // 2.3 Área líquida (com vãos)
  let totalOpeningsArea = 0;
  if (openings && openings.length > 0) {
    totalOpeningsArea = openings.reduce((sum, opening) => sum + opening.area_m2, 0);
  }
  const netArea = masonryArea - totalOpeningsArea;
  
  // 2.4 Volume de alvenaria
  const volume = netArea * thickness_m;
  
  // 2.5 Blocagem estimada
  let estimatedBlocks: number | undefined;
  if (blockParams) {
    // Módulo efetivo do bloco (dimensão + junta)
    const L_eff = (blockParams.length_mm / 1000) + (blockParams.mortar_joint_horizontal_mm / 1000);
    const A_eff = (blockParams.height_mm / 1000) + (blockParams.mortar_joint_vertical_mm / 1000);
    
    // N_blocos = A_liquida / (L_eff × A_eff)
    estimatedBlocks = Math.ceil(netArea / (L_eff * A_eff));
  }
  
  // 2.6 Argamassa de assentamento (simplificado)
  // Coeficiente prático: 8-12% do volume (usando 10% como padrão)
  const mortarCoefficient = 0.10; // 10%
  const estimatedMortar = volume * mortarCoefficient;
  
  // Estimativa de peso (densidade padrão: 1500 kg/m³ para alvenaria)
  const defaultDensity = 1500; // kg/m³
  const estimatedWeight = volume * defaultDensity;
  
  const result: {
    length_m: number;
    masonry_area_m2: number;
    net_area_m2: number;
    volume_m3: number;
    estimated_blocks?: number;
    estimated_mortar_m3?: number;
    estimated_weight_kg?: number;
  } = {
    length_m: length,
    masonry_area_m2: masonryArea,
    net_area_m2: netArea,
    volume_m3: volume,
    estimated_mortar_m3: estimatedMortar,
    estimated_weight_kg: estimatedWeight
  };
  
  if (estimatedBlocks !== undefined) {
    result.estimated_blocks = estimatedBlocks;
  }
  
  return result;
}

// ============================================================================
// 3. ÁREA
// ============================================================================

export function calculateAreaMeasurements(
  polygon: Coordinate[],
  scale?: string
): {
  total_area_m2: number;
  perimeter_m: number;
} {
  const area = calculatePolygonArea(polygon, scale);
  const perimeter = calculatePolygonPerimeter(polygon, scale);
  
  return {
    total_area_m2: area,
    perimeter_m: perimeter
  };
}

// ============================================================================
// 4. VÃOS/ABERTURAS
// ============================================================================

export function calculateOpeningMeasurements(
  width_m: number,
  height_m: number,
  quantity: number = 1
): {
  quantity: number;
  opening_area_m2: number;
} {
  const area = width_m * height_m;
  
  return {
    quantity,
    opening_area_m2: area * quantity
  };
}

// ============================================================================
// 5. LAJES/PISOS
// ============================================================================

export function calculateSlabMeasurements(
  polygon: Coordinate[],
  thickness_m: number,
  scale?: string
): {
  area_m2: number;
  volume_m3: number;
} {
  const area = calculatePolygonArea(polygon, scale);
  const volume = area * thickness_m;
  
  return {
    area_m2: area,
    volume_m3: volume
  };
}

// ============================================================================
// 6. FUNDAÇÃO
// ============================================================================

export function calculateFoundationVolume(
  foundation_type: string,
  dimensions?: { length_m: number; width_m: number; height_m: number },
  polyline?: Coordinate[],
  width_m?: number,
  height_m?: number,
  polygon?: Coordinate[],
  thickness_m?: number,
  quantity: number = 1,
  scale?: string
): {
  volume_m3: number;
  quantity?: number;
} {
  let volume = 0;
  
  if (foundation_type === 'bloco' || foundation_type === 'sapata') {
    if (dimensions) {
      volume = dimensions.length_m * dimensions.width_m * dimensions.height_m;
    }
  } else if (foundation_type === 'viga_baldrame') {
    if (polyline && width_m && height_m) {
      const length = calculatePolylineLength(polyline, scale);
      volume = length * width_m * height_m;
    }
  } else if (foundation_type === 'radier') {
    if (polygon && thickness_m) {
      const area = calculatePolygonArea(polygon, scale);
      volume = area * thickness_m;
    }
  }
  
  // Multiplicar pela quantidade se for bloco/sapata
  if (foundation_type === 'bloco' || foundation_type === 'sapata') {
    return {
      volume_m3: volume * quantity,
      quantity
    };
  }
  
  return {
    volume_m3: volume
  };
}

// ============================================================================
// 7. ESTRUTURA (CONCRETO)
// ============================================================================

export function calculateStructureVolume(
  element_type: string,
  polyline?: Coordinate[],
  section?: { type: string; width_m?: number; height_m?: number; diameter_m?: number; area_m2?: number },
  length_m?: number,
  height_m?: number,
  polygon?: Coordinate[],
  thickness_m?: number,
  rebar_rate_kg_m3?: number,
  scale?: string
): {
  volume_m3: number;
  area_m2?: number;
  estimated_rebar_kg?: number;
} {
  let volume = 0;
  let area: number | undefined;
  
  // 7.1 Volume viga: V = L × A × B
  if (element_type === 'viga') {
    let elementLength = length_m || 0;
    if (polyline && !length_m) {
      elementLength = calculatePolylineLength(polyline, scale);
    }
    
    let sectionArea = 0;
    if (section) {
      if (section.type === 'rectangular' && section.width_m && section.height_m) {
        sectionArea = section.width_m * section.height_m;
      } else if (section.type === 'circular' && section.diameter_m) {
        sectionArea = Math.PI * Math.pow(section.diameter_m / 2, 2);
      } else if (section.type === 'custom' && section.area_m2) {
        sectionArea = section.area_m2;
      }
    }
    
    volume = elementLength * sectionArea;
  }
  // 7.2 Volume pilar: V = H × A × B
  else if (element_type === 'pilar') {
    const elementHeight = height_m || 0;
    
    let sectionArea = 0;
    if (section) {
      if (section.type === 'rectangular' && section.width_m && section.height_m) {
        sectionArea = section.width_m * section.height_m;
      } else if (section.type === 'circular' && section.diameter_m) {
        sectionArea = Math.PI * Math.pow(section.diameter_m / 2, 2);
      } else if (section.type === 'custom' && section.area_m2) {
        sectionArea = section.area_m2;
      }
    }
    
    volume = elementHeight * sectionArea;
  }
  // 7.3 Volume laje estrutural: V = Área × E
  else if (element_type === 'laje_estrutural') {
    if (polygon && thickness_m) {
      area = calculatePolygonArea(polygon, scale);
      volume = area * thickness_m;
    }
  }
  
  // Estimativa de armadura: kg_aco = V × taxa_kg/m3
  // Taxas comuns: 80-120 kg/m³ (padrão: 100 kg/m³)
  const defaultRebarRate = rebar_rate_kg_m3 || 100; // kg/m³
  const estimatedRebar = volume * defaultRebarRate;
  
  const result: {
    volume_m3: number;
    area_m2?: number;
    estimated_rebar_kg?: number;
  } = {
    volume_m3: volume
  };
  
  if (area !== undefined) {
    result.area_m2 = area;
  }
  
  if (estimatedRebar !== undefined) {
    result.estimated_rebar_kg = estimatedRebar;
  }
  
  return result;
}

// ============================================================================
// 8. ACABAMENTOS
// ============================================================================

export function calculateFinishingMeasurements(
  polygon?: Coordinate[],
  surfaces?: Array<{ polygon: Coordinate[]; height_m?: number }>,
  standard_loss_percent: number = 0,
  scale?: string
): {
  net_area_m2: number;
  estimated_consumption?: number;
} {
  // 8.1 Área base: Shoelace
  let totalArea = 0;
  
  if (polygon) {
    totalArea = calculatePolygonArea(polygon, scale);
  } else if (surfaces) {
    for (const surface of surfaces) {
      const area = calculatePolygonArea(surface.polygon, scale);
      // Se for parede, multiplicar pela altura
      if (surface.height_m) {
        const perimeter = calculatePolygonPerimeter(surface.polygon, scale);
        totalArea += perimeter * surface.height_m;
      } else {
        totalArea += area;
      }
    }
  }
  
  // 8.2 Área líquida: A_liquida = A × (1 + perda_percentual)
  // Nota: A especificação diz A_liquida = A × (1 + perda%), mas isso parece ser o consumo
  // Área líquida seria a área base, e consumo seria com perda
  const netArea = totalArea;
  
  // 8.3 Consumo estimado (com perda)
  const estimatedConsumption = standard_loss_percent > 0
    ? netArea * (1 + standard_loss_percent / 100)
    : netArea;
  
  return {
    net_area_m2: netArea,
    estimated_consumption: estimatedConsumption
  };
}

// ============================================================================
// 9. COBERTURA
// ============================================================================

export function calculateRoofMeasurements(
  planes: Array<{ 
    polygon: Coordinate[]; 
    inclination_degrees?: number; 
    inclination_percent?: number; // Inclinação em % (altura/100)
    azimuth_degrees?: number;
  }>,
  scale?: string
): {
  real_area_m2: number;
  projected_area_m2: number;
} {
  let projectedArea = 0;
  let realArea = 0;
  
  for (const plane of planes) {
    // 9.1 Área projetada: Polígono
    const area = calculatePolygonArea(plane.polygon, scale);
    projectedArea += area;
    
    // 9.2 Área real
    let realPlaneArea = area;
    
    if (plane.inclination_percent !== undefined) {
      // Se inclinação dada como porcentagem (altura/100)
      // Fator = sqrt(1 + i²)
      const i = plane.inclination_percent / 100;
      const factor = Math.sqrt(1 + i * i);
      realPlaneArea = area * factor;
    } else if (plane.inclination_degrees !== undefined) {
      // Se inclinação em graus: A_real = A_proj / cos(θ)
      const inclinationRad = (plane.inclination_degrees * Math.PI) / 180;
      const cosInclination = Math.cos(inclinationRad);
      if (cosInclination > EPSILON) {
        realPlaneArea = area / cosInclination;
      } else {
        realPlaneArea = area; // Evitar divisão por zero
      }
    }
    
    realArea += realPlaneArea;
  }
  
  return {
    real_area_m2: realArea,
    projected_area_m2: projectedArea
  };
}

