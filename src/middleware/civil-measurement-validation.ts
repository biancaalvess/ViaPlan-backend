// ============================================================================
// VALIDAÇÕES PARA FERRAMENTAS DE MEDIÇÃO - ENGENHARIA CIVIL PREDIAL
// ============================================================================

import Joi from 'joi';

// Schema para Coordinate
const coordinateSchema = Joi.object({
  x: Joi.number().required(),
  y: Joi.number().required(),
  z: Joi.number().optional()
});

// Schema para polígono (mínimo 3 pontos, fechado)
const polygonSchema = Joi.array().min(3).items(coordinateSchema).required()
  .custom((value: any, helpers: Joi.CustomHelpers) => {
    // Validar que está fechado (último = primeiro)
    if (value.length > 0) {
      const first = value[0];
      const last = value[value.length - 1];
      if (Math.abs(first.x - last.x) > 0.001 || Math.abs(first.y - last.y) > 0.001) {
        return helpers.error('any.custom', { 
          message: 'Polígono deve estar fechado (último ponto = primeiro)' 
        });
      }
    }
    return value;
  });

// Schema para polilinha (mínimo 2 pontos)
const polylineSchema = Joi.array().min(2).items(coordinateSchema).required();

// Schemas específicos para cada tipo de medição
export const civilMeasurementSchemas = {
  // 1. PLANTA/LAYOUT
  layout: Joi.object({
    type: Joi.string().valid('layout').required(),
    geometry: Joi.object({
      lines: Joi.array().items(polylineSchema).min(1).required()
    }).required(),
    attributes: Joi.object({
      default_wall_thickness_m: Joi.number().positive().required(),
      axis: Joi.string().optional(),
      layer: Joi.string().optional()
    }).required(),
    label: Joi.string().max(255).required()
  }),

  // 2. PAREDES
  wall: Joi.object({
    type: Joi.string().valid('wall').required(),
    geometry: Joi.object({
      polyline: polylineSchema.required(),
      height_m: Joi.number().positive().required(),
      thickness_m: Joi.number().positive().required()
    }).required(),
    attributes: Joi.object({
      material: Joi.string().valid(
        'bloco_ceramico',
        'bloco_concreto',
        'tijolo_ceramico',
        'tijolo_baiano',
        'alvenaria_estrutural',
        'drywall',
        'outro'
      ).required(),
      custom_material: Joi.string().when('material', {
        is: 'outro',
        then: Joi.required(),
        otherwise: Joi.optional()
      }),
      density_kg_m3: Joi.number().positive().optional(),
      block_parameters: Joi.object({
        length_mm: Joi.number().positive().required(),
        height_mm: Joi.number().positive().required(),
        width_mm: Joi.number().positive().required(),
        yield_per_m2: Joi.number().positive().optional()
      }).optional()
    }).required(),
    label: Joi.string().max(255).required()
  }),

  // 3. ÁREA
  area: Joi.object({
    type: Joi.string().valid('area').required(),
    geometry: Joi.object({
      polygon: polygonSchema.required()
    }).required(),
    attributes: Joi.object({
      usage: Joi.string().valid(
        'quarto',
        'sala',
        'cozinha',
        'banheiro',
        'circulacao',
        'area_comum',
        'garagem',
        'varanda',
        'outro'
      ).required(),
      custom_usage: Joi.string().when('usage', {
        is: 'outro',
        then: Joi.required(),
        otherwise: Joi.optional()
      })
    }).required(),
    label: Joi.string().max(255).required()
  }),

  // 4. VÃOS/ABERTURAS
  opening: Joi.object({
    type: Joi.string().valid('opening').required(),
    geometry: Joi.object({
      shape: Joi.string().valid('line', 'rectangle').required(),
      coordinates: Joi.array().items(coordinateSchema).min(2).max(4).required(),
      width_m: Joi.number().positive().required(),
      height_m: Joi.number().positive().required()
    }).required(),
    attributes: Joi.object({
      opening_type: Joi.string().valid('porta', 'janela', 'portao', 'vazamento', 'outro').required(),
      material: Joi.string().valid('madeira', 'aluminio', 'ferro', 'pvc', 'vidro', 'outro').required(),
      custom_type: Joi.string().optional(),
      custom_material: Joi.string().when('material', {
        is: 'outro',
        then: Joi.required(),
        otherwise: Joi.optional()
      })
    }).required(),
    label: Joi.string().max(255).required()
  }),

  // 5. LAJES/PISOS
  slab: Joi.object({
    type: Joi.string().valid('slab').required(),
    geometry: Joi.object({
      polygon: polygonSchema.required(),
      thickness_m: Joi.number().positive().required()
    }).required(),
    attributes: Joi.object({
      structural_type: Joi.string().valid(
        'macica',
        'nervurada',
        'pre_fabricada',
        'mista',
        'outro'
      ).required(),
      material: Joi.string().valid(
        'concreto',
        'concreto_armado',
        'laje_pre_moldada',
        'outro'
      ).required(),
      custom_type: Joi.string().optional(),
      custom_material: Joi.string().when('material', {
        is: 'outro',
        then: Joi.required(),
        otherwise: Joi.optional()
      })
    }).required(),
    label: Joi.string().max(255).required()
  }),

  // 6. FUNDAÇÃO
  foundation: Joi.object({
    type: Joi.string().valid('foundation').required(),
    geometry: Joi.object({
      foundation_type: Joi.string().valid(
        'bloco',
        'sapata',
        'viga_baldrame',
        'radier',
        'estaca',
        'outro'
      ).required(),
      dimensions: Joi.object({
        length_m: Joi.number().positive().required(),
        width_m: Joi.number().positive().required(),
        height_m: Joi.number().positive().required()
      }).when('foundation_type', {
        is: Joi.string().valid('bloco', 'sapata'),
        then: Joi.required(),
        otherwise: Joi.optional()
      }),
      polyline: polylineSchema.when('foundation_type', {
        is: 'viga_baldrame',
        then: Joi.required(),
        otherwise: Joi.optional()
      }),
      width_m: Joi.number().positive().when('foundation_type', {
        is: 'viga_baldrame',
        then: Joi.required(),
        otherwise: Joi.optional()
      }),
      height_m: Joi.number().positive().when('foundation_type', {
        is: 'viga_baldrame',
        then: Joi.required(),
        otherwise: Joi.optional()
      }),
      polygon: polygonSchema.when('foundation_type', {
        is: 'radier',
        then: Joi.required(),
        otherwise: Joi.optional()
      }),
      thickness_m: Joi.number().positive().when('foundation_type', {
        is: 'radier',
        then: Joi.required(),
        otherwise: Joi.optional()
      })
    }).required(),
    attributes: Joi.object({
      soil_type: Joi.string().valid(
        'argila',
        'areia',
        'siltoso',
        'rochoso',
        'misturado',
        'nao_especificado'
      ).optional(),
      custom_type: Joi.string().optional()
    }).optional(),
    label: Joi.string().max(255).required()
  }),

  // 7. ESTRUTURA (CONCRETO)
  structure: Joi.object({
    type: Joi.string().valid('structure').required(),
    geometry: Joi.object({
      element_type: Joi.string().valid('viga', 'pilar', 'laje_estrutural').required(),
      polyline: polylineSchema.when('element_type', {
        is: Joi.string().valid('viga', 'pilar'),
        then: Joi.required(),
        otherwise: Joi.optional()
      }),
      section: Joi.object({
        type: Joi.string().valid('rectangular', 'circular', 'custom').required(),
        width_m: Joi.number().positive().when('type', {
          is: 'rectangular',
          then: Joi.required(),
          otherwise: Joi.optional()
        }),
        height_m: Joi.number().positive().when('type', {
          is: 'rectangular',
          then: Joi.required(),
          otherwise: Joi.optional()
        }),
        diameter_m: Joi.number().positive().when('type', {
          is: 'circular',
          then: Joi.required(),
          otherwise: Joi.optional()
        }),
        area_m2: Joi.number().positive().when('type', {
          is: 'custom',
          then: Joi.required(),
          otherwise: Joi.optional()
        })
      }).when('element_type', {
        is: Joi.string().valid('viga', 'pilar'),
        then: Joi.required(),
        otherwise: Joi.optional()
      }),
      length_m: Joi.number().positive().when('element_type', {
        is: Joi.string().valid('viga', 'pilar'),
        then: Joi.optional(),
        otherwise: Joi.optional()
      }),
      polygon: polygonSchema.when('element_type', {
        is: 'laje_estrutural',
        then: Joi.required(),
        otherwise: Joi.optional()
      }),
      thickness_m: Joi.number().positive().when('element_type', {
        is: 'laje_estrutural',
        then: Joi.required(),
        otherwise: Joi.optional()
      })
    }).required(),
    attributes: Joi.object({
      material: Joi.string().valid('concreto_armado', 'concreto_protendido', 'outro').required(),
      custom_material: Joi.string().when('material', {
        is: 'outro',
        then: Joi.required(),
        otherwise: Joi.optional()
      }),
      concrete_strength_mpa: Joi.number().positive().optional()
    }).required(),
    label: Joi.string().max(255).required()
  }),

  // 8. ACABAMENTOS
  finishing: Joi.object({
    type: Joi.string().valid('finishing').required(),
    geometry: Joi.object({
      surface_area: Joi.object({
        polygon: polygonSchema.optional(),
        surfaces: Joi.array().items(
          Joi.object({
            polygon: polygonSchema.required(),
            height_m: Joi.number().positive().optional()
          })
        ).optional()
      }).or('polygon', 'surfaces').required()
    }).required(),
    attributes: Joi.object({
      finishing_type: Joi.string().valid(
        'piso',
        'revestimento_parede',
        'pintura',
        'azulejo',
        'porcelanato',
        'granito',
        'outro'
      ).required(),
      custom_type: Joi.string().optional(),
      standard_loss_percent: Joi.number().min(0).max(100).default(0),
      material_unit: Joi.string().optional()
    }).required(),
    label: Joi.string().max(255).required()
  }),

  // 9. COBERTURA
  roof: Joi.object({
    type: Joi.string().valid('roof').required(),
    geometry: Joi.object({
      planes: Joi.array().items(
        Joi.object({
          polygon: polygonSchema.required(),
          inclination_degrees: Joi.number().min(0).max(90).required(),
          azimuth_degrees: Joi.number().min(0).max(360).optional()
        })
      ).min(1).required()
    }).required(),
    attributes: Joi.object({
      material: Joi.string().valid(
        'telha_ceramica',
        'telha_metalica',
        'laje',
        'membrana',
        'outro'
      ).required(),
      custom_material: Joi.string().when('material', {
        is: 'outro',
        then: Joi.required(),
        otherwise: Joi.optional()
      })
    }).required(),
    label: Joi.string().max(255).required()
  }),

  // 10. NOTA
  note: Joi.object({
    type: Joi.string().valid('note').required(),
    attributes: Joi.object({
      text: Joi.string().required(),
      author: Joi.string().optional(),
      date: Joi.string().isoDate().optional()
    }).required(),
    geometry: Joi.object({
      coordinates: Joi.array().items(coordinateSchema).min(1).required(),
      linked_measurement_id: Joi.string().uuid().optional()
    }).required(),
    label: Joi.string().max(255).required()
  })
};

