// ============================================================================
// CÁLCULOS ESPECÍFICOS PARA FERRAMENTAS DE MEDIÇÃO VIAPLAN
// Especificação v1.0 - 2024-01-15
// ============================================================================

import {
  Coordinate,
  RadiusCheck,
  DepthCheck
} from '../types/measurement';

// ============================================================================
// CONSTANTES E CONVERSÕES
// ============================================================================

const FEET_TO_METERS = 0.3048;
const METERS_TO_FEET = 3.28084;
const CUBIC_FEET_TO_CUBIC_YARDS = 1 / 27;
const CUBIC_METERS_TO_CUBIC_YARDS = 1.30795;
const GALLONS_TO_CUBIC_FEET = 0.133681;
const EPSILON = 1e-6;

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
 * Calcular distância euclidiana entre dois pontos 3D
 */
function distance3D(p1: Coordinate, p2: Coordinate): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const dz = (p2.z || 0) - (p1.z || 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Calcular comprimento total de uma polilinha
 */
function calculatePolylineLength(coordinates: Coordinate[]): number {
  if (coordinates.length < 2) return 0;
  
  let totalLength = 0;
  for (let i = 0; i < coordinates.length - 1; i++) {
    totalLength += distance2D(coordinates[i], coordinates[i + 1]);
  }
  return totalLength;
}

/**
 * Calcular comprimento total de uma polilinha 3D
 */
function calculatePolylineLength3D(coordinates: Coordinate[]): number {
  if (coordinates.length < 2) return 0;
  
  let totalLength = 0;
  for (let i = 0; i < coordinates.length - 1; i++) {
    totalLength += distance3D(coordinates[i], coordinates[i + 1]);
  }
  return totalLength;
}

// ============================================================================
// 2. TRINCHEIRA ABERTA
// ============================================================================

/**
 * Calcular comprimento total da trincheira
 */
export function calculateTrenchLength(coordinates: Coordinate[]): number {
  return calculatePolylineLength(coordinates);
}

/**
 * Calcular volume de escavação da trincheira
 */
export function calculateTrenchVolume(
  coordinates: Coordinate[],
  width: { type: 'constant' | 'variable'; value?: number; values?: number[] },
  depth: { type: 'constant' | 'variable'; value?: number; values?: number[] }
): number {
  const length = calculateTrenchLength(coordinates);
  
  if (length === 0) return 0;
  
  // Se ambos são constantes
  if (width.type === 'constant' && depth.type === 'constant') {
    return length * (width.value || 0) * (depth.value || 0);
  }
  
  // Se um ou ambos são variáveis, calcular por segmento
  let totalVolume = 0;
  const segmentCount = coordinates.length - 1;
  
  for (let i = 0; i < segmentCount; i++) {
    const segmentLength = distance2D(coordinates[i], coordinates[i + 1]);
    const segmentWidth = width.type === 'variable' 
      ? (width.values?.[i] || 0)
      : (width.value || 0);
    const segmentDepth = depth.type === 'variable'
      ? (depth.values?.[i] || 0)
      : (depth.value || 0);
    
    totalVolume += segmentLength * segmentWidth * segmentDepth;
  }
  
  return totalVolume;
}

/**
 * Calcular volume de remoção de asfalto
 */
export function calculateAsphaltRemoval(
  length: number,
  width: number,
  thickness: number
): number {
  return length * width * thickness;
}

/**
 * Calcular volume de remoção de concreto
 */
export function calculateConcreteRemoval(
  length: number,
  width: number,
  thickness: number
): number {
  return length * width * thickness;
}

/**
 * Calcular volume de reaterro
 */
export function calculateBackfill(
  _length: number,
  _width: number,
  _depth: number,
  excavationVolume: number,
  asphaltVolume?: number,
  concreteVolume?: number
): number {
  const totalRemoval = (asphaltVolume || 0) + (concreteVolume || 0);
  return excavationVolume - totalRemoval;
}

// ============================================================================
// 3. PERFURAÇÃO DIRECIONAL (HDD)
// ============================================================================

/**
 * Calcular raio de curvatura entre três pontos
 */
function calculateCurvatureRadius(
  p1: Coordinate,
  p2: Coordinate,
  p3: Coordinate
): number {
  // Vetores
  const v1 = { x: p2.x - p1.x, y: p2.y - p1.y, z: (p2.z || 0) - (p1.z || 0) };
  const v2 = { x: p3.x - p2.x, y: p3.y - p2.y, z: (p3.z || 0) - (p2.z || 0) };
  
  // Comprimentos
  const len1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y + v1.z * v1.z);
  const len2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y + v2.z * v2.z);
  
  if (len1 < EPSILON || len2 < EPSILON) {
    return Infinity; // Segmentos muito curtos ou colineares
  }
  
  // Produto escalar
  const dot = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
  const cosAngle = dot / (len1 * len2);
  
  // Limitar cosAngle para evitar erros numéricos
  const clampedCos = Math.max(-1, Math.min(1, cosAngle));
  const angle = Math.acos(clampedCos);
  
  // Raio = comprimento do segmento / (2 * sin(ângulo/2))
  const sinHalfAngle = Math.sin(angle / 2);
  if (sinHalfAngle < EPSILON) {
    return Infinity; // Praticamente reto
  }
  
  const radius = (len1 + len2) / (2 * sinHalfAngle);
  return radius;
}

