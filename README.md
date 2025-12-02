# ViaPlan Backend API

Backend REST API desenvolvido em Node.js e TypeScript para o sistema ViaPlan, focado em gerenciamento de projetos de engenharia, upload de plantas técnicas, processamento de takeoffs e cálculos de medições.

## Visão Geral

O ViaPlan Backend é uma API robusta que fornece endpoints para:
- Upload e gerenciamento de plantas técnicas (PDFs)
- Processamento de takeoffs e quick takeoffs
- Cálculos de medições de engenharia (trincheiras, perfurações, escavações, condutos, etc.)
- Gerenciamento de projetos e medições
- Sistema de cache para otimização de performance
- Autenticação e autorização baseada em JWT
- Documentação interativa via Swagger

## Tecnologias Utilizadas

### Core
- **Node.js**: Runtime JavaScript server-side
- **TypeScript**: Linguagem de programação com tipagem estática
- **Express.js**: Framework web para Node.js
- **CommonJS**: Sistema de módulos

### Segurança e Autenticação
- **Helmet**: Middleware de segurança HTTP
- **CORS**: Configuração de Cross-Origin Resource Sharing
- **JWT**: Autenticação baseada em tokens
- **express-rate-limit**: Proteção contra rate limiting

### Processamento de Arquivos
- **Multer**: Middleware para upload de arquivos multipart/form-data
- **fs (File System)**: Manipulação de arquivos do sistema
- **path**: Manipulação de caminhos de arquivos

### Documentação e Logging
- **Swagger/OpenAPI**: Documentação interativa da API
- **Winston**: Sistema de logging robusto
- **swagger-jsdoc**: Geração de documentação Swagger a partir de comentários

### Cache e Performance
- **compression**: Middleware de compressão de respostas HTTP
- **Cache em memória**: Sistema de cache customizado (fallback para Redis quando disponível)

### Utilitários
- **uuid**: Geração de identificadores únicos
- **dotenv**: Gerenciamento de variáveis de ambiente

## Estrutura do Projeto

```
ViaPlan-backend/
├── src/
│   ├── config/              # Configurações da aplicação
│   │   ├── app.ts          # Configurações principais (porta, CORS, uploads)
│   │   ├── security.ts     # Configurações de segurança (JWT, rate limiting)
│   │   ├── swagger.ts      # Configuração da documentação Swagger
│   │   └── testSettings.ts # Configurações de ambientes de teste
│   │
│   ├── controllers/        # Controladores (lógica de negócio)
│   │   ├── measurementController.ts
│   │   ├── projectController.ts
│   │   ├── quickTakeoffController.ts
│   │   ├── takeoffController.ts
│   │   └── uploadController.ts
│   │
│   ├── middleware/         # Middlewares Express
│   │   ├── auth.ts         # Autenticação JWT
│   │   ├── cache.ts        # Middleware de cache
│   │   ├── corsMiddleware.ts
│   │   ├── errorHandler.ts
│   │   ├── rateLimit.ts
│   │   ├── security.ts     # CORS e Helmet
│   │   ├── upload.ts       # Configuração de uploads
│   │   └── validation.ts   # Validação de dados
│   │
│   ├── routes/             # Definição de rotas
│   │   ├── calculationRoutes.ts
│   │   ├── measurementRoutes.ts
│   │   ├── projectRoutes.ts
│   │   ├── quickTakeoffRoutes.ts
│   │   ├── takeoffRoutes.ts
│   │   └── uploadRoutes.ts
│   │
│   ├── services/           # Camada de serviços (lógica de negócio)
│   │   ├── cacheService.ts
│   │   ├── measurement-calculations.ts
│   │   ├── measurement-calculations-viaplan.ts
│   │   ├── measurement-service.ts
│   │   ├── plants-unified-service.ts
│   │   ├── project-service.ts
│   │   ├── quick-takeoff-service.ts
│   │   └── takeoff-unified-service.ts
│   │
│   ├── types/             # Definições de tipos TypeScript
│   │   ├── express.d.ts
│   │   ├── measurement.ts
│   │   ├── plant.ts
│   │   └── unified.ts
│   │
│   ├── utils/             # Utilitários
│   │   ├── envValidator.ts
│   │   ├── errorHandler.ts
│   │   ├── jwt.ts
│   │   ├── logger.ts
│   │   └── winstonLogger.ts
│   │
│   └── server.ts          # Arquivo principal do servidor
│
├── uploads/               # Arquivos enviados pelos usuários
│   ├── plants/           # Plantas técnicas
│   └── takeoff/          # Arquivos de takeoff
│
├── thumbnails/           # Miniaturas geradas
│   ├── plants/
│   └── takeoff/
│
├── exports/              # Arquivos exportados
│   ├── plants/
│   └── takeoff/
│
├── dist/                 # Código compilado (TypeScript -> JavaScript)
├── data/                 # Dados do banco de dados SQLite
├── logs/                 # Arquivos de log
│
├── env.example           # Exemplo de variáveis de ambiente
├── env.local            # Variáveis de ambiente local
├── env.production       # Variáveis de ambiente de produção
├── tsconfig.json        # Configuração do TypeScript
└── package-lock.json    # Lock file das dependências
```

