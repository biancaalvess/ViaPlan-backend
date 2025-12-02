# Use Node.js 20 como imagem base
FROM node:20.18.0-alpine AS builder

# Definir diretório de trabalho
WORKDIR /app

# Copiar arquivos de configuração de dependências
COPY package*.json ./
COPY tsconfig.json ./

# Instalar dependências (incluindo devDependencies para build)
RUN npm install

# Copiar código fonte
COPY src ./src

# Compilar TypeScript
RUN npm run build || npx tsc

# Estágio de produção
FROM node:20.18.0-alpine AS production

# Criar usuário não-root para segurança
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Definir diretório de trabalho
WORKDIR /app

# Copiar arquivos de configuração
COPY package*.json ./
COPY tsconfig.json ./

# Instalar apenas dependências de produção
RUN npm ci --omit=dev && \
    npm cache clean --force

# Copiar código compilado do estágio builder
COPY --from=builder /app/dist ./dist

# Criar diretórios necessários
RUN mkdir -p uploads/plants uploads/takeoff \
    thumbnails/plants thumbnails/takeoff \
    exports/plants exports/takeoff \
    data/measurements data/projects \
    logs && \
    chown -R nodejs:nodejs /app

# Mudar para usuário não-root
USER nodejs

# Expor porta (padrão 3003, pode ser sobrescrita via env)
EXPOSE 3003

# Variáveis de ambiente padrão
ENV NODE_ENV=production
ENV PORT=3003

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3003/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Comando para iniciar o servidor
CMD ["node", "dist/server.js"]

