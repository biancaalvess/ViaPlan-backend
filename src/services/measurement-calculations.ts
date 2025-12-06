// ============================================================================
// SERVIÇO DE CÁLCULOS MATEMÁTICOS PARA FERRAMENTAS DE MEDIÇÃO
// ============================================================================

import { Coordinate, Unit, AreaUnit, VolumeUnit } from '../types/measurement';

// Tipo legado para compatibilidade (Point com page e elevation)
interface Point {
  x: number;
  y: number;
  page: number;
  elevation?: number;
}

// Constantes de conversão de unidades (padrão brasileiro - apenas unidades básicas)
// Como usamos apenas uma unidade de cada tipo, as conversões são sempre 1
const UNIT_CONVERSIONS: Record<Unit, number> = {
  meters: 1
};

const AREA_UNIT_CONVERSIONS: Record<AreaUnit, number> = {
  square_meters: 1
};

const VOLUME_UNIT_CONVERSIONS: Record<VolumeUnit, number> = {
  cubic_meters: 1
};

// Tolerância numérica
const EPSILON = 1e-6;

/**
 * Parse escala do formato "1:100" para fator numérico
 */
export function parseScale(scale: string): number {
  const match = scale.match(/^(\d+):(\d+)$/);
  if (!match) {
    throw new Error(`Formato de escala inválido: ${scale}. Use formato "1:100"`);
  }
  const [, numerator, denominator] = match;
  return parseFloat(denominator) / parseFloat(numerator);
}

/**
 * Converter coordenadas do canvas para coordenadas reais usando escala
 * IMPORTANTE: Se as coordenadas já estão em pixels do canvas (incluindo zoom),
 * o zoom deve ser compensado. O frontend deve enviar coordenadas normalizadas
 * (divididas pelo zoom) ou enviar zoom como parâmetro adicional.
 * 
 * @param distance Distância em pixels do canvas (já com zoom aplicado se o frontend não normalizar)
 * @param scale Escala no formato "1:100"
 * @param zoom Zoom aplicado (1.0 = sem zoom, 2.0 = 2x zoom). Se fornecido, compensa o zoom.
 */
function canvasToReal(distance: number, scale: string, zoom?: number): number {
  const scaleFactor = parseScale(scale);
  
  // Se zoom for fornecido, normalizar a distância antes de aplicar a escala
  // Isso garante que as medidas reais permaneçam corretas independente do zoom
  const normalizedDistance = zoom && zoom !== 1.0 ? distance / zoom : distance;
  
  return normalizedDistance * scaleFactor;
}

/**
 * Converter unidades
 */
function convertUnit(value: number, fromUnit: Unit | AreaUnit | VolumeUnit, toUnit: Unit | AreaUnit | VolumeUnit): number {
  if (fromUnit === toUnit) return value;
  
  // Converter para metros (unidade base)
  let inMeters = value;
  if (UNIT_CONVERSIONS[fromUnit as Unit]) {
    inMeters = value * UNIT_CONVERSIONS[fromUnit as Unit];
  } else if (AREA_UNIT_CONVERSIONS[fromUnit as AreaUnit]) {
    inMeters = value * AREA_UNIT_CONVERSIONS[fromUnit as AreaUnit];
  } else if (VOLUME_UNIT_CONVERSIONS[fromUnit as VolumeUnit]) {
    inMeters = value * VOLUME_UNIT_CONVERSIONS[fromUnit as VolumeUnit];
  }
  
  // Converter de metros para unidade destino
  if (UNIT_CONVERSIONS[toUnit as Unit]) {
    return inMeters / UNIT_CONVERSIONS[toUnit as Unit];
  } else if (AREA_UNIT_CONVERSIONS[toUnit as AreaUnit]) {
    return inMeters / AREA_UNIT_CONVERSIONS[toUnit as AreaUnit];
  } else if (VOLUME_UNIT_CONVERSIONS[toUnit as VolumeUnit]) {
    return inMeters / VOLUME_UNIT_CONVERSIONS[toUnit as VolumeUnit];
  }
  
  return value;
}

/**
 * 1. DISTÂNCIA (Régua) - Distância euclidiana entre dois pontos
 * 
 * IMPORTANTE: Se as coordenadas incluem zoom, passe o parâmetro zoom para compensar.
 * O backend compensará automaticamente, garantindo medidas corretas independente do zoom.
 * 
 * @param point1 Primeiro ponto
 * @param point2 Segundo ponto
 * @param scale Escala no formato "1:100"
 * @param unit Unidade de retorno (padrão: 'meters')
 * @param zoom Zoom aplicado (opcional, para compensar coordenadas com zoom)
 */
