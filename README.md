
# Api de Consumo de Agua e Gas

Esta API é responsável por gerenciar leituras de consumo de água e gás, processando imagens enviadas pelo usuário e utilizando a API Gemini para extrair as medições. A API armazena essas medições em um banco de dados temporário na memória.

## Funcionalidades

- **Upload de Imagem**: Enviar uma imagem contendo a medição, que será processada para extrair o valor da leitura.
- **Confirmação de Medição**: Confirmar uma medição já existente com um valor informado pelo usuário.
- **Listagem de Medições**: Listar todas as medições realizadas por um cliente específico, com a opção de filtrar por tipo de medição (água ou gás).

## Pré-requisitos

- **Docker**: Certifique-se de ter o Docker e o Docker Compose instalados em sua máquina.
- **Chave da API Gemini**: Antes de iniciar o contêiner, é necessário definir a variável de ambiente `GEMINI_API_KEY` com a chave da API Gemini. Essa chave é utilizada para acessar o serviço de processamento de imagem da API Gemini.

## Configuração

1. **Obtenha a Chave da API Gemini**:

   - Cadastre-se e obtenha sua chave de API na [Google Cloud Platform](https://cloud.google.com).

2. **Defina a variável de ambiente**:
   - Crie um arquivo `.env` no diretório raiz do projeto com o seguinte conteúdo:
     ```env
     GEMINI_API_KEY=YOUR_GEMINI_API_KEY_HERE
     ```

## Como Executar

1. **Clonar o repositório**:
   ```bash
   git clone https://github.com/seu-usuario/measurement-api.git
   cd measurement-api
   ```


2. **Iniciar o Docker Compose**:

   - No diretório raiz do projeto, execute o seguinte comando para iniciar a aplicação:
     ```bash
     docker-compose up --build
     ```

3. **Testar a API**:
   - Após a inicialização, a API estará disponível em `http://localhost:3000`.

## Endpoints

- **POST `/upload`**: Enviar uma imagem contendo a medição para processamento.
- **PATCH `/confirm`**: Confirmar uma medição existente com um valor específico.
- **GET `/<customer_code>/list`**: Listar todas as medições de um cliente específico, com a opção de filtrar por tipo de medição.

## Exemplo de Uso

### Upload de Imagem

```bash
curl -X POST http://localhost:3000/upload \
-F "image=@/path/to/your/image.png" \
-H "Content-Type: multipart/form-data" \
-d '{"customer_code": "1234", "measure_datetime": "2024-08-30T10:00:00Z", "measure_type": "WATER"}'
```

### Confirmar Medição

```bash
curl -X PATCH http://localhost:3000/confirm \
-H "Content-Type: application/json" \
-d '{"measure_uuid": "uuid-aqui", "confirmed_value": 12345}'
```

### Listar Medições

```bash
curl -X GET http://localhost:3000/1234/list?measure_type=WATER
```

## Considerações Finais

Essa API foi desenvolvida para facilitar a leitura e confirmação de consumos de água e gás utilizando tecnologias modernas como o Google Generative AI e Docker. Certifique-se de configurar corretamente a variável de ambiente antes de iniciar o sistema.


