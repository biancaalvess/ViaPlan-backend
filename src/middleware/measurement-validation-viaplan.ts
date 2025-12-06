// ============================================================================
// VALIDAÇÕES PARA FERRAMENTAS DE MEDIÇÃO VIAPLAN
// ============================================================================

import Joi from 'joi';

// Schema para Point (flexível: aceita com ou sem page para suportar PDF e PNG/canvas)
const pointSchema = Joi.object({
  x: Joi.number().required(),
  y: Joi.number().required(),
  page: Joi.number().integer().min(1).optional(), // Opcional para PNG/canvas
  z: Joi.number().optional(), // Para coordenadas 3D
  elevation: Joi.number().optional()
});

// Schema para escala (formato "1:100") - pode ser opcional
const scaleSchema = Joi.string().pattern(/^\d+:\d+$/)
  .messages({
    'string.pattern.base': 'Escala deve estar no formato "1:100"'
  })
  .optional();

// Schema para zoom (opcional)
const zoomSchema = Joi.number().min(0.1).max(10).optional();

// Schema para WidthDepth
const widthDepthSchema = Joi.object({
  type: Joi.string().valid('constant', 'variable').required(),
  value: Joi.number().min(0).optional(),
  values: Joi.array().items(Joi.number().min(0)).optional(),
  unit: Joi.string().valid('m').default('m')
});