export function calculateDistance(
  point1: Coordinate | Point,
  point2: Coordinate | Point,
  scale: string,
  unit: Unit = 'meters',
  zoom?: number
): number {
  // Verificar se estão na mesma página (apenas se ambos tiverem page - para PDFs)
  // Para imagens (PNG, JPG), não há página, então não valida
  if ('page' in point1 && 'page' in point2 && point1.page !== point2.page) {
    throw new Error('Pontos devem estar na mesma página');
  }
  
  // Calcular distância no canvas (pixels)
  const dx = point2.x - point1.x;
  const dy = point2.y - point1.y;
  const canvasDistance = Math.sqrt(dx * dx + dy * dy);
  
  // Se houver elevações, calcular distância 3D
  const z1 = ('elevation' in point1 ? point1.elevation : ('z' in point1 ? point1.z : undefined)) || 0;
  const z2 = ('elevation' in point2 ? point2.elevation : ('z' in point2 ? point2.z : undefined)) || 0;
  
  if (z1 !== 0 || z2 !== 0) {
    const dz = z2 - z1;
    const canvasDistance3D = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const realDistance = canvasToReal(canvasDistance3D, scale, zoom);
    return convertUnit(realDistance, 'meters', unit);
  }
  
  // Distância 2D
  const realDistance = canvasToReal(canvasDistance, scale, zoom);
  return convertUnit(realDistance, 'meters', unit);
}

/**
 * 2. POLILINHA - Soma das distâncias dos segmentos
 * 
 * @param zoom Zoom aplicado (opcional, para compensar coordenadas com zoom)
 */
export function calculatePolylineDistance(
  points: (Coordinate | Point)[],
  scale: string,
  unit: Unit = 'meters',
  zoom?: number
): { totalDistance: number; segmentDistances: number[] } {
  if (points.length < 2) {
    throw new Error('Polilinha deve ter pelo menos 2 pontos');
  }
  
  const segmentDistances: number[] = [];
  let totalDistance = 0;
  
  for (let i = 0; i < points.length - 1; i++) {
    const segmentDist = calculateDistance(points[i], points[i + 1], scale, unit, zoom);
    segmentDistances.push(segmentDist);
    totalDistance += segmentDist;
  }
  
  return { totalDistance, segmentDistances };
}

/**
 * 3. ÁREA - Fórmula do Shoelace (Algoritmo do Laço)
 * 
 * @param zoom Zoom aplicado (opcional, para compensar coordenadas com zoom)
 */
export function calculateArea(
  points: (Coordinate | Point)[],
  scale: string,
  unit: AreaUnit = 'square_meters',
  zoom?: number
): { area: number; perimeter: number } {
  if (points.length < 3) {
    throw new Error('Polígono deve ter pelo menos 3 pontos');
  }
  
  // Verificar se está fechado (último ponto = primeiro)
  const isClosed = 
    Math.abs(points[0].x - points[points.length - 1].x) < EPSILON &&
    Math.abs(points[0].y - points[points.length - 1].y) < EPSILON;
  
  if (!isClosed) {
    throw new Error('Polígono deve estar fechado (último ponto deve ser igual ao primeiro)');
  }
  
  // Verificar se todos os pontos estão na mesma página (apenas se tiverem page - para PDFs)
  // Para imagens (PNG, JPG), não há página, então não valida
  const firstPoint = points[0] as any;
  if ('page' in firstPoint && firstPoint.page !== undefined) {
    const page = firstPoint.page;
    if (!points.every((p: any) => 'page' in p && p.page === page)) {
      throw new Error('Todos os pontos do polígono devem estar na mesma página');
    }
  }
  
  // Fórmula do Shoelace
  let sum1 = 0;
  let sum2 = 0;
  
  for (let i = 0; i < points.length - 1; i++) {
    sum1 += points[i].x * points[i + 1].y;
    sum2 += points[i + 1].x * points[i].y;
  }
  
  // Área no canvas (pixels²)
  const canvasArea = Math.abs(sum1 - sum2) / 2;
  
  // Converter para área real usando escala² (porque é área)
  // IMPORTANTE: Se há zoom, normalizar a área também
  const scaleFactor = parseScale(scale);
  const zoomFactor = zoom && zoom !== 1.0 ? 1 / (zoom * zoom) : 1; // Área é quadrática
  const normalizedCanvasArea = canvasArea * zoomFactor;
  const realArea = normalizedCanvasArea * (scaleFactor * scaleFactor);
  
  // Calcular perímetro
  let perimeter = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const dx = points[i + 1].x - points[i].x;
    const dy = points[i + 1].y - points[i].y;
    const segmentLength = Math.sqrt(dx * dx + dy * dy);
    const realLength = canvasToReal(segmentLength, scale, zoom);
    perimeter += realLength;
  }
  
  return {
    area: convertUnit(realArea, 'square_meters', unit),
    perimeter: convertUnit(perimeter, 'meters', 'meters') // Perímetro sempre em metros
  };
}

