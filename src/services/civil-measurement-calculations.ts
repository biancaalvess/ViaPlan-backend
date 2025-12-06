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
// CÁLCULOS ESTRUTURAIS AVANÇADOS
// Baseado em: Cálculo Aplicado às Engenharias - Robson Rodrigues
// Fórmulas padronizadas para Mecânica dos Sólidos e Resistência dos Materiais
// ============================================================================

/**
 * Calcular momento de inércia para seção retangular
 * I = (b × h³) / 12
 * Eixo centróide para retângulo
 */
export function calculateMomentOfInertiaRectangular(
  width_m: number,
  height_m: number
): number {
  return (width_m * Math.pow(height_m, 3)) / 12;
}

/**
 * Alias para compatibilidade com nomenclatura alternativa
 */
export const calculateRectangleInertia = calculateMomentOfInertiaRectangular;

/**
 * Calcular momento de inércia para seção circular
 * I = (π × d⁴) / 64
 * Eixo centróide para círculo
 */
export function calculateMomentOfInertiaCircular(
  diameter_m: number
): number {
  return (Math.PI * Math.pow(diameter_m, 4)) / 64;
}

/**
 * Alias para compatibilidade com nomenclatura alternativa
 */
export const calculateCircleInertia = calculateMomentOfInertiaCircular;

/**
 * Interface para resultado da análise de viga simplesmente apoiada
 */
export interface BeamResult {
  maxDeflection: number; // Barriga (v_max) em metros
  maxMoment: number;     // Momento Fletor Máximo em N.m
  maxShear: number;      // Força Cortante Máxima em N
  angularDisp: number;   // Rotação nos apoios em radianos
}

/**
 * Análise completa de viga simplesmente apoiada com carga pontual no centro
 * Retorna todos os parâmetros estruturais calculados
 * 
 * @param P Carga pontual (Newton)
 * @param L Comprimento do vão (Metros)
 * @param E Módulo de Young/Elasticidade (Pa - Pascal)
 * @param I Momento de Inércia (m^4)
 */
export function analyzeSimplySupportedBeam(
  P: number,
  L: number,
  E: number,
  I: number
): BeamResult {
  if (L <= 0 || E <= 0 || I <= 0) {
    return {
      maxDeflection: 0,
      maxMoment: 0,
      maxShear: 0,
      angularDisp: 0
    };
  }

  return {
    // Deflexão Máxima: (P * L^3) / (48 * E * I)
    maxDeflection: (P * Math.pow(L, 3)) / (48 * E * I),
    
    // Momento Fletor Máximo (no centro): (P * L) / 4
    maxMoment: (P * L) / 4,
    
    // Força Cortante Máxima: P / 2
    maxShear: P / 2,
    
    // Deslocamento Angular (nos apoios): (P * L^2) / (16 * E * I)
    angularDisp: (P * Math.pow(L, 2)) / (16 * E * I)
  };
}

/**
 * Calcular deflexão máxima de viga simplesmente apoiada com carga pontual no centro
 * v_max = (P × L³) / (48 × E × I)
 * Onde:
 * - P: carga pontual (N)
 * - L: comprimento da viga (m)
 * - E: módulo de elasticidade (Pa = N/m²)
 * - I: momento de inércia (m⁴)
 * 
 * Retorna deflexão em metros
 */
export function calculateBeamDeflectionMax(
  load_N: number, // Carga em Newtons
  length_m: number, // Comprimento da viga em metros
  elasticModulus_Pa: number, // Módulo de elasticidade em Pascal (ex: 200000 MPa = 2×10¹¹ Pa)
  momentOfInertia_m4: number // Momento de inércia em m⁴
): number {
  if (length_m <= 0 || elasticModulus_Pa <= 0 || momentOfInertia_m4 <= 0) {
    return 0;
  }
  return (load_N * Math.pow(length_m, 3)) / (48 * elasticModulus_Pa * momentOfInertia_m4);
}

/**
 * Calcular deslocamento angular máximo de viga simplesmente apoiada com carga pontual no centro
 * θ_max = (P × L²) / (16 × E × I)
 * Retorna em radianos
 */
