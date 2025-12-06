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
// CONSTANTES E CONVERSÕES (Padrão Brasileiro - Sistema Métrico)
// ============================================================================

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
  const length = calculatePolylineLength(coordinates);
  return isFinite(length) && length >= 0 ? length : 0;
}

/**
 * Calcular volume de escavação da trincheira usando método padronizado
 * Calcula volume de trincheiras com profundidade variável por segmento
 * Volume de prisma trapezoidal (média das profundidades)
 */
export function calculateTrenchVolume(
  coordinates: Coordinate[],
  width: { type: 'constant' | 'variable'; value?: number; values?: number[] },
  depth: { type: 'constant' | 'variable'; value?: number; values?: number[] }
): number {
  // Se ambos são constantes, usar método simples
  if (width.type === 'constant' && depth.type === 'constant') {
    const length = calculateTrenchLength(coordinates);
    const w = width.value || 0;
    const d = depth.value || 0;
    if (length === 0 || !isFinite(length) || !isFinite(w) || !isFinite(d) || w <= 0 || d <= 0) {
      return 0;
    }
    const volume = length * w * d;
    return isFinite(volume) ? volume : 0;
  }
  
  // Se um ou ambos são variáveis, calcular por segmento usando método padronizado
  const segmentCount = coordinates.length - 1;
  const segments: Array<{
    length: number;
    width: number;
    startDepth: number;
    endDepth: number;
  }> = [];
  
  for (let i = 0; i < segmentCount; i++) {
    const segmentLength = distance2D(coordinates[i], coordinates[i + 1]);
    if (!isFinite(segmentLength) || segmentLength <= 0) continue;
    
    const segmentWidth = width.type === 'variable' 
      ? (width.values?.[i] || 0)
      : (width.value || 0);
    
    // Profundidades nos pontos inicial e final do segmento
    const startDepth = depth.type === 'variable'
      ? (depth.values?.[i] || depth.value || 0)
      : (depth.value || 0);
    const endDepth = depth.type === 'variable'
      ? (depth.values?.[i + 1] || depth.value || 0)
      : (depth.value || 0);
    
    if (!isFinite(segmentWidth) || !isFinite(startDepth) || !isFinite(endDepth) || 
        segmentWidth <= 0 || startDepth <= 0 || endDepth <= 0) {
      continue;
    }
    
    segments.push({
      length: segmentLength,
      width: segmentWidth,
      startDepth,
      endDepth
    });
  }
  
  // Usar função padronizada para cálculo de volume por segmentos
  return calculateTrenchVolumeBySegments(segments);
}

/**
 * Calcular volume de trincheira a partir de segmentos (padronizado)
 * Movimento de Terra (Trincheiras)
 * Volume de prisma trapezoidal (média das profundidades)
 * 
 * @param segments Array de segmentos com comprimento, largura e profundidades inicial/final
 * @returns Volume total em m³
 */