// Schemas específicos para tipos ViaPlan
export const viaplanMeasurementSchemas = {
  // SELECT
  select: Joi.object({
    type: Joi.string().valid('select').required(),
    project_id: Joi.string().required(),
    label: Joi.string().max(255).optional(),
    selected_measurements: Joi.array().items(Joi.string()).default([]),
    filters: Joi.object({
      type: Joi.string().optional(),
      date_range: Joi.object({
        start: Joi.string().isoDate().optional(),
        end: Joi.string().isoDate().optional()
      }).optional()
    }).optional(),
    // Select NÃO deve ter coordinates
    coordinates: Joi.forbidden()
  }),

  // TRINCHERA
  trench: Joi.object({
    type: Joi.string().valid('trench').required(),
    project_id: Joi.string().required(),
    label: Joi.string().max(255).optional(),
    coordinates: Joi.array().min(2).items(pointSchema).required(),
    width: widthDepthSchema.optional(),
    depth: widthDepthSchema.optional(),
    soil_type: Joi.string().valid('argila', 'areia', 'rocha', 'misturado').optional(),
    scale: scaleSchema,
    zoom: zoomSchema
  }),

  // PERFURAÇÃO DIRECIONAL (HDD)
  'bore-shot': Joi.object({
    type: Joi.string().valid('bore-shot').required(),
    project_id: Joi.string().required(),
    label: Joi.string().max(255).optional(),
    coordinates: Joi.array().min(2).items(pointSchema).required(),
    conduits: Joi.array().items(Joi.object({
      size_mm: Joi.string().required(),
      count: Joi.number().integer().min(1).required(),
      material: Joi.string().valid('PVC', 'HDPE', 'Steel', 'Aluminum', 'Fiber Optic', 'Copper', 'Other').required(),
      sdr: Joi.string().optional(),
      outer_diameter_mm: Joi.number().min(0).required(),
      min_curvature_radius_m: Joi.number().min(0).required()
    })).optional(),
    entry_angle_degrees: Joi.number().min(0).max(90).optional(),
    exit_angle_degrees: Joi.number().min(0).max(90).optional(),
    min_depth_guaranteed_m: Joi.number().min(0).optional(),
    drill_diameter_mm: Joi.number().min(0).optional(),
    backreamer_diameter_mm: Joi.number().min(0).optional(),
    scale: scaleSchema,
    zoom: zoomSchema
  }),

  // HIDROESCAVAÇÃO
  'hydro-excavation': Joi.object({
    type: Joi.string().valid('hydro-excavation').required(),
    project_id: Joi.string().required(),
    label: Joi.string().max(255).optional(),
    subtype: Joi.string().valid('trench', 'hole', 'potholing').optional(),
    coordinates: Joi.array().min(1).items(pointSchema).required(),
    section: Joi.object({
      shape: Joi.string().valid('circular', 'rectangular').required(),
      diameter_m: Joi.number().min(0).optional(),
      width_m: Joi.number().min(0).optional(),
      length_m: Joi.number().min(0).optional()
    }).optional(),
    depth_m: Joi.number().min(0).optional(),
    efficiency_ratio: Joi.number().min(0).max(1).optional(),
    surface_type: Joi.string().valid('asphalt', 'concrete', 'dirt').optional(),
    include_restoration: Joi.boolean().optional(),
    conduits: Joi.array().items(Joi.object({
      size_mm: Joi.string().required(),
      count: Joi.number().integer().min(1).required(),
      material: Joi.string().required()
    })).optional(),
    scale: scaleSchema,
    zoom: zoomSchema
  }),

  // CONDUTO
  conduit: Joi.object({
    type: Joi.string().valid('conduit').required(),
    project_id: Joi.string().required(),
    label: Joi.string().max(255).optional(),
    coordinates: Joi.array().min(2).items(pointSchema).required(),
    conduits: Joi.array().items(Joi.object({
      size_mm: Joi.string().required(),
      count: Joi.number().integer().min(1).required(),
      material: Joi.string().valid('PVC', 'HDPE', 'Steel', 'Aluminum', 'Fiber Optic', 'Copper', 'Other').required(),
      sdr: Joi.string().optional(),
      nominal_diameter_mm: Joi.number().min(0).required(),
      outer_diameter_mm: Joi.number().min(0).required(),
      wall_thickness_mm: Joi.number().min(0).required(),
      length_m: Joi.number().min(0).optional()
    })).optional(),
    connections: Joi.array().optional(),
    installation_method: Joi.string().valid('trench', 'hdd', 'direct_bury').optional(),
    compatibility_check: Joi.object().optional(),
    scale: scaleSchema,
    zoom: zoomSchema
  }),

  // CÂMARA / BURACO DE MÃO
  vault: Joi.object({
    type: Joi.string().valid('vault').required(),
    project_id: Joi.string().required(),
    label: Joi.string().max(255).optional(),
    coordinates: Joi.array().min(1).items(pointSchema).required(),
    vault_type: Joi.string().valid('poço_visita', 'caixa_passagem', 'buraco_mao', 'câmara').optional(),
    shape: Joi.string().valid('rectangular', 'circular').optional(),
    dimensions: Joi.object({
      length_m: Joi.number().min(0).optional(),
      width_m: Joi.number().min(0).optional(),
      diameter_m: Joi.number().min(0).optional(),
      depth_m: Joi.number().min(0).required()
    }).optional(),
    material: Joi.string().optional(),
    class: Joi.string().optional(),
    quantity: Joi.number().integer().min(1).optional(),
    volumes: Joi.object().optional(),
    hole_size: Joi.object().optional(),
    traffic_rated: Joi.boolean().optional(),
    scale: scaleSchema,
    zoom: zoomSchema
  }),

  // ÁREA (ViaPlan)
  area: Joi.object({
    type: Joi.string().valid('area').required(),
    project_id: Joi.string().required(),
    label: Joi.string().max(255).optional(),
    coordinates: Joi.array().min(3).items(pointSchema).required()
      .custom((value: any, helpers: Joi.CustomHelpers) => {
        // Validar que está fechado (último = primeiro)
        if (value.length > 0) {
          const first = value[0];
          const last = value[value.length - 1];
          const EPSILON = 0.001;
          if (Math.abs(first.x - last.x) > EPSILON || Math.abs(first.y - last.y) > EPSILON) {
            return helpers.error('any.custom', { message: 'Polígono deve estar fechado (último ponto = primeiro)' });
          }
        }
        return value;
      }),
    depth_m: Joi.number().min(0).optional(),
    scale: scaleSchema,
    zoom: zoomSchema
  }),

  // NOTA
  note: Joi.object({
    type: Joi.string().valid('note').required(),
    project_id: Joi.string().required(),
    label: Joi.string().max(255).optional(),
    text: Joi.string().optional(),
    author: Joi.string().optional(),
    date: Joi.string().isoDate().optional(),
    coordinates: Joi.array().items(pointSchema).optional(),
    linked_measurement_id: Joi.string().optional(),
    scale: scaleSchema,
    zoom: zoomSchema
  })
};

// Schema unificado para criar medição ViaPlan
export const createViaplanMeasurementSchema = Joi.object({
  project_id: Joi.string().required(),
  type: Joi.string().valid(
    'select',
    'trench',
    'bore-shot',
    'hydro-excavation',
    'conduit',
    'vault',
    'area',
    'note'
  ).required(),
  data: Joi.alternatives().conditional('type', {
    switch: [
      { is: 'select', then: viaplanMeasurementSchemas.select },
      { is: 'trench', then: viaplanMeasurementSchemas.trench },
      { is: 'bore-shot', then: viaplanMeasurementSchemas['bore-shot'] },
      { is: 'hydro-excavation', then: viaplanMeasurementSchemas['hydro-excavation'] },
      { is: 'conduit', then: viaplanMeasurementSchemas.conduit },
      { is: 'vault', then: viaplanMeasurementSchemas.vault },
      { is: 'area', then: viaplanMeasurementSchemas.area },
      { is: 'note', then: viaplanMeasurementSchemas.note }
    ]
  }),
  scale: scaleSchema,
  zoom: zoomSchema,
  label: Joi.string().max(255).optional()
});