## Funcionalidades Principais

### 1. Upload de Plantas Técnicas

**Localização**: `src/routes/uploadRoutes.ts`, `src/services/plants-unified-service.ts`

**Função**: Permite o upload de arquivos PDF de plantas técnicas para projetos de engenharia.

**Como funciona**:
- Recebe arquivos via multipart/form-data usando Multer
- Valida tipo de arquivo (apenas PDFs)
- Armazena arquivos em `uploads/plants/` com nomes únicos
- Gera metadados (tamanho, tipo MIME, nome original)
- Retorna informações do arquivo processado

**Tecnologias**: Express, Multer, File System

**Endpoint**: `POST /api/upload/plants`

### 2. Processamento de Takeoffs

**Localização**: `src/routes/takeoffRoutes.ts`, `src/services/takeoff-unified-service.ts`

**Função**: Processa arquivos PDF de takeoffs e extrai medições de projetos de engenharia.

**Como funciona**:
- Recebe PDFs de takeoff associados a um projeto
- Processa o PDF para extrair informações de medições
- Armazena medições extraídas
- Suporta diferentes tipos de medições (trincheiras, perfurações, escavações, etc.)

**Tecnologias**: Express, Multer, PDF processing

**Endpoint**: `POST /api/upload/takeoff/:projectId`

### 3. Quick Takeoff

**Localização**: `src/routes/quickTakeoffRoutes.ts`, `src/services/quick-takeoff-service.ts`

**Função**: Processamento rápido de PDFs para extração de medições sem associação prévia a projeto.

**Como funciona**:
- Processa PDFs de forma mais rápida e simplificada
- Extrai medições básicas sem necessidade de projeto existente
- Retorna resultados imediatos

**Tecnologias**: Express, PDF processing

**Endpoint**: `POST /api/quick-takeoff/process-pdf`

### 4. Sistema de Medições

**Localização**: `src/services/measurement-service.ts`, `src/services/measurement-calculations-viaplan.ts`

**Função**: Gerencia e calcula diferentes tipos de medições de engenharia.

**Tipos de medições suportadas**:
- **Trincheiras (Trench)**: Cálculo de comprimento e volume
- **Perfurações (Bore Shot)**: Cálculo de comprimento com validação de raio e profundidade
- **Escavação Hidráulica (Hydro Excavation)**: Cálculo de volume
- **Condutos (Conduit)**: Cálculo de comprimento, volume interno e estimativa de peso
- **Vaults**: Cálculo de volume de escavação
- **Áreas (Area)**: Cálculo de área e perímetro de polígonos
- **Notas (Note)**: Anotações textuais
- **Seleções (Select)**: Seleções de elementos