/**
 * 4. CONTAGEM - Contar itens e agrupar por categoria
 */
export function calculateCount(
  items: Array<{ x: number; y: number; page: number; category?: string }>
): { totalCount: number; countByCategory: Record<string, number> } {
  const totalCount = items.length;
  const countByCategory: Record<string, number> = {};
  
  items.forEach(item => {
    const category = item.category || 'Sem categoria';
    countByCategory[category] = (countByCategory[category] || 0) + 1;
  });
  
  return { totalCount, countByCategory };
}

/**
 * 5. PERFIL - Gerar perfil de elevações ao longo de uma linha
 */
export function calculateProfile(
  line: [Coordinate | Point, Coordinate | Point],
  elevations: Array<{ distance: number; elevation: number }>,
  scale: string,
  unit: Unit = 'meters'
): { elevations: Array<{ distance: number; elevation: number }>; totalLength: number } {
  // Calcular comprimento total da linha
  const totalLength = calculateDistance(line[0], line[1], scale, unit);
  
  // Validar que as elevações estão ordenadas por distância
  const sortedElevations = [...elevations].sort((a, b) => a.distance - b.distance);
  
  // Validar que a última distância não excede o comprimento total
  if (sortedElevations.length > 0) {
    const maxDistance = sortedElevations[sortedElevations.length - 1].distance;
    if (maxDistance > totalLength + EPSILON) {
      throw new Error(`Distância máxima (${maxDistance}) excede comprimento da linha (${totalLength})`);
    }
  }
  
  return {
    elevations: sortedElevations,
    totalLength
  };
}

/**
 * 6. VOLUME POR PROFUNDIDADE
 */
export function calculateVolumeByDepth(
  area: number,
  depth: number,
  unit: VolumeUnit = 'cubic_meters'
): number {
  if (depth < 0) {
    throw new Error('Profundidade deve ser positiva');
  }
  
  if (area < 0) {
    throw new Error('Área deve ser positiva');
  }
  
  // Volume em m³
  const volumeM3 = area * depth;
  
  return convertUnit(volumeM3, 'cubic_meters', unit);
}

/**
 * Volume ao longo de um eixo (trincheira) com largura constante
 */
export function calculateVolumeByAxis(
  length: number,
  width: number,
  depth: number,
  unit: VolumeUnit = 'cubic_meters'
): number {
  if (length < 0 || width < 0 || depth < 0) {
    throw new Error('Comprimento, largura e profundidade devem ser positivos');
  }
  
  const volumeM3 = length * width * depth;
  return convertUnit(volumeM3, 'cubic_meters', unit);
}

/**
 * 7. SLOPE / DECLIVIDADE
 */
export function calculateSlope(
  point1: Coordinate | Point,
  point2: Coordinate | Point,
  scale: string,
  unit: Unit = 'meters'
): {
  distance: number;
  elevationDifference: number;
  slopePercent: number;
  slopeAngle: number;
} {
  // Obter elevações
  const z1 = ('elevation' in point1 ? point1.elevation : ('z' in point1 ? point1.z : undefined));
  const z2 = ('elevation' in point2 ? point2.elevation : ('z' in point2 ? point2.z : undefined));
  
  if (z1 === undefined || z2 === undefined) {
    throw new Error('Ambos os pontos devem ter elevação para calcular declividade');
  }
  
  // Distância horizontal
  const distance = calculateDistance(point1, point2, scale, unit);
  
  if (Math.abs(distance) < EPSILON) {
    throw new Error('Pontos muito próximos para calcular declividade');
  }
  
  // Diferença de elevação
  const elevationDifference = z2 - z1;
  
  // Declividade decimal
  const slopeDecimal = elevationDifference / distance;
  
  // Declividade percentual
  const slopePercent = slopeDecimal * 100;
  
  // Ângulo em graus
  const slopeAngle = Math.atan(slopeDecimal) * (180 / Math.PI);
  
  return {
    distance,
    elevationDifference,
    slopePercent,
    slopeAngle
  };
}

/**
 * 8. OFFSET / PARALELO - Gerar linhas paralelas
 */