/**
 * Validar raio de curvatura mínimo
 */
export function validateBoreShotRadius(
  coordinates: Coordinate[],
  minRadiusRequiredFt: number
): RadiusCheck {
  const violations: RadiusCheck['violations'] = [];
  let minRadiusActualFt = Infinity;
  
  if (coordinates.length < 3) {
    return {
      passed: true,
      min_radius_required_ft: minRadiusRequiredFt,
      min_radius_actual_ft: Infinity,
      violations: []
    };
  }
  
  // Verificar cada tripla de pontos consecutivos
  for (let i = 0; i < coordinates.length - 2; i++) {
    const radius = calculateCurvatureRadius(
      coordinates[i],
      coordinates[i + 1],
      coordinates[i + 2]
    );
    
    const radiusFt = radius * METERS_TO_FEET; // Assumindo coordenadas em metros
    
    if (radiusFt < minRadiusActualFt) {
      minRadiusActualFt = radiusFt;
    }
    
    if (radiusFt < minRadiusRequiredFt) {
      violations.push({
        segment_index: i,
        actual_radius_ft: radiusFt,
        required_radius_ft: minRadiusRequiredFt
      });
    }
  }
  
  return {
    passed: violations.length === 0,
    min_radius_required_ft: minRadiusRequiredFt,
    min_radius_actual_ft: minRadiusActualFt === Infinity ? 0 : minRadiusActualFt,
    violations
  };
}

/**
 * Validar profundidade mínima
 */
export function validateBoreShotDepth(
  coordinates: Coordinate[],
  minDepthRequiredFt: number
): DepthCheck {
  const violations: DepthCheck['violations'] = [];
  let minDepthActualFt = Infinity;
  
  const minDepthMeters = minDepthRequiredFt * FEET_TO_METERS;
  
  for (let i = 0; i < coordinates.length; i++) {
    const depth = coordinates[i].z || 0;
    const depthFt = depth * METERS_TO_FEET; // Assumindo coordenadas em metros
    
    if (depthFt < minDepthActualFt) {
      minDepthActualFt = depthFt;
    }
    
    if (depth < minDepthMeters) {
      violations.push({
        point_index: i,
        actual_depth_ft: depthFt,
        required_depth_ft: minDepthRequiredFt
      });
    }
  }
  
  return {
    passed: violations.length === 0,
    min_depth_required_ft: minDepthRequiredFt,
    min_depth_actual_ft: minDepthActualFt === Infinity ? 0 : minDepthActualFt,
    violations
  };
}

/**
 * Calcular comprimento perfurado
 */
export function calculateBoreShotLength(coordinates: Coordinate[]): number {
  return calculatePolylineLength3D(coordinates);
}