// Schema para criar medição
export const createCivilMeasurementSchema = Joi.object({
  projectId: Joi.string().uuid().required(),
  type: Joi.string().valid(
    'layout',
    'wall',
    'area',
    'opening',
    'slab',
    'foundation',
    'structure',
    'finishing',
    'roof',
    'note'
  ).required(),
  data: Joi.alternatives().conditional('type', {
    switch: [
      { is: 'layout', then: civilMeasurementSchemas.layout },
      { is: 'wall', then: civilMeasurementSchemas.wall },
      { is: 'area', then: civilMeasurementSchemas.area },
      { is: 'opening', then: civilMeasurementSchemas.opening },
      { is: 'slab', then: civilMeasurementSchemas.slab },
      { is: 'foundation', then: civilMeasurementSchemas.foundation },
      { is: 'structure', then: civilMeasurementSchemas.structure },
      { is: 'finishing', then: civilMeasurementSchemas.finishing },
      { is: 'roof', then: civilMeasurementSchemas.roof },
      { is: 'note', then: civilMeasurementSchemas.note }
    ]
  }),
  label: Joi.string().max(255).required()
});

// Schema para atualizar medição
export const updateCivilMeasurementSchema = Joi.object({
  data: Joi.object().optional(),
  label: Joi.string().max(255).optional()
});