export function calculateBeamAngularDisplacementMax(
  load_N: number,
  length_m: number,
  elasticModulus_Pa: number,
  momentOfInertia_m4: number
): number {
  if (length_m <= 0 || elasticModulus_Pa <= 0 || momentOfInertia_m4 <= 0) {
    return 0;
  }
  return (load_N * Math.pow(length_m, 2)) / (16 * elasticModulus_Pa * momentOfInertia_m4);
}

/**
 * Calcular momento fletor máximo para viga simplesmente apoiada com carga pontual no centro
 * M_max = (P × L) / 4
 * Retorna em N.m
 */
export function calculateBeamBendingMomentMax(
  load_N: number,
  length_m: number
): number {
  return (load_N * length_m) / 4;
}

/**
 * Calcular força cortante máxima para viga simplesmente apoiada com carga pontual no centro
 * V_max = P / 2
 * Retorna em N
 */
export function calculateBeamShearForceMax(
  load_N: number
): number {
  return load_N / 2;
}

/**
 * Otimizar dimensões de viga retangular para máxima resistência
 * Para viga retangular: S = k × w × d² (onde k é constante)
 * Com restrição: w² + d² = D² (diâmetro do tronco)
 * 
 * Retorna dimensões otimizadas: { width_m, height_m }
 */
export function optimizeBeamDimensionsForMaxResistance(
  diameter_m: number, // Diâmetro do tronco/material disponível
  constant: number = 1 // Constante k (padrão: 1)
): { width_m: number; height_m: number; maxResistance: number } {
  // Derivando e igualando a zero, encontramos:
  // d = D × √(2/3)
  // w = D × √(1/3)
  const height_m = diameter_m * Math.sqrt(2 / 3);
  const width_m = diameter_m * Math.sqrt(1 / 3);
  const maxResistance = constant * width_m * Math.pow(height_m, 2);
  
  return {
    width_m: round(width_m),
    height_m: round(height_m),
    maxResistance: round(maxResistance)
  };
}

/**
 * Otimização estrutural para viga de tronco circular
 * Encontra dimensões ideais (largura b, altura h) para extrair
 * uma viga retangular de um tronco circular de diâmetro D
 * visando RESISTÊNCIA MÁXIMA (Módulo de Resistência S).
 * 
 * Lógica da derivada: Maximize S = (b * h^2) / 6 s.t. b^2 + h^2 = D^2
 * Resultado teórico: b = D / sqrt(3), h = D * sqrt(2/3)
 * 
 * @param diameter Diâmetro do tronco em metros
 */
export function optimizeBeamFromLog(
  diameter: number
): { width: number; height: number; sectionModulus: number } {
  const b = diameter / Math.sqrt(3);
  const h = diameter * Math.sqrt(2 / 3); // h = b * sqrt(2)
  
  return {
    width: round(b),
    height: round(h),
    sectionModulus: round((b * Math.pow(h, 2)) / 6)
  };
}

/**
 * Otimizar dimensões de área retangular para mínimo perímetro com área fixa
 * Para área fixa A = x × y, encontrar x e y que minimizam P = 2x + y (3 lados)
 * ou P = 2x + 2y (4 lados)
 * 
 * Retorna dimensões otimizadas
 */
export function optimizeRectangularDimensionsForMinPerimeter(
  area_m2: number,
  sides: 3 | 4 = 4 // 3 lados (um lado livre) ou 4 lados (cercado)
): { length_m: number; width_m: number; minPerimeter_m: number } {
  if (sides === 3) {
    // P = 2x + y, com A = x × y, então y = A/x
    // P = 2x + A/x
    // Derivando: dP/dx = 2 - A/x² = 0
    // x = √(A/2)
    const length_m = Math.sqrt(area_m2 / 2);
    const width_m = area_m2 / length_m;
    const minPerimeter_m = 2 * length_m + width_m;
    
    return {
      length_m: round(length_m),
      width_m: round(width_m),
      minPerimeter_m: round(minPerimeter_m)
    };
  } else {
    // P = 2x + 2y, com A = x × y
    // Para quadrado: x = y = √A
    const side_m = Math.sqrt(area_m2);
    
    return {
      length_m: round(side_m),
      width_m: round(side_m),
      minPerimeter_m: round(4 * side_m)
    };
  }
}

