# Intelligence Space

![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Three.js](https://img.shields.io/badge/Three.js-000000?style=for-the-badge&logo=threedotjs&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Gemini API](https://img.shields.io/badge/Gemini_API-8E75B2?style=for-the-badge&logo=google&logoColor=white)
![Groq API](https://img.shields.io/badge/Groq_API-F55036?style=for-the-badge&logo=groq&logoColor=white)

Um sistema web interativo focado na exploração e mapeamento tridimensional de dados, projetado para visualizar áreas de interesse por meio de uma interface imersiva. Utilizando processamento de linguagem natural e IA generativa, a aplicação estrutura conexões cognitivas e as apresenta de forma dinâmica como uma rede neural abstrata e expansiva.

## O que este projeto faz

O Intelligence Space atua como uma ferramenta analítica de mapeamento de conhecimento. A partir de um termo ou tópico-chave especificado pelo usuário:
1. O termo é instanciado como o nó de origem em um ambiente tridimensional.
2. O servidor realiza uma inferência contextual consultando o modelo Gemini 2.0 Flash. Caso o Gemini falhe ou atinja o limite de cota, o sistema automaticamente recorre ao Groq (LLaMA 3.1 8B Instant) como provedor de fallback.
3. O serviço integra a resposta em formato JSON estrito, mitigando inconsistências de formatação.
4. A malha visual gera e interliga instâncias adjacentes ao nó de origem, organizando as relações de forma autônoma e em tempo real, baseada em algoritmos de física computacional.

### Interação com os Nós

- **Clique único**: Centraliza a câmera orbital no nó selecionado, que passa a ser o ponto de rotação da cena. A transição é suavizada via interpolação linear (lerp).
- **Duplo clique**: Expande o nó, gerando novos sub-interesses via IA no idioma selecionado pelo usuário.

### Seletor de Idioma

A aplicação possui um menu flutuante no cabeçalho que permite ao usuário alternar entre **Português** 🇧🇷 e **Inglês** 🇺🇸. Todos os nós gerados a partir da seleção respeitam o idioma escolhido.

## Arquitetura Técnica

A arquitetura do sistema balanceia renderização gráfica assíncrona com interações de servidor restritas e de baixa latência:

- **Camada de Interface**: Fundamentado sobre Next.js (App Router), a aplicação utiliza o padrão visual *Glassmorphism* para a interface do usuário (UI) bidimensional, que atua como overlay interativo. Abaixo desta camada, opera um contexto WebGL construído através da abstração do React Three Fiber, responsável por instanciar a cena de forma contínua.
- **Topologia de Grafo 3D**: A coordenação vetorial (x, y, z) dos nós e suas conexões são processadas por um motor de física customizado. A implementação computa forças de repulsão, atração ao centro e molas entre nós conectados, garantindo uma distribuição orgânica dos dados.
- **Controle de Câmera**: O `CameraController` encapsula o `OrbitControls` e implementa interpolação suave para transicionar o ponto focal da câmera ao nó selecionado pelo usuário, criando uma experiência de navegação cinematográfica.
- **Gerenciamento de Estado**: Estruturado por meio do `Zustand` de forma global, o sistema gerencia a hierarquia dos nós, a matriz de vizinhança e o ponto focal da câmera (`focusTarget`). Isso garante total sincronia isolada da frequência de atualização (framerates) dos callbacks visuais.
- **Integração IA Multi-Provedor**: O processamento da linguagem estruturada é restrito à rotina de Server Actions (`actions.ts`). O sistema implementa um mecanismo de fallback automático entre provedores:
  1. **Gemini** (primário) — Google Gemini 2.0 Flash
  2. **Groq** (fallback) — LLaMA 3.1 8B Instant
  
  Quando o provedor primário falha (erro 429, quota excedida, timeout ou qualquer erro de rede), o sistema automaticamente tenta o próximo provedor disponível.

## Tecnologias Utilizadas

A pilha de ferramentas utilizada tem como finalidade estabelecer interatividade imediata, estabilidade visual em tempo real e simulações físicas fluidas.

* **Next.js & React**: Framework estrutural, responsável pelas rotas, hidratação estática/dinâmica e composição de estados.
* **React Three Fiber e Three.js**: Motores essenciais baseados em WebGL, empregados no cálculo visual dos polígonos, shaders e matriz posicional.
* **Drei (@react-three/drei)**: Utilitários focados no controle das câmeras orbitais, mapeamento ambiental e profundidade.
* **Tailwind CSS v4**: Framework CSS para estilização contida e direta da camada UI, implementando componentes translúcidos.
* **Framer Motion**: Camada secundária aplicada na atenuação de entrada e saída, vital para a responsividade perceptível bidimensional.
* **Zustand**: Gestor reativo responsável pelo store global.
* **Google Gemini API**: Modelo primário (Gemini 2.0 Flash), infraestrutura geradora que coordena o fluxo de expansão intelectual da aplicação.
* **Groq API**: Provedor de fallback (LLaMA 3.1 8B Instant), acionado automaticamente quando o provedor primário encontra limitações de cota ou falhas de conectividade.

## Estrutura do Projeto

```
src/
├── app/
│   ├── actions.ts          # Server Actions — lógica de IA com fallback Gemini → Groq
│   ├── page.tsx             # Página principal com Canvas 3D e barra de busca
│   ├── layout.tsx           # Layout raiz da aplicação
│   └── globals.css          # Estilos globais
├── components/
│   ├── ThreeGraph.tsx       # Grafo 3D com nós, links e motor de física
│   ├── CameraController.tsx # Controle de câmera orbital com interpolação suave
│   └── LanguageSelector.tsx # Menu flutuante de seleção de idioma (PT/EN)
└── store/
    ├── useInterestStore.ts  # Estado global: nós, links e foco da câmera
    └── useLanguageStore.ts  # Estado global: idioma selecionado
```

## To Do

- [x] ~~Mudar Título da página~~
- [x] ~~Implementar para utilizar APIs de outros fornecedores (focar no Groq)~~
- [x] ~~Seletor de idioma (Português / Inglês)~~
- [x] ~~Single click para focar câmera / Double click para expandir~~
- [x] ~~Aumentar limite de exibição de texto dos nós para 35 caracteres~~
- [x] ~~Evitar geração de nós repetidos pela IA (passar contexto de nós já existentes)~~
- [x] ~~Adicionar botão (Target) para centralizar e resetar a câmera no ponto de origem~~

## Ambiente de Desenvolvimento

Para executar e depurar a plataforma em ambiente local, proceda com o roteiro abaixo:

1. Provisione os pacotes de dependências da aplicação utilizando seu gerenciador:
   ```bash
   npm install
   ```
2. Forneça os tokens privados dos modelos LLM. Na raiz do projeto, configure o arquivo `.env.local` com suas credenciais:
   ```env
   # API primária (obrigatória)
   GEMINI_API_KEY="SUA_CHAVE_GEMINI"

   # API de fallback (recomendada)
   # Crie sua chave grátis em: https://console.groq.com/keys
   GROQ_API_KEY="SUA_CHAVE_GROQ"
   ```
   > **Nota**: O sistema funciona com apenas uma das chaves configurada. A chave do Groq é recomendada para garantir alta disponibilidade quando o Gemini atinge limites de cota.

3. Inicialize a instância local do servidor de desenvolvimento:
   ```bash
   npm run dev
   ```
4. Verifique a ativação do serviço acessando a porta de roteamento primária pelo navegador em: `http://localhost:3000`.