**Como funciona**:
- Armazena medições em arquivos JSON (simulação de banco de dados)
- Valida dados de entrada conforme tipo de medição
- Calcula métricas automaticamente (comprimento, volume, área, etc.)
- Suporta filtros e buscas por projeto, tipo, data, etc.

**Tecnologias**: TypeScript, cálculos matemáticos, validação de dados

**Endpoints**:
- `POST /api/v1/measurements` - Criar medição
- `GET /api/v1/measurements` - Listar medições
- `GET /api/v1/measurements/:id` - Obter medição específica
- `PUT /api/v1/measurements/:id` - Atualizar medição
- `DELETE /api/v1/measurements/:id` - Deletar medição

### 5. Gerenciamento de Projetos

**Localização**: `src/services/project-service.ts`, `src/routes/projectRoutes.ts`

**Função**: Gerencia projetos de engenharia e suas associações com medições e plantas.

**Como funciona**:
- Cria e gerencia projetos
- Associa medições a projetos
- Armazena metadados do projeto (nome, descrição, datas)
- Fornece endpoints para CRUD completo de projetos

**Tecnologias**: TypeScript, File System (armazenamento JSON)

**Endpoints**:
- `POST /api/v1/projects` - Criar projeto
- `GET /api/v1/projects` - Listar projetos
- `GET /api/v1/projects/:id` - Obter projeto específico
- `PUT /api/v1/projects/:id` - Atualizar projeto
- `DELETE /api/v1/projects/:id` - Deletar projeto

### 6. Sistema de Cache

**Localização**: `src/services/cacheService.ts`, `src/middleware/cache.ts`

**Função**: Sistema de cache para otimizar performance de requisições frequentes.

**Como funciona**:
- Cache em memória como padrão
- Suporta Redis quando disponível (fallback automático)
- Prefixo de chaves: `viaplan:`
- TTL (Time To Live) configurável
- Invalidação por padrão
- Middleware para cache automático de respostas GET

**Tecnologias**: Map (memória), Redis (opcional)

**Uso**: Middleware aplicado automaticamente em rotas GET para cachear respostas por 5 minutos (padrão).

### 7. Autenticação e Autorização

**Localização**: `src/middleware/auth.ts`

**Função**: Sistema de autenticação baseado em JWT e controle de acesso por roles.

**Como funciona**:
- Valida tokens JWT no header Authorization
- Suporta bypass em desenvolvimento (apenas para testes locais)
- Define roles de usuário: ADMIN, MANAGER, ENGINEER, TECHNICIAN, VIEWER
- Middleware `requireRole` para verificar permissões
- Middleware `requireProjectAccess` para controle de acesso a projetos

**Tecnologias**: JWT, Express middleware

**Headers necessários**: `Authorization: Bearer <token>`

### 8. Segurança

**Localização**: `src/middleware/security.ts`, `src/config/security.ts`

**Função**: Implementa múltiplas camadas de segurança.

**Recursos**:
- **Helmet**: Headers de segurança HTTP
- **CORS**: Configuração de origens permitidas
- **Rate Limiting**: Proteção contra abuso (100 requisições por 15 minutos)
- **Validação de arquivos**: Tipo e tamanho máximo (200MB)
- **Content Security Policy**: Proteção contra XSS
- **HSTS**: HTTP Strict Transport Security em produção

**Origens permitidas**:
- Localhost (várias portas para desenvolvimento)
- https://viaplan-test.netlify.app
- https://viaplan-frontend.vercel.app
- https://viaplan-plants.vercel.app
- https://viaplan-admin.vercel.app

**Tecnologias**: Helmet, CORS, express-rate-limit

### 9. Logging

**Localização**: `src/utils/winstonLogger.ts`

**Função**: Sistema de logging estruturado para monitoramento e debug.

**Como funciona**:
- Usa Winston para logging
- Níveis de log: ERROR, WARN, INFO, DEBUG
- Logs de requisições HTTP automáticos
- Armazena logs em arquivos e console
- Formato JSON em produção

**Tecnologias**: Winston

