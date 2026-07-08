FROM node:20-alpine AS builder

WORKDIR /app

# Instala as dependências
COPY package*.json ./
RUN npm ci

# Copia o código fonte e faz o build (Standalone)
COPY . .
RUN npm run build

# Imagem final, muito mais leve
FROM node:20-alpine AS runner

WORKDIR /app

# Copia os artefatos gerados
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3001

# O Next.js permite mudar a porta via variável de ambiente PORT
ENV PORT=3001

CMD ["npm", "run", "start"]