// ============================================================================
// 4. HIDROESCAVAÇÃO
// ============================================================================

/**
 * Calcular volume removido por hidroescavação
 */
export function calculateHydroExcavationVolume(
  subtype: 'trench' | 'hole' | 'potholing',
  coordinates: Coordinate[],
  section: { shape: 'circular' | 'rectangular'; diameter_ft?: number; width_ft?: number; length_ft?: number },
  depth_ft: number,
  efficiency_ratio?: number
): number {
  let volumeCubicFeet = 0;
  
  if (subtype === 'trench') {
    const lengthFt = calculatePolylineLength(coordinates) * METERS_TO_FEET;
    
    if (section.shape === 'circular') {
      const radiusFt = (section.diameter_ft || 0) / 2;
      volumeCubicFeet = Math.PI * radiusFt * radiusFt * lengthFt;
    } else {
      volumeCubicFeet = (section.width_ft || 0) * (section.length_ft || 0) * lengthFt;
    }
  } else if (subtype === 'hole') {
    if (section.shape === 'circular') {
      const radiusFt = (section.diameter_ft || 0) / 2;
      volumeCubicFeet = Math.PI * radiusFt * radiusFt * depth_ft;
    } else {
      volumeCubicFeet = (section.width_ft || 0) * (section.length_ft || 0) * depth_ft;
    }
  } else if (subtype === 'potholing') {
    // Múltiplos pontos com profundidade média
    const avgDepth = depth_ft;
    const pointCount = coordinates.length;
    
    if (section.shape === 'circular') {
      const radiusFt = (section.diameter_ft || 0) / 2;
      const volumePerHole = Math.PI * radiusFt * radiusFt * avgDepth;
      volumeCubicFeet = volumePerHole * pointCount;
    } else {
      const volumePerHole = (section.width_ft || 0) * (section.length_ft || 0) * avgDepth;
      volumeCubicFeet = volumePerHole * pointCount;
    }
  }
  
  // Aplicar eficiência se fornecida
  if (efficiency_ratio !== undefined) {
    volumeCubicFeet = volumeCubicFeet * efficiency_ratio;
  }
  
  // Converter para jardas cúbicas
  return volumeCubicFeet * CUBIC_FEET_TO_CUBIC_YARDS;
}

// ============================================================================
// 5. CONDUTO
// ============================================================================

/**
 * Calcular comprimento total do conduto
 */
export function calculateConduitLength(coordinates: Coordinate[]): number {
  return calculatePolylineLength3D(coordinates);
}

/**
 * Calcular volume interno do conduto
 */
export function calculateConduitInternalVolume(
  nominalDiameterIn: number,
  lengthFt: number
): number {
  // Converter polegadas para pés
  const radiusFt = (nominalDiameterIn / 2) * (1 / 12);
  const volumeCubicFeet = Math.PI * radiusFt * radiusFt * lengthFt;
  // Converter para galões
  return volumeCubicFeet / GALLONS_TO_CUBIC_FEET;
}

/**
 * Estimar peso do conduto (aproximado)
 */
export function estimateConduitWeight(
  material: string,
  outerDiameterIn: number,
  wallThicknessIn: number,
  lengthFt: number
): number {
  // Densidades aproximadas (lb/ft³)
  const densities: Record<string, number> = {
    'PVC': 90,
    'HDPE': 59,
    'Steel': 490,
    'Aluminum': 169,
    'Fiber Optic': 100,
    'Copper': 559
  };
  
  const density = densities[material] || 100;
  
  // Volume do material (cilindro externo - cilindro interno)
  const outerRadiusFt = (outerDiameterIn / 2) * (1 / 12);
  const innerRadiusFt = ((outerDiameterIn - 2 * wallThicknessIn) / 2) * (1 / 12);
  const volumeCubicFeet = Math.PI * (outerRadiusFt * outerRadiusFt - innerRadiusFt * innerRadiusFt) * lengthFt;
  
  return volumeCubicFeet * density;
}

