/**
 * Configurações de Teste e Conectividade
 * Apenas para TAKEOFF e UPLOAD
 */

export interface TestEnvironment {
  name: string;
  baseUrl: string;
  origin: string;
  description: string;
}

export interface TestRoute {
  name: string;
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  description: string;
  requiresAuth: boolean;
}

export const TEST_ENVIRONMENTS: Record<string, TestEnvironment> = {
  development: {
    name: 'Desenvolvimento',
    baseUrl: 'https://viaplan-backend-58oq.onrender.com',
    origin: 'http://localhost:5175',
    description: 'Ambiente de desenvolvimento local'
  },
  production: {
    name: 'Produção',
    baseUrl: 'https://viaplan-backend-58oq.onrender.com',
    origin: 'https://viaplan-frontend.onrender.com',
    description: 'Ambiente de produção'
  },
  local: {
    name: 'Local',
    baseUrl: 'http://localhost:3000',
    origin: 'http://localhost:5175',
    description: 'Servidor local'
  }
};

export const TEST_ROUTES: TestRoute[] = [
  {
    name: 'Health Check',
    path: '/health',
    method: 'GET',
    description: 'Verificar status do servidor',
    requiresAuth: false
  },
  {
    name: 'Upload de Plantas',
    path: '/api/upload/plants',
    method: 'POST',
    description: 'Upload de arquivos de plantas',
    requiresAuth: false
  },
  {
    name: 'Upload de Takeoff',
    path: '/api/upload/takeoff/:projectId',
    method: 'POST',
    description: 'Upload de arquivos de takeoff',
    requiresAuth: true
  },
  {
    name: 'Takeoff - Medições',
    path: '/api/takeoff/measurements/:projectId',
    method: 'GET',
    description: 'Listar medições de takeoff',
    requiresAuth: true
  },
  {
    name: 'Quick Takeoff - Processar PDF',
    path: '/api/quick-takeoff/process-pdf',
    method: 'POST',
    description: 'Processar PDF para quick takeoff',
    requiresAuth: true
  }
];

export const CONNECTIVITY_TESTS = {
  backend: {
    name: 'Teste de Conectividade Backend',
    description: 'Verifica conectividade com o servidor backend',
    tests: [
      {
        name: 'Health Check',
        endpoint: '/health',
        method: 'GET'
      },
      {
        name: 'CORS Test',
        endpoint: '/health',
        method: 'OPTIONS'
      }
    ]
  },
  api: {
    name: 'Teste de Rotas da API',
    description: 'Verifica funcionamento das rotas da API',
    tests: [
      {
        name: 'Takeoff',
        endpoint: '/api/takeoff',
        method: 'GET'
      },
      {
        name: 'Quick Takeoff',
        endpoint: '/api/quick-takeoff',
        method: 'GET'
      },
      {
        name: 'Upload',
        endpoint: '/api/upload',
        method: 'GET'
      }
    ]
  }
};

export default {
  TEST_ENVIRONMENTS,
  TEST_ROUTES,
  CONNECTIVITY_TESTS
};