export function calculateTrenchVolumeBySegments(
  segments: Array<{
    length: number;
    width: number;
    startDepth: number;
    endDepth: number;
  }>
): number {
  let totalVolume = 0;
  
  segments.forEach(seg => {
    // Volume de prisma trapezoidal (média das profundidades)
    const avgDepth = (seg.startDepth + seg.endDepth) / 2;
    const volume = seg.length * seg.width * avgDepth;
    totalVolume += volume;
  });
  
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

/**
 * Cálculo de Bota-fora (Volume a remover)
 * Volume Escavado - Volume Ocupado (pelo tubo + cama de areia)
 * 
 * @param excavationVol Volume de escavação em m³
 * @param pipeOuterDiameter Diâmetro externo do tubo em metros
 * @param pipeLength Comprimento do tubo em metros
 * @returns Volume de bota-fora em m³
 */
export function calculateSpoilVolume(
  excavationVol: number,
  pipeOuterDiameter: number,
  pipeLength: number
): number {
  const pipeVolume = Math.PI * Math.pow(pipeOuterDiameter / 2, 2) * pipeLength;
  // Assumindo fator de empolamento (expansion factor) do solo removido, ex: 1.2 ou 1.3
  const expansionFactor = 1.0; // Ajustar conforme o solo
  
  // O volume de "bota-fora" é o que sobra da terra escavada que não volta pra vala
  // Se for remover TUDO: excavationVol * expansionFactor
  // Se for reaterrar: (excavationVol - pipeVolume) * expansionFactor
  
  return (excavationVol - pipeVolume) * expansionFactor;
}

// ============================================================================
// 3. PERFURAÇÃO DIRECIONAL (HDD)
// ============================================================================

/**
 * Calcular raio de curvatura entre três pontos (padronizado)
 * Calcula o raio de curvatura aproximado entre 3 pontos consecutivos (A, B, C)
 * Usando a mudança angular entre os vetores AB e BC.
 * 
 * Fórmula padronizada: R = Arco / Ângulo
 * onde Arco é aproximado pela média das cordas
 */
function calculateCurvatureRadius(
  p1: Coordinate,
  p2: Coordinate,
  p3: Coordinate
): number {
  return calculateHDDBendRadius(p1, p2, p3);
}

/**
 * Calcula o raio de curvatura aproximado entre 3 pontos consecutivos (A, B, C)
 * para perfuração direcional (HDD) - Validação de Raio
 * Usando a mudança angular entre os vetores AB e BC.
 * 
 * @param p1 Primeiro ponto (A)
 * @param p2 Segundo ponto (B) - ponto central
 * @param p3 Terceiro ponto (C)
 * @returns Raio de curvatura em metros (ou Infinity se reto)
 */
export function calculateHDDBendRadius(
  p1: Coordinate,
  p2: Coordinate,
  p3: Coordinate
): number {
  // Vetor U = p2 - p1
  const u = { 
    x: p2.x - p1.x, 
    y: p2.y - p1.y, 
    z: (p2.z || 0) - (p1.z || 0) 
  };
  // Vetor V = p3 - p2
  const v = { 
    x: p3.x - p2.x, 
    y: p3.y - p2.y, 
    z: (p3.z || 0) - (p2.z || 0) 
  };
  
  const magU = Math.sqrt(u.x**2 + u.y**2 + u.z**2);
  const magV = Math.sqrt(v.x**2 + v.y**2 + v.z**2);
  
  // Se os segmentos são muito curtos, considerar raio infinito
  if (magU < EPSILON || magV < EPSILON) {
    return Infinity;
  }
  
  // Produto escalar
  const dot = u.x * v.x + u.y * v.y + u.z * v.z;
  
  // Ângulo de deflexão (em radianos)
  // cos(theta) = (u . v) / (|u| |v|)
  // Cuidado com precisão float podendo dar > 1 ou < -1
  let cosTheta = dot / (magU * magV);
  cosTheta = Math.min(1, Math.max(-1, cosTheta)); // Clamp
  
  const deflectionAngleRad = Math.acos(cosTheta);
  
  // Se o ângulo é 0, raio é infinito
  if (deflectionAngleRad < 1e-6) return Infinity;
  
  // Comprimento do arco (aproximado pela média das cordas ou soma)
  const avgSegmentLength = (magU + magV) / 2;
  
  // R = Arco / Ângulo
  return avgSegmentLength / deflectionAngleRad;
}

/**
 * Validar raio de curvatura mínimo
 */
export function validateBoreShotRadius(
  coordinates: Coordinate[],
  minRadiusRequiredM: number
): RadiusCheck {
  const violations: RadiusCheck['violations'] = [];
  let minRadiusActualM = Infinity;
  
  if (coordinates.length < 3) {
    return {
      passed: true,
      min_radius_required_m: minRadiusRequiredM,
      min_radius_actual_m: Infinity,
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
    
    // Coordenadas já estão em metros
    if (radius < minRadiusActualM) {
      minRadiusActualM = radius;
    }
    
    if (radius < minRadiusRequiredM) {
      violations.push({
        segment_index: i,
        actual_radius_m: radius,
        required_radius_m: minRadiusRequiredM
      });
    }
  }
  
  return {
    passed: violations.length === 0,
    min_radius_required_m: minRadiusRequiredM,
    min_radius_actual_m: minRadiusActualM === Infinity ? 0 : minRadiusActualM,
    violations
  };
}

/**
 * Validar profundidade mínima
 */
export function validateBoreShotDepth(
  coordinates: Coordinate[],
  minDepthRequiredM: number
): DepthCheck {
  const violations: DepthCheck['violations'] = [];
  let minDepthActualM = Infinity;
  
  for (let i = 0; i < coordinates.length; i++) {
    const depth = coordinates[i].z || 0;
    
    if (depth < minDepthActualM) {
      minDepthActualM = depth;
    }
    
    if (depth < minDepthRequiredM) {
      violations.push({
        point_index: i,
        actual_depth_m: depth,
        required_depth_m: minDepthRequiredM
      });
    }
  }
  
  return {
    passed: violations.length === 0,
    min_depth_required_m: minDepthRequiredM,
    min_depth_actual_m: minDepthActualM === Infinity ? 0 : minDepthActualM,
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
  section: { shape: 'circular' | 'rectangular'; diameter_m?: number; width_m?: number; length_m?: number },
  depth_m: number,
  efficiency_ratio?: number
): number {
  let volumeCubicMeters = 0;
  
  if (subtype === 'trench') {
    const lengthM = calculatePolylineLength(coordinates);
    
    if (section.shape === 'circular') {
      const radiusM = (section.diameter_m || 0) / 2;
      volumeCubicMeters = Math.PI * radiusM * radiusM * lengthM;
    } else {
      volumeCubicMeters = (section.width_m || 0) * (section.length_m || 0) * lengthM;
    }
  } else if (subtype === 'hole') {
    if (section.shape === 'circular') {
      const radiusM = (section.diameter_m || 0) / 2;
      volumeCubicMeters = Math.PI * radiusM * radiusM * depth_m;
    } else {
      volumeCubicMeters = (section.width_m || 0) * (section.length_m || 0) * depth_m;
    }
  } else if (subtype === 'potholing') {
    // Múltiplos pontos com profundidade média
    const avgDepth = depth_m;
    const pointCount = coordinates.length;
    
    if (section.shape === 'circular') {
      const radiusM = (section.diameter_m || 0) / 2;
      const volumePerHole = Math.PI * radiusM * radiusM * avgDepth;
      volumeCubicMeters = volumePerHole * pointCount;
    } else {
      const volumePerHole = (section.width_m || 0) * (section.length_m || 0) * avgDepth;
      volumeCubicMeters = volumePerHole * pointCount;
    }
  }
  
  // Aplicar eficiência se fornecida
  if (efficiency_ratio !== undefined) {
    volumeCubicMeters = volumeCubicMeters * efficiency_ratio;
  }
  
  // Retornar em metros cúbicos
  return volumeCubicMeters;
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
  nominalDiameterMm: number,
  lengthM: number
): number {
  // Converter milímetros para metros
  const radiusM = (nominalDiameterMm / 2) / 1000;
  const volumeCubicMeters = Math.PI * radiusM * radiusM * lengthM;
  // Retornar em metros cúbicos
  return volumeCubicMeters;
}

/**
 * Estimar peso do conduto (aproximado)
 */
export function estimateConduitWeight(
  material: string,
  outerDiameterMm: number,
  wallThicknessMm: number,
  lengthM: number
): number {
  // Densidades aproximadas (kg/m³)
  const densities: Record<string, number> = {
    'PVC': 1440,
    'HDPE': 950,
    'Steel': 7850,
    'Aluminum': 2700,
    'Fiber Optic': 1600,
    'Copper': 8960
  };
  
  const density = densities[material] || 1600;
  
  // Volume do material (cilindro externo - cilindro interno) em metros
  const outerRadiusM = (outerDiameterMm / 2) / 1000;
  const innerRadiusM = ((outerDiameterMm - 2 * wallThicknessMm) / 2) / 1000;
  const volumeCubicMeters = Math.PI * (outerRadiusM * outerRadiusM - innerRadiusM * innerRadiusM) * lengthM;
  
  return volumeCubicMeters * density;
}

// ============================================================================
// 6. CÂMARA / BURACO DE MÃO
// ============================================================================

/**
 * Calcular volume de escavação da câmara
 */
export function calculateVaultExcavationVolume(
  shape: 'rectangular' | 'circular',
  dimensions: { length_m?: number; width_m?: number; diameter_m?: number; depth_m: number }
): number {
  let volumeCubicMeters = 0;
  
  if (shape === 'circular') {
    const radiusM = (dimensions.diameter_m || 0) / 2;
    volumeCubicMeters = Math.PI * radiusM * radiusM * dimensions.depth_m;
  } else {
    volumeCubicMeters = (dimensions.length_m || 0) * (dimensions.width_m || 0) * dimensions.depth_m;
  }
  
  return volumeCubicMeters;
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
  areaM2: number,
  depthM: number
): { volume_m3: number } {
  const volumeM3 = areaM2 * depthM;
  
  return {
    volume_m3: volumeM3
  };
}

