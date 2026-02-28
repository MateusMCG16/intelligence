# Intelligence Space

![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Three.js](https://img.shields.io/badge/Three.js-000000?style=for-the-badge&logo=threedotjs&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Gemini API](https://img.shields.io/badge/Gemini_API-8E75B2?style=for-the-badge&logo=google&logoColor=white)

Um sistema web interativo focado na exploração e mapeamento tridimensional de dados, projetado para visualizar áreas de interesse por meio de uma interface imersiva. Utilizando processamento de linguagem natural e IA generativa, a aplicação estrutura conexões cognitivas e as apresenta de forma dinâmica como uma rede neural abstrata e expansiva.

## O que este projeto faz

O Intelligence Space atua como uma ferramenta analítica de mapeamento de conhecimento. A partir de um termo ou tópico-chave especificado pelo usuário:
1. O termo é instanciado como o nó de origem em um ambiente tridimensional.
2. O servidor realiza uma inferência contextual consultando o modelo Gemini 2.5 Flash, solicitando os conceitos mais relevantes e correlacionados ao termo base.
3. O serviço integra a resposta em formato JSON estrito, mitigando inconsistências de formatação.
4. A malha visual gera e interliga instâncias adjacentes ao nó de origem, organizando as relações de forma autônoma e em tempo real, baseada em algoritmos de física computacional.

## Arquitetura Técnica

A arquitetura do sistema balanceia renderização gráfica assíncrona com interações de servidor restritas e de baixa latência:

- **Camada de Interface**: Fundamentado sobre Next.js (App Router), a aplicação utiliza o padrão visual *Glassmorphism* para a interface do usuário (UI) bidimensional, que atua como overlay interativo. Abaixo desta camada, opera um contexto WebGL construído através da abstração do React Three Fiber, responsável por instanciar a cena de forma contínua.
- **Topologia de Grafo 3D**: A coordenação vetorial (x, y, z) dos nós e suas conexões interpessoais são processadas utilizando a robusta biblioteca `d3-force-3d`. Esta implementação computa matrizes complexas determinando comportamentos de atrações de mola e repulsões por proximidade, garantindo uma distribuição orgânica dos dados.
- **Gerenciamento de Estado**: Estruturado por meio do `Zustand` de forma global, o sistema gerencia a hierarquia dos nós e a matriz de vizinhança na persistência local. Isso garante total sincronia isolada da frequência de atualização (framerates) dos callbacks visuais.
- **Integração IA e Backend**: O processamento da linguagem estruturada é restrito à rotina de Server Actions (`actions.ts`). O módulo SDK da Google processa o bloco analítico diretamente no servidor (Node.js), prevenindo latências desnecessárias do lado cliente e garantindo a ocultação das chaves de integração.

## Tecnologias Utilizadas

A pilha de ferramentas utilizada tem como finalidade estabelecer interatividade imediata, estabilidade visual em tempo real e simulações físicas fluidas.

* **Next.js & React**: Framework estrutural, responsável pelas rotas, hidratação estática/dinâmica e composição de estados.
* **React Three Fiber e Three.js**: Motores essenciais baseados em WebGL, empregados no cálculo visual dos polígonos, shaders e matriz posicional.
* **Drei (@react-three/drei)**: Utilitários focados no controle das câmeras orbitais, mapeamento ambiental e profundidade.
* **d3-force-3d**: Biblioteca de matemática computacional dedicada à resolução contínua de auto-intersecção e forças dos grafos interligados.
* **Tailwind CSS v4**: Framework CSS para estilização contida e direta da camada UI, implementando componentes translúcidos.
* **Framer Motion**: Camada secundária aplicada na atenuação de entrada e saída, vital para a responsividade perceptível bidimensional.
* **Zustand**: Gestor reativo responsável pelo store global.
* **Google Gemini API**: Modelo base (Gemini 2.5 Flash), infraestrutura geradora que coordena o fluxo de expansão intelectual da aplicação.

## Ambiente de Desenvolvimento

Para executar e depurar a plataforma em ambiente local, proceda com o roteiro abaixo:

1. Provisione os pacotes de dependências da aplicação utilizando seu gerenciador:
   ```bash
   npm install
   ```
2. Forneça o token privado do modelo LLM. Na raiz do projeto, configure o arquivo `.env.local` e defina sua credencial gerada via plataforma Google Cloud:
   ```env
   GEMINI_API_KEY="SUA_CHAVE_AQUI"
   ```
3. Inicialize a estância local do servidor de desenvolvimento:
   ```bash
   npm run dev
   ```
4. Verifique a ativação do serviço acessando a porta de roteamento primária pelo navegador em: `http://localhost:3000`.
