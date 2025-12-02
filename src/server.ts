import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import compression from 'compression';

import { config, validateConfig } from './config/app';
import { notFoundHandler } from './middleware/errorHandler';
import { ErrorHandler } from './utils/errorHandler';
import { httpRequestLogger, log } from './utils/winstonLogger';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';
import {
  corsMiddleware,
  helmetMiddleware,
  securityMiddleware,
} from './middleware/security';
// import { uploadMiddleware } from './middleware/upload'; // Não usado diretamente

// Import routes - TAKEOFF, UPLOAD e MEDIÇÕES
import takeoffRoutes from './routes/takeoffRoutes';
import quickTakeoffRoutes from './routes/quickTakeoffRoutes';
import uploadRoutes from './routes/uploadRoutes';
import measurementRoutes from './routes/measurementRoutes';
import projectRoutes from './routes/projectRoutes';
import calculationRoutes from './routes/calculationRoutes';

const app = express();
app.enable('trust proxy');
const PORT = config.PORT;

log.info('🚀 Criando aplicação Express...');

// Validar configuração
try {
  validateConfig();
  log.info('✅ Configuração validada com sucesso');
} catch (error) {
  log.error('❌ Erro na configuração:', error);
  process.exit(1);
}

// Middleware de logging robusto
app.use(httpRequestLogger);

// Middleware de compressão
app.use(compression({
  level: 6,
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

// Swagger UI (apenas em desenvolvimento)
if (config.NODE_ENV === 'development') {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'ViaPlan Backend API Documentation'
  }));
  
  log.info('📚 Swagger UI disponível em /api-docs');
}

// Middleware de segurança
app.use(helmetMiddleware);
app.use(corsMiddleware);
app.use(securityMiddleware);
app.options('*', corsMiddleware);

// Middleware para timeout em uploads grandes
const uploadTimeoutMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (req.headers['content-type']?.includes('multipart/form-data')) {
    req.setTimeout(300000); // 5 minutos
    res.setTimeout(300000);
  }
  next();
};
app.use(uploadTimeoutMiddleware);

// Configuração do Multer para processar FormData (não usado diretamente, apenas via middleware)

// Body parsing middleware com limites aumentados para uploads grandes
app.use(express.json({ limit: '200mb' }));
app.use(express.urlencoded({ extended: true, limit: '200mb' }));

// Static file serving para uploads, thumbnails e exports
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
app.use('/thumbnails', express.static(path.join(process.cwd(), 'thumbnails')));
app.use('/exports', express.static(path.join(process.cwd(), 'exports')));

console.log('Pasta de uploads:', path.join(process.cwd(), 'uploads'));
console.log('Pasta de thumbnails:', path.join(process.cwd(), 'thumbnails'));
console.log('Pasta de exports:', path.join(process.cwd(), 'exports'));

// Endpoints públicos
app.get('/health', corsMiddleware, (_req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    services: {
      takeoff: 'active',
      quickTakeoff: 'active',
      upload: 'active',
    },
  });
});