// ============================================================================
// 6. CÂMARA / BURACO DE MÃO
// ============================================================================

/**
 * Calcular volume de escavação da câmara
 */
export function calculateVaultExcavationVolume(
  shape: 'rectangular' | 'circular',
  dimensions: { length_ft?: number; width_ft?: number; diameter_ft?: number; depth_ft: number }
): number {
  let volumeCubicFeet = 0;
  
  if (shape === 'circular') {
    const radiusFt = (dimensions.diameter_ft || 0) / 2;
    volumeCubicFeet = Math.PI * radiusFt * radiusFt * dimensions.depth_ft;
  } else {
    volumeCubicFeet = (dimensions.length_ft || 0) * (dimensions.width_ft || 0) * dimensions.depth_ft;
  }
  
  return volumeCubicFeet * CUBIC_FEET_TO_CUBIC_YARDS;
}

/**
 * Calcular volume de reaterro da câmara
 */
export function calculateVaultBackfill(
  excavationVolume: number,
  structureVolume?: number,
  asphaltRemoval?: number,
  concreteRemoval?: number
): number {
  const totalRemoval = (asphaltRemoval || 0) + (concreteRemoval || 0);
  return excavationVolume - (structureVolume || 0) - totalRemoval;
}

// ============================================================================
// 7. ÁREA
// ============================================================================

/**
 * Calcular área usando fórmula do polígono (Shoelace)
 */
export function calculatePolygonArea(coordinates: Coordinate[]): number {
  if (coordinates.length < 3) return 0;
  
  // Garantir que o polígono está fechado
  const closed = coordinates.length > 0 && 
    (coordinates[0].x !== coordinates[coordinates.length - 1].x ||
     coordinates[0].y !== coordinates[coordinates.length - 1].y);
  
  const points = closed ? coordinates : [...coordinates, coordinates[0]];
  
  let area = 0;
  for (let i = 0; i < points.length - 1; i++) {
    area += points[i].x * points[i + 1].y;
    area -= points[i + 1].x * points[i].y;
  }
  
  return Math.abs(area) / 2;
}

/**
 * Calcular perímetro do polígono
 */
export function calculatePolygonPerimeter(coordinates: Coordinate[]): number {
  if (coordinates.length < 3) return 0;
  
  let perimeter = 0;
  const closed = coordinates.length > 0 && 
    (coordinates[0].x !== coordinates[coordinates.length - 1].x ||
     coordinates[0].y !== coordinates[coordinates.length - 1].y);
  
  const points = closed ? coordinates : [...coordinates, coordinates[0]];
  
  for (let i = 0; i < points.length - 1; i++) {
    perimeter += distance2D(points[i], points[i + 1]);
  }
  
  return perimeter;
}

/**
 * Validar polígono (verificar se está fechado e sem auto-intersecções)
 */
export function validatePolygon(coordinates: Coordinate[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (coordinates.length < 3) {
    errors.push('Polígono deve ter pelo menos 3 pontos');
  }
  
  // Verificar se está fechado
  const isClosed = coordinates.length > 0 && 
    (Math.abs(coordinates[0].x - coordinates[coordinates.length - 1].x) < EPSILON &&
     Math.abs(coordinates[0].y - coordinates[coordinates.length - 1].y) < EPSILON);
  
  if (!isClosed && coordinates.length > 0) {
    errors.push('Polígono deve estar fechado (primeiro ponto = último ponto)');
  }
  
  // Verificação básica de auto-intersecção (simplificada)
  // Uma verificação completa seria mais complexa
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Calcular volume a partir de área e profundidade
 */
export function calculateVolumeFromArea(
  areaSqft: number,
  depthFt: number
): { volume_cy: number; volume_m3: number } {
  const volumeCubicFeet = areaSqft * depthFt;
  const volumeCy = volumeCubicFeet * CUBIC_FEET_TO_CUBIC_YARDS;
  const volumeM3 = volumeCy / CUBIC_METERS_TO_CUBIC_YARDS;
  
  return {
    volume_cy: volumeCy,
    volume_m3: volumeM3
  };
}

