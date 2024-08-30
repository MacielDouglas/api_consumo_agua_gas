# Use a imagem base do Node.js
FROM node:18

# Defina o diretório de trabalho no contêiner
WORKDIR /usr/src/app

# Copie os arquivos package.json e package-lock.json
COPY package*.json ./

# Instale as dependências
RUN npm install

# Copie o código do projeto
COPY . .

# Compile o TypeScript
RUN npm run build

# Exponha a porta da aplicação
EXPOSE 3000

# Defina o comando para iniciar a aplicação
CMD [ "node", "dist/index.js" ]
