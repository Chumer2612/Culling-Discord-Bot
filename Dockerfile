FROM node:20-alpine

# Define o diretório de trabalho principal
WORKDIR /app

# Copia os arquivos do projeto (respeitando o .dockerignore)
COPY . .

# Entra na pasta do painel web e faz o build (transformando o React em HTML estático)
WORKDIR /app/dashboard
RUN npm install
RUN npm run build

# Volta para a pasta principal e instala as dependências do servidor do bot
WORKDIR /app
RUN npm install --omit=dev

# Expõe a porta 3000 para acesso externo ao painel
EXPOSE 3000

# Comando para iniciar o servidor do bot
CMD ["node", "index.js"]