app.get('/test', (_req, res) => {
  res.json({
    message: 'Rota de teste funcionando',
    env: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/test', (_req, res) => {
  res.json({
    message: 'Rota de teste da API funcionando',
    env: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

app.get('/', (_req, res) => {
  res.json({
    message: 'ViaPlan API Server',
    version: '1.0.0',
    status: 'running',
    documentation: 'Consulte /health para verificar o status dos serviços disponíveis',
  });
});

// Função auxiliar para registrar rotas com logs
const registerRoute = (path: string, router: express.Router) => {
  console.log(`📋 Registrando rota ${path}...`);
  app.use(path, router);
  console.log(`✅ Rota ${path} registrada com sucesso`);
};

// Inicializar rotas
const initializeRoutes = async () => {
  try {
    console.log('🛣️  Inicializando rotas...');

    // Registrar rotas - TAKEOFF, UPLOAD e MEDIÇÕES
    registerRoute('/api/takeoff', takeoffRoutes);
    registerRoute('/api/quick-takeoff', quickTakeoffRoutes);
    registerRoute('/api/upload', uploadRoutes);
    registerRoute('/api/v1/measurements', measurementRoutes);
    registerRoute('/api/v1/projects', projectRoutes);
    registerRoute('/api/v1/calculations', calculationRoutes);

    console.log('✅ Rotas inicializadas com sucesso');
  } catch (error) {
    console.error('❌ Erro ao inicializar rotas:', error);
    throw error;
  }
};

// Middleware de tratamento de erros
app.use(ErrorHandler.handleError);

const startServer = async () => {
  try {
    console.log('🚀 Iniciando servidor ViaPlan...');

    // Criar diretórios necessários
    const dirs = [
      'uploads/plants',
      'uploads/takeoff',
      'thumbnails/plants',
      'thumbnails/takeoff',
      'exports/plants',
      'exports/takeoff',
      'data/measurements',
      'data/projects'
    ];

    dirs.forEach(dir => {
      const fullPath = path.join(process.cwd(), dir);
      if (!require('fs').existsSync(fullPath)) {
        require('fs').mkdirSync(fullPath, { recursive: true });
        console.log(`📁 Diretório criado: ${fullPath}`);
      }
    });

    // Inicializar rotas
    await initializeRoutes();

    // 404 handler - DEVE SER DEPOIS DAS ROTAS
    app.use('*', notFoundHandler);

    console.log('🛣️  Rotas disponíveis:');
    console.log('   - POST /api/upload/plants (Upload de plantas)');
    console.log('   - GET /api/upload/plants/:id/export (Exportar planta)');
    console.log('   - POST /api/upload/takeoff/:projectId (Upload de takeoff)');
    console.log('   - GET /api/takeoff/* (Rotas de takeoff)');
    console.log('   - GET /api/quick-takeoff/* (Rotas de quick takeoff)');
    console.log('   - POST /api/v1/measurements (Criar medição)');
    console.log('   - GET /api/v1/measurements (Listar medições)');
    console.log('   - POST /api/v1/projects (Criar projeto)');
    console.log('   - GET /api/v1/projects (Listar projetos)');

    // Iniciar servidor
    const server = app.listen(PORT, () => {
      console.log('='.repeat(60));
      console.log('🚀 SERVIDOR VIAPLAN RODANDO COM SUCESSO!');
      console.log('='.repeat(60));
      console.log(`🌐 URL: http://localhost:${PORT}`);
      console.log(`📊 Health Check: http://localhost:${PORT}/health`);
      console.log(`📁 Uploads: http://localhost:${PORT}/uploads`);
      console.log(`🖼️  Thumbnails: http://localhost:${PORT}/thumbnails`);
      console.log(`📤 Exports: http://localhost:${PORT}/exports`);
      console.log(`🔧 API Takeoff: http://localhost:${PORT}/api/takeoff`);
      console.log(`⚡ API Quick Takeoff: http://localhost:${PORT}/api/quick-takeoff`);
      console.log(`📤 API Upload: http://localhost:${PORT}/api/upload`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`⏰ Started at: ${new Date().toISOString()}`);
      console.log('='.repeat(60));
    });

    // Shutdown graceful
    const gracefulShutdown = (signal: string) => {
      console.log(`\n🛑 Recebido sinal ${signal}. Iniciando shutdown graceful...`);
      
      server.close((err) => {
        if (err) {
          console.error('❌ Erro ao fechar servidor:', err);
          process.exit(1);
        }
        
        console.log('✅ Servidor fechado com sucesso');
        process.exit(0);
      });
      
      // Forçar fechamento após 30 segundos
      setTimeout(() => {
        console.error('❌ Forçando fechamento do servidor após timeout');
        process.exit(1);
      }, 30000);
    };

    // Capturar sinais de shutdown
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Capturar erros não tratados
    process.on('uncaughtException', (err) => {
      console.error('❌ Erro não capturado:', err);
      gracefulShutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason, _promise) => {
      console.error('❌ Promise rejeitada não tratada:', reason);
      gracefulShutdown('unhandledRejection');
    });
  } catch (error) {
    console.error('❌ Falha ao iniciar servidor:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🔄 SIGTERM recebido, encerrando graciosamente...');
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🔄 SIGINT recebido, encerrando graciosamente...');
  process.exit(0);
});

startServer();

export default app;
