// ============================================================================
// VALIDAÇÕES PARA FERRAMENTAS DE MEDIÇÃO
// ============================================================================

import Joi from 'joi';

// Schema para Point
const pointSchema = Joi.object({
  x: Joi.number().required(),
  y: Joi.number().required(),
  page: Joi.number().integer().min(1).required(),
  elevation: Joi.number().optional()
});

// Schema para escala (formato "1:100")
const scaleSchema = Joi.string().pattern(/^\d+:\d+$/).required()
  .messages({
    'string.pattern.base': 'Escala deve estar no formato "1:100"'
  });

// Schema para unidades
const unitSchema = Joi.string().valid('meters', 'feet', 'inches', 'kilometers', 'miles');
const areaUnitSchema = Joi.string().valid('square_meters', 'square_feet', 'hectares', 'acres');
const volumeUnitSchema = Joi.string().valid('cubic_meters', 'cubic_feet', 'liters', 'gallons');

// Schemas específicos para cada tipo de medição
export const measurementSchemas = {
  // DISTÂNCIA
  distance: Joi.object({
    type: Joi.string().valid('distance').required(),
    points: Joi.array().length(2).items(pointSchema).required(),
    scale: scaleSchema,
    unit: unitSchema.default('meters'),
    label: Joi.string().max(255).required()
  }),

  // POLILINHA
  polyline: Joi.object({
    type: Joi.string().valid('polyline').required(),
    points: Joi.array().min(2).items(pointSchema).required(),
    scale: scaleSchema,
    unit: unitSchema.default('meters'),
    label: Joi.string().max(255).required()
  }),

  // ÁREA
  area: Joi.object({
    type: Joi.string().valid('area').required(),
    points: Joi.array().min(3).items(pointSchema).required()
      .custom((value: any, helpers: Joi.CustomHelpers) => {
        // Validar que está fechado (último = primeiro)
        const first = value[0];
        const last = value[value.length - 1];
        if (Math.abs(first.x - last.x) > 0.001 || Math.abs(first.y - last.y) > 0.001) {
          return helpers.error('any.custom', { message: 'Polígono deve estar fechado (último ponto = primeiro)' });
        }
        return value;
      }),
    scale: scaleSchema,
    unit: areaUnitSchema.default('square_meters'),
    label: Joi.string().max(255).required()
  }),

  // CONTAGEM
  count: Joi.object({
    type: Joi.string().valid('count').required(),
    items: Joi.array().min(1).items(
      Joi.object({
        x: Joi.number().required(),
        y: Joi.number().required(),
        page: Joi.number().integer().min(1).required(),
        category: Joi.string().max(100).optional()
      })
    ).required(),
    label: Joi.string().max(255).required()
  }),

  // PERFIL
  profile: Joi.object({
    type: Joi.string().valid('profile').required(),
    line: Joi.array().length(2).items(pointSchema).required(),
    elevations: Joi.array().items(
      Joi.object({
        distance: Joi.number().min(0).required(),
        elevation: Joi.number().required()
      })
    ).optional(),
    scale: scaleSchema,
    unit: unitSchema.default('meters'),
    label: Joi.string().max(255).required()
  }),

  // VOLUME POR PROFUNDIDADE
  volume_by_depth: Joi.object({
    type: Joi.string().valid('volume_by_depth').required(),
    areaId: Joi.string().uuid().optional(),
    area: Joi.number().min(0).when('areaId', {
      is: Joi.exist(),
      then: Joi.optional(),
      otherwise: Joi.required()
    }),
    depth: Joi.number().min(0).required(),
    length: Joi.number().min(0).optional(),
    width: Joi.number().min(0).optional(),
    scale: scaleSchema,
    unit: volumeUnitSchema.default('cubic_meters'),
    label: Joi.string().max(255).required()
  }),

  // SLOPE
  slope: Joi.object({
    type: Joi.string().valid('slope').required(),
    points: Joi.array().length(2).items(
      pointSchema.keys({
        elevation: Joi.number().required()
      })
    ).required(),
    scale: scaleSchema,
    unit: unitSchema.default('meters'),
    label: Joi.string().max(255).required()
  }),

  // OFFSET
  offset: Joi.object({
    type: Joi.string().valid('offset').required(),
    baseLine: Joi.array().min(2).items(pointSchema).required(),
    offsetDistance: Joi.number().min(0).required(),
    side: Joi.string().valid('left', 'right', 'both').default('both'),
    calculateArea: Joi.boolean().default(false),
    scale: scaleSchema,
    unit: areaUnitSchema.default('square_meters'),
    label: Joi.string().max(255).required()
  })
};

// Schema para criar medição
export const createMeasurementSchema = Joi.object({
  projectId: Joi.string().uuid().required(),
  pdfId: Joi.string().required(),
  type: Joi.string().valid(
    'distance', 'polyline', 'area', 'count', 
    'profile', 'volume_by_depth', 'slope', 'offset'
  ).required(),
  data: Joi.alternatives().conditional('type', {
    switch: [
      { is: 'distance', then: measurementSchemas.distance },
      { is: 'polyline', then: measurementSchemas.polyline },
      { is: 'area', then: measurementSchemas.area },
      { is: 'count', then: measurementSchemas.count },
      { is: 'profile', then: measurementSchemas.profile },
      { is: 'volume_by_depth', then: measurementSchemas.volume_by_depth },
      { is: 'slope', then: measurementSchemas.slope },
      { is: 'offset', then: measurementSchemas.offset }
    ]
  }),
  scale: scaleSchema,
  label: Joi.string().max(255).required()
});

// Schema para atualizar medição
export const updateMeasurementSchema = Joi.object({
  data: Joi.object().optional(),
  label: Joi.string().max(255).optional(),
  scale: scaleSchema.optional()
});

// Schema para cálculos
export const calculateDistanceSchema = Joi.object({
  point1: pointSchema.required(),
  point2: pointSchema.required(),
  scale: scaleSchema,
  unit: unitSchema.default('meters')
});

export const calculateAreaSchema = Joi.object({
  points: Joi.array().min(3).items(pointSchema).required(),
  scale: scaleSchema,
  unit: areaUnitSchema.default('square_meters')
});

export const calculateVolumeSchema = Joi.object({
  area: Joi.number().min(0).required(),
  depth: Joi.number().min(0).required(),
  unit: volumeUnitSchema.default('cubic_meters')
});

export const calculateSlopeSchema = Joi.object({
  point1: pointSchema.keys({ elevation: Joi.number().required() }).required(),
  point2: pointSchema.keys({ elevation: Joi.number().required() }).required(),
  scale: scaleSchema,
  unit: unitSchema.default('meters')
});

