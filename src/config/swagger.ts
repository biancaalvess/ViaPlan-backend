import swaggerJsdoc from 'swagger-jsdoc';
import { config } from './app';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ViaPlan Backend API - TAKEOFF & UPLOAD',
      version: '1.0.0',
      description: 'API para sistema de TAKEOFF e UPLOAD de plantas',
      contact: {
        name: 'ViaPlan Team',
        email: 'viaplan@example.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: `http://localhost:${config.PORT}`,
        description: 'Servidor de desenvolvimento'
      },
      {
        url: 'https://api.viaplan.com',
        description: 'Servidor de produção'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Token JWT para autenticação'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            error: {
              type: 'string',
              example: 'Validation failed'
            },
            message: {
              type: 'string',
              example: 'Dados inválidos fornecidos'
            },
            details: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: {
                    type: 'string',
                    example: 'file'
                  },
                  message: {
                    type: 'string',
                    example: 'Arquivo é obrigatório'
                  }
                }
              }
            }
          }
        },
        Takeoff: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: '123e4567-e89b-12d3-a456-426614174000'
            },
            name: {
              type: 'string',
              example: 'Takeoff Projeto ABC'
            },
            description: {
              type: 'string',
              example: 'Descrição do takeoff'
            },
            project_id: {
              type: 'string',
              format: 'uuid',
              example: '123e4567-e89b-12d3-a456-426614174000'
            },
            type: {
              type: 'string',
              example: 'electrical'
            },
            status: {
              type: 'string',
              enum: ['active', 'inactive', 'archived', 'draft', 'processing', 'completed', 'error'],
              example: 'active'
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-01T00:00:00.000Z'
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-01T00:00:00.000Z'
            }
          }
        },
        UploadResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            message: {
              type: 'string',
              example: 'Arquivo enviado com sucesso'
            },
            data: {
              type: 'object',
              properties: {
                filename: {
                  type: 'string',
                  example: 'arquivo.pdf'
                },
                file_path: {
                  type: 'string',
                  example: '/uploads/plants/arquivo.pdf'
                },
                size: {
                  type: 'integer',
                  example: 1024000
                },
                mimetype: {
                  type: 'string',
                  example: 'application/pdf'
                }
              }
            }
          }
        },
        HealthCheck: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['OK'],
              example: 'OK'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-01T00:00:00.000Z'
            },
            uptime: {
              type: 'number',
              example: 3600
            },
            environment: {
              type: 'string',
              example: 'development'
            },
            version: {
              type: 'string',
              example: '1.0.0'
            },
            services: {
              type: 'object',
              properties: {
                takeoff: {
                  type: 'string',
                  example: 'active'
                },
                quickTakeoff: {
                  type: 'string',
                  example: 'active'
                },
                upload: {
                  type: 'string',
                  example: 'active'
                }
              }
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ],
    tags: [
      {
        name: 'Takeoff',
        description: 'Endpoints de takeoff e medições'
      },
      {
        name: 'Quick Takeoff',
        description: 'Endpoints de quick takeoff'
      },
      {
        name: 'Upload',
        description: 'Endpoints de upload de arquivos'
      },
      {
        name: 'Health',
        description: 'Health checks e monitoramento'
      }
    ]
  },
  apis: [
    './src/routes/*.ts',
    './src/controllers/*.ts'
  ]
};

export const swaggerSpec = swaggerJsdoc(options);
export default swaggerSpec;