export function calculateOffset(
  baseLine: (Coordinate | Point)[],
  offsetDistance: number,
  scale: string,
  side: 'left' | 'right' | 'both' = 'both'
): {
  left?: (Coordinate | Point)[];
  right?: (Coordinate | Point)[];
} {
  if (baseLine.length < 2) {
    throw new Error('Linha base deve ter pelo menos 2 pontos');
  }
  
  if (offsetDistance < 0) {
    throw new Error('Distância de offset deve ser positiva');
  }
  
  // Converter offset para pixels do canvas
  const scaleFactor = parseScale(scale);
  const canvasOffset = offsetDistance / scaleFactor;
  
  const leftPoints: (Coordinate | Point)[] = [];
  const rightPoints: (Coordinate | Point)[] = [];
  
  // Processar cada segmento
  for (let i = 0; i < baseLine.length - 1; i++) {
    const p1 = baseLine[i] as any;
    const p2 = baseLine[i + 1] as any;
    
    // Vetor do segmento
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    
    if (length < EPSILON) {
      // Segmento muito curto, apenas copiar pontos
      if (side === 'left' || side === 'both') {
        leftPoints.push({ ...p1 });
        leftPoints.push({ ...p2 });
      }
      if (side === 'right' || side === 'both') {
        rightPoints.push({ ...p1 });
        rightPoints.push({ ...p2 });
      }
      continue;
    }
    
    // Vetor normal unitário (perpendicular à direita)
    const nx = -dy / length;
    const ny = dx / length;
    
    // Calcular pontos deslocados
    const p1Page = ('page' in p1 ? p1.page : undefined);
    const p2Page = ('page' in p2 ? p2.page : undefined);
    
    if (side === 'left' || side === 'both') {
      const leftP1: Coordinate | Point = p1Page !== undefined 
        ? { x: p1.x + canvasOffset * nx, y: p1.y + canvasOffset * ny, page: p1Page }
        : { x: p1.x + canvasOffset * nx, y: p1.y + canvasOffset * ny };
      leftPoints.push(leftP1);
      if (i === baseLine.length - 2) {
        const leftP2: Coordinate | Point = p2Page !== undefined
          ? { x: p2.x + canvasOffset * nx, y: p2.y + canvasOffset * ny, page: p2Page }
          : { x: p2.x + canvasOffset * nx, y: p2.y + canvasOffset * ny };
        leftPoints.push(leftP2);
      }
    }
    
    if (side === 'right' || side === 'both') {
      const rightP1: Coordinate | Point = p1Page !== undefined
        ? { x: p1.x - canvasOffset * nx, y: p1.y - canvasOffset * ny, page: p1Page }
        : { x: p1.x - canvasOffset * nx, y: p1.y - canvasOffset * ny };
      rightPoints.push(rightP1);
      if (i === baseLine.length - 2) {
        const rightP2: Coordinate | Point = p2Page !== undefined
          ? { x: p2.x - canvasOffset * nx, y: p2.y - canvasOffset * ny, page: p2Page }
          : { x: p2.x - canvasOffset * nx, y: p2.y - canvasOffset * ny };
        rightPoints.push(rightP2);
      }
    }
  }
  
  // Ajustar junções (miter) - simplificado
  // Em produção, implementar interseção de retas para junções perfeitas
  
  const result: { left?: (Coordinate | Point)[]; right?: (Coordinate | Point)[] } = {};
  if (side === 'left' || side === 'both') {
    result.left = leftPoints;
  }
  if (side === 'right' || side === 'both') {
    result.right = rightPoints;
  }
  
  return result;
}

/**
 * Calcular área entre linhas paralelas (se aplicável)
 */
export function calculateOffsetArea(
  baseLine: (Coordinate | Point)[],
  offsetDistance: number,
  scale: string,
  unit: AreaUnit = 'square_meters'
): number {
  // Se a linha base é fechada (polígono), calcular área do polígono offset
  const isClosed = 
    Math.abs(baseLine[0].x - baseLine[baseLine.length - 1].x) < EPSILON &&
    Math.abs(baseLine[0].y - baseLine[baseLine.length - 1].y) < EPSILON;
  
  if (!isClosed) {
    // Para linhas abertas, área = comprimento × offset × 2 (ambos os lados)
    const { totalDistance } = calculatePolylineDistance(baseLine, scale, 'meters');
    return convertUnit(totalDistance * offsetDistance * 2, 'square_meters', unit);
  }
  
  // Para polígonos fechados, calcular área do polígono offset
  const offsetLines = calculateOffset(baseLine, offsetDistance, scale, 'both');
  
  if (offsetLines.left && offsetLines.left.length >= 3) {
    const { area } = calculateArea(offsetLines.left, scale, unit);
    return area;
  }
  
  return 0;
}