/**
 * Otimizar dimensões de área retangular para máxima área com perímetro fixo
 * Para perímetro fixo P = 2x + 2y, encontrar x e y que maximizam A = x × y
 * 
 * Retorna dimensões otimizadas
 */
export function optimizeRectangularDimensionsForMaxArea(
  perimeter_m: number,
  sides: 3 | 4 = 4 // 3 lados ou 4 lados
): { length_m: number; width_m: number; maxArea_m2: number } {
  if (sides === 3) {
    // P = 2x + y, então y = P - 2x
    // A = x × (P - 2x) = Px - 2x²
    // Derivando: dA/dx = P - 4x = 0
    // x = P/4, y = P/2
    const length_m = perimeter_m / 4;
    const width_m = perimeter_m / 2;
    const maxArea_m2 = length_m * width_m;
    
    return {
      length_m: round(length_m),
      width_m: round(width_m),
      maxArea_m2: round(maxArea_m2)
    };
  } else {
    // Para quadrado: x = y = P/4
    const side_m = perimeter_m / 4;
    
    return {
      length_m: round(side_m),
      width_m: round(side_m),
      maxArea_m2: round(side_m * side_m)
    };
  }
}

/**
 * Função auxiliar para arredondar números
 */
function round(value: number, decimals: number = 6): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
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
 * Interface Point para operações geométricas
 */
export interface Point {
  x: number;
  y: number;
}

/**
 * Calcular distância euclidiana entre dois pontos 2D
 */
function distance2D(p1: Coordinate, p2: Coordinate): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// ============================================================================
// GEOMETRIA VETORIAL E POLÍGONOS
// ============================================================================

/**
 * Calcular área de polígono usando algoritmo Shoelace
 * @param points Array de pontos do polígono (fechado ou não)
 * @returns Área do polígono (positiva)
 */
export function calculatePolygonAreaShoelace(points: Point[]): number {
  let area = 0;
  const n = points.length;
  
  if (n < 3) return 0;
  
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n; // Próximo vértice (volta ao 0 no final)
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  
  return Math.abs(area) / 2.0;
}

/**
 * Normalizar vetor (retornar vetor unitário)
 * @param v Vetor a ser normalizado
 * @returns Vetor normalizado (magnitude = 1)
 */
export function normalizeVector(v: Point): Point {
  const magnitude = Math.sqrt(v.x * v.x + v.y * v.y);
  if (magnitude === 0) return { x: 0, y: 0 };
  return { x: v.x / magnitude, y: v.y / magnitude };
}

/**
 * Produto Escalar (Dot Product) entre dois vetores
 * Útil para calcular ângulos: A . B = |A| |B| cos(theta)
 * @param v1 Primeiro vetor
 * @param v2 Segundo vetor
 * @returns Produto escalar
 */
export function dotProduct(v1: Point, v2: Point): number {
  return v1.x * v2.x + v1.y * v2.y;
}

/**
 * Conversão de Escala (Pixel para Metro)
 * @param pixels Distância em pixels
 * @param scaleFactor Fator de escala (metros por pixel)
 * @returns Distância em metros
 * 
 * Exemplo: scaleFactor = 0.05 (significa que 1 pixel = 0.05 metros)
 * Geralmente scaleFactor é calculado como (distanciaRealConhecida / distanciaPixelsMedida)
 */