### 10. Documentação Swagger

**Localização**: `src/config/swagger.ts`

**Função**: Documentação interativa da API disponível em desenvolvimento.

**Como funciona**:
- Gera documentação OpenAPI 3.0 a partir de comentários JSDoc
- Interface web em `/api-docs`
- Inclui schemas, exemplos e descrições de endpoints
- Disponível apenas em ambiente de desenvolvimento

**Tecnologias**: swagger-jsdoc, swagger-ui-express

**Acesso**: `http://localhost:PORT/api-docs` (apenas em development)

### 11. Tratamento de Erros

**Localização**: `src/utils/errorHandler.ts`, `src/middleware/errorHandler.ts`

**Função**: Sistema centralizado de tratamento de erros.

**Como funciona**:
- Captura erros não tratados
- Formata respostas de erro consistentes
- Loga erros para análise
- Sanitiza informações sensíveis em produção
- Handler 404 para rotas não encontradas

**Tecnologias**: Express error handling

## Configuração e Instalação

### Pré-requisitos

- Node.js (versão 18 ou superior)
- npm ou yarn
- TypeScript (instalado globalmente ou via projeto)

### Instalação

1. Clone o repositório:
```bash
git clone <repository-url>
cd ViaPlan-backend
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
```bash
cp env.example env.local
```

4. Edite `env.local` e configure:
   - `JWT_SECRET`: Chave secreta para JWT (mínimo 32 caracteres)
   - `PORT`: Porta do servidor (padrão: 3003)
   - `CORS_ORIGINS`: Origens permitidas separadas por vírgula
   - `MAX_FILE_SIZE`: Tamanho máximo de upload em bytes (padrão: 200MB)

5. Compile o TypeScript:
```bash
npm run build
```

6. Execute o servidor:
```bash
npm start
```

Ou em modo desenvolvimento com hot-reload:
```bash
npm run dev
```

## Variáveis de Ambiente

### Obrigatórias
- `JWT_SECRET`: Chave secreta para assinatura de tokens JWT

### Opcionais (com valores padrão)
- `NODE_ENV`: Ambiente de execução (development/production)
- `PORT`: Porta do servidor (padrão: 3003)
- `HOST`: Host do servidor (padrão: localhost)
- `MAX_FILE_SIZE`: Tamanho máximo de upload em bytes (padrão: 209715200 = 200MB)
- `CORS_ORIGINS`: Origens permitidas separadas por vírgula
- `LOG_LEVEL`: Nível de log (ERROR, WARN, INFO, DEBUG)
- `RATE_LIMIT_WINDOW_MS`: Janela de tempo para rate limiting (padrão: 900000 = 15 minutos)
- `RATE_LIMIT_MAX_REQUESTS`: Máximo de requisições por janela (padrão: 100)

## Endpoints Principais

### Health Check
- `GET /health` - Verifica status do servidor e serviços

### Upload
- `POST /api/upload/plants` - Upload de plantas técnicas
- `POST /api/upload/takeoff/:projectId` - Upload de takeoff para projeto

### Takeoff
- `GET /api/takeoff/*` - Rotas de takeoff
- `POST /api/quick-takeoff/process-pdf` - Processamento rápido de PDF

### Medições
- `POST /api/v1/measurements` - Criar medição
- `GET /api/v1/measurements` - Listar medições (com filtros)
- `GET /api/v1/measurements/:id` - Obter medição específica
- `PUT /api/v1/measurements/:id` - Atualizar medição
- `DELETE /api/v1/measurements/:id` - Deletar medição

### Projetos
- `POST /api/v1/projects` - Criar projeto
- `GET /api/v1/projects` - Listar projetos
- `GET /api/v1/projects/:id` - Obter projeto específico
- `PUT /api/v1/projects/:id` - Atualizar projeto
- `DELETE /api/v1/projects/:id` - Deletar projeto

### Cálculos
- `POST /api/v1/calculations/*` - Endpoints de cálculos

## Frontend

O frontend do ViaPlan está disponível em:

**Produção**: https://viaplan-frontend.onrender.com

**Desenvolvimento**: 
- Local: http://localhost:5175
- Vercel: https://viaplan-frontend.vercel.app
- Netlify: https://viaplan-test.netlify.app

O backend está configurado para aceitar requisições dessas origens via CORS.

## Arquitetura

### Padrão MVC (Model-View-Controller)

- **Models**: Definições de tipos e interfaces (`src/types/`)
- **Views**: Respostas JSON da API
- **Controllers**: Lógica de controle de requisições (`src/controllers/`)
- **Services**: Lógica de negócio (`src/services/`)
- **Routes**: Definição de rotas (`src/routes/`)
- **Middleware**: Processamento de requisições (`src/middleware/`)

### Fluxo de Requisição

1. Requisição HTTP chega ao servidor
2. Middleware de segurança (CORS, Helmet) processa
3. Middleware de autenticação valida token (se necessário)
4. Middleware de cache verifica cache (para GET)
5. Rota direciona para controller apropriado
6. Controller chama service para lógica de negócio
7. Service processa e retorna dados
8. Controller formata resposta JSON
9. Middleware de cache armazena resposta (se GET)
10. Resposta enviada ao cliente

## Compilação TypeScript

O projeto usa TypeScript com as seguintes configurações:

- **Target**: ES2020
- **Module**: CommonJS
- **Strict Mode**: Habilitado
- **Source Maps**: Habilitados
- **Output**: `./dist`
- **Root**: `./src`

Compile com:
```bash
npm run build
```

Ou use watch mode para desenvolvimento:
```bash
npm run dev
```

## Armazenamento de Dados

Atualmente, o projeto usa armazenamento baseado em arquivos JSON para simular um banco de dados. Os dados são armazenados em:

- `data/measurements/` - Medições
- `data/projects/` - Projetos
- `uploads/` - Arquivos enviados
- `thumbnails/` - Miniaturas geradas
- `exports/` - Arquivos exportados

**Nota**: Para produção, recomenda-se migrar para um banco de dados real (PostgreSQL, MySQL, MongoDB, etc.).

## Logs

Os logs são armazenados em:
- Console (desenvolvimento)
- Arquivos em `logs/` (produção)
- Formato JSON em produção para facilitar parsing

Níveis de log configuráveis via `LOG_LEVEL`:
- ERROR: Apenas erros
- WARN: Avisos e erros
- INFO: Informações, avisos e erros
- DEBUG: Todas as informações

## Segurança em Produção

Ao implantar em produção, certifique-se de:

1. Configurar `JWT_SECRET` com valor seguro e único
2. Configurar `CORS_ORIGINS` apenas com domínios permitidos
3. Usar HTTPS
4. Configurar firewall adequado
5. Monitorar logs de segurança
6. Revisar configurações de rate limiting
7. Desabilitar bypass de autenticação (`DEV_AUTH_BYPASS=false`)

## Desenvolvimento

### Estrutura de Commits

O projeto segue commits organizados por funcionalidade:
- `refactor:` - Refatorações de código
- `feat:` - Novas funcionalidades
- `fix:` - Correções de bugs
- `docs:` - Documentação

### Testes

Para testar a API:

1. Use a documentação Swagger em `/api-docs`
2. Use ferramentas como Postman ou Insomnia
3. Teste endpoints de health check primeiro: `GET /health`

### Debug

- Logs detalhados em modo desenvolvimento
- Source maps habilitados para debug TypeScript
- Winston logger para rastreamento de erros

## Licença

Ver arquivo LICENSE para detalhes.

## Contato

ViaPlan Team
Email: viaplan@example.com

## Changelog

### Versão 1.0.0
- Implementação inicial do backend
- Sistema de upload de plantas
- Processamento de takeoffs
- Sistema de medições
- Gerenciamento de projetos
- Autenticação JWT
- Documentação Swagger
- Sistema de cache
- Segurança com Helmet e CORS