export function pixelsToMeters(pixels: number, scaleFactor: number): number {
  return pixels * scaleFactor;
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
// ESTIMATIVAS E QUANTITATIVOS (TAKEOFF)
// ============================================================================

/**
 * Cálculo de blocos de alvenaria
 * @param wallArea Área total da parede em m²
 * @param openingsArea Área de vãos (portas, janelas) em m²
 * @param blockLength Comprimento do bloco em metros
 * @param blockHeight Altura do bloco em metros
 * @param jointThickness Espessura da argamassa (junta) em metros
 * @returns Quantidade de blocos necessários (arredondado para cima)
 */
export function calculateMasonryBlocks(
  wallArea: number,
  openingsArea: number,
  blockLength: number,
  blockHeight: number,
  jointThickness: number
): number {
  const netArea = wallArea - openingsArea;
  
  // Dimensão efetiva do bloco com junta
  const effectiveLength = blockLength + jointThickness;
  const effectiveHeight = blockHeight + jointThickness;
  
  const blockArea = effectiveLength * effectiveHeight;
  
  // Retorna quantidade arredondada para cima
  return Math.ceil(netArea / blockArea);
}

/**
 * Cálculo de área real de cobertura considerando inclinação
 * Correção de inclinação: área real = área projetada × fator de correção
 * @param projectedArea Área projetada (horizontal) em m²
 * @param slopePercentage Inclinação em porcentagem (altura/100)
 * @returns Área real da cobertura em m²
 * 
 * Fórmula: sec(theta) = sqrt(1 + tan²(theta)) onde tan(theta) = slopePercentage / 100
 */
export function calculateRoofRealArea(
  projectedArea: number,
  slopePercentage: number
): number {
  // Converter porcentagem para ângulo: tan(theta) = % / 100
  // Fator de multiplicação = 1 / cos(theta) = sec(theta)
  // Identidade: sec^2(x) = 1 + tan^2(x) => sec(x) = sqrt(1 + (pct/100)^2)
  
  const tanTheta = slopePercentage / 100;
  const correctionFactor = Math.sqrt(1 + tanTheta * tanTheta);
  
  return projectedArea * correctionFactor;
}

/**
 * Cálculo de peso de armadura (aço) para concreto
 * @param volumeConcrete Volume de concreto em m³
 * @param densityRate Taxa de armadura em kg/m³ (geralmente 80 a 120 kg/m³)
 * @returns Peso estimado de aço em kg
 */
export function calculateRebarWeight(
  volumeConcrete: number,
  densityRate: number
): number {
  // densityRate geralmente em kg/m³ (ex: 80 a 120 kg/m³)
  return volumeConcrete * densityRate;
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
  
  // 2.5 Blocagem estimada (usando função padronizada)
  let estimatedBlocks: number | undefined;
  if (blockParams) {
    estimatedBlocks = calculateMasonryBlocks(
      masonryArea,
      totalOpeningsArea,
      blockParams.length_mm / 1000, // Converter mm para m
      blockParams.height_mm / 1000, // Converter mm para m
      blockParams.mortar_joint_horizontal_mm / 1000 // Usar junta horizontal como referência
    );
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
  
  // Estimativa de armadura (usando função padronizada)
  // Taxas comuns: 80-120 kg/m³ (padrão: 100 kg/m³)
  const defaultRebarRate = rebar_rate_kg_m3 || 100; // kg/m³
  const estimatedRebar = calculateRebarWeight(volume, defaultRebarRate);
  
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
    
    // 9.2 Área real (usando função padronizada)
    let realPlaneArea = area;
    
    if (plane.inclination_percent !== undefined) {
      // Usar função padronizada para cálculo de área real com inclinação percentual
      realPlaneArea = calculateRoofRealArea(area, plane.inclination_percent);
    } else if (plane.inclination_degrees !== undefined) {
      // Se inclinação em graus: converter para porcentagem e usar função padronizada
      // tan(theta) = inclinação_porcentagem / 100
      // inclinação_porcentagem = 100 * tan(theta)
      const inclinationRad = (plane.inclination_degrees * Math.PI) / 180;
      const slopePercentage = 100 * Math.tan(inclinationRad);
      realPlaneArea = calculateRoofRealArea(area, slopePercentage);
    }
    
    realArea += realPlaneArea;
  }
  
  return {
    real_area_m2: realArea,
    projected_area_m2: projectedArea
  };
}

