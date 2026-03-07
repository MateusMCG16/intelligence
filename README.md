# Intelligence Space

![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Three.js](https://img.shields.io/badge/Three.js-000000?style=for-the-badge&logo=threedotjs&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Gemini API](https://img.shields.io/badge/Gemini_API-8E75B2?style=for-the-badge&logo=google&logoColor=white)
![Groq API](https://img.shields.io/badge/Groq_API-F55036?style=for-the-badge&logo=groq&logoColor=white)
![Mistral API](https://img.shields.io/badge/Mistral_API-ff7000?style=for-the-badge&logoColor=white)

Um sistema web interativo focado na exploração e mapeamento tridimensional de conhecimento. A aplicação usa IA generativa para expandir tópicos, organiza relações em um grafo 3D e agora também oferece uma rota minimalista de leitura, onde cada assunto pode ser resumido pela IA com foco em clareza e estudo.

## O que este projeto faz

O Intelligence Space atua como uma ferramenta de expansão e organização de conhecimento. A partir de um termo ou tópico-chave especificado pelo usuário:

1. O termo é instanciado como o nó de origem em um ambiente tridimensional.
2. O servidor realiza uma inferência contextual utilizando o provedor configurado no menu de settings (**Auto**, **Gemini**, **Groq** ou **Mistral**).
3. No modo **Auto**, o sistema aplica fallback em cadeia: **Gemini → Groq → Mistral**.
4. O serviço integra a resposta em formato JSON estrito, mitigando inconsistências de formatação.
5. A malha visual gera e interliga instâncias adjacentes ao nó de origem, organizando as relações de forma autônoma e em tempo real com base em física computacional.
6. Quando o usuário acessa a rota de conhecimento, pode selecionar qualquer tópico já criado para receber um resumo curto gerado por IA, junto com pontos principais e perguntas para aprofundamento.

### Interação com os Nós

- **Clique único**: Centraliza a câmera orbital no nó selecionado, que passa a ser o ponto de rotação da cena. A transição é suavizada via interpolação linear (lerp).
- **Duplo clique**: Expande o nó, gerando novos sub-interesses via IA no idioma selecionado pelo usuário.

### Modal de Assuntos

- O botão de lista no topo abre um modal hierárquico com os tópicos já criados.
- A visualização apresenta relação pai-filho com opção de **expandir/recolher por nó**.
- Há ações globais de **Expandir tudo** e **Recolher tudo** para facilitar navegação em árvores maiores.
- O modal foi ampliado e teve a identação dos níveis refinada para facilitar leitura de ramos mais profundos.

### Rota de Conhecimento

- A aplicação possui a rota [src/app/knowledge/page.tsx](src/app/knowledge/page.tsx), acessível pelo botão de livro no topo da home.
- A interface dessa rota foi simplificada para um fluxo de leitura:
  - lista de tópicos na lateral
  - resumo principal do tópico selecionado
  - pontos principais gerados por IA
  - perguntas para explorar
  - chips com tópico pai e subtópicos
- Os resumos são gerados sob demanda e armazenados em cache local da tela para evitar chamadas repetidas desnecessárias durante a navegação.

### Resumos por IA

- A Server Action [src/app/actions.ts](src/app/actions.ts) agora também gera resumos estruturados para tópicos.
- O resumo retorna:
  - `summary`: explicação curta em 2 a 4 frases
  - `keyPoints`: 3 pontos principais
  - `questions`: 3 perguntas para aprofundamento
- O fluxo segue a mesma estratégia de fallback entre **Gemini**, **Groq** e **Mistral**.

### Proteção contra Assuntos Repetidos

- O sistema agora evita com muito mais rigor a criação de bolinhas duplicadas ou quase duplicadas.
- Foi adicionada uma camada de similaridade em [src/lib/topicSimilarity.ts](src/lib/topicSimilarity.ts), que compara tópicos por:
  - normalização de caixa alta/baixa
  - remoção de acentos
  - remoção de pontuação
  - tokens equivalentes e plural simples
  - alta similaridade textual
- A deduplicação acontece em dois pontos:
  1.  no retorno gerado pela IA, antes de enviar os tópicos ao cliente
  2.  no store global, antes de criar novos nós no espaço

### Menu de Configurações

- Seleção manual de provedor de IA (ou modo automático).
- Toggle para **Movimento das estrelas** do fundo.
- Ação para **Limpar Espaço** (remove nós e conexões atuais).

### Seletor de Idioma

A aplicação possui um menu flutuante no cabeçalho que permite ao usuário alternar entre **Português** 🇧🇷 e **Inglês** 🇺🇸. Todos os nós gerados a partir da seleção respeitam o idioma escolhido.

## Arquitetura Técnica

A arquitetura do sistema balanceia renderização gráfica assíncrona com interações de servidor restritas e de baixa latência:

- **Camada de Interface**: Fundamentado sobre Next.js (App Router), a aplicação utiliza o padrão visual _Glassmorphism_ para a interface do usuário (UI) bidimensional, que atua como overlay interativo. Abaixo desta camada, opera um contexto WebGL construído através da abstração do React Three Fiber, com otimizações de performance (pausa de simulação/render em contextos de modal).
- **Topologia de Grafo 3D**: A coordenação vetorial (x, y, z) dos nós e suas conexões são processadas por um motor de física customizado. A implementação computa forças de repulsão, atração ao centro e molas entre nós conectados, garantindo uma distribuição orgânica dos dados.
- **Controle de Câmera**: O `CameraController` encapsula o `OrbitControls` e implementa interpolação suave para transicionar o ponto focal da câmera ao nó selecionado pelo usuário, criando uma experiência de navegação cinematográfica.
- **Gerenciamento de Estado**: Estruturado por meio do `Zustand` de forma global, o sistema gerencia a hierarquia dos nós, a matriz de vizinhança, o ponto focal da câmera (`focusTarget`) e o total de tokens consumidos na sessão.
- **Integração IA Multi-Provedor**: O processamento da linguagem estruturada é restrito à rotina de Server Actions (`actions.ts`). O sistema implementa um mecanismo de fallback automático entre provedores:
  1. **Gemini** (primário) — Google Gemini 2.0 Flash
  2. **Groq** (fallback) — LLaMA 3.1 8B Instant
  3. **Mistral** (fallback) — mistral-small-latest

  Quando o provedor primário falha (erro 429, quota excedida, timeout ou qualquer erro de rede), o sistema automaticamente tenta o próximo provedor disponível.

- **Camada Anti-Duplicação**: Antes de novos nós serem criados, o sistema compara rótulos existentes e candidatos por normalização e similaridade textual, reduzindo drasticamente a chance de assuntos repetidos no grafo.

## Tecnologias Utilizadas

A pilha de ferramentas utilizada tem como finalidade estabelecer interatividade imediata, estabilidade visual em tempo real e simulações físicas fluidas.

- **Next.js & React**: Framework estrutural, responsável pelas rotas, hidratação estática/dinâmica e composição de estados.
- **React Three Fiber e Three.js**: Motores essenciais baseados em WebGL, empregados no cálculo visual dos polígonos, shaders e matriz posicional.
- **Drei (@react-three/drei)**: Utilitários focados no controle das câmeras orbitais, mapeamento ambiental e profundidade.
- **Tailwind CSS v4**: Framework CSS para estilização contida e direta da camada UI, implementando componentes translúcidos.
- **Framer Motion**: Camada secundária aplicada na atenuação de entrada e saída, vital para a responsividade perceptível bidimensional.
- **Zustand**: Gestor reativo responsável pelo store global.
- **Google Gemini API**: Modelo primário (Gemini 2.0 Flash), infraestrutura geradora que coordena o fluxo de expansão intelectual da aplicação.
- **Groq API**: Provedor de fallback (LLaMA 3.1 8B Instant), acionado automaticamente quando o provedor primário encontra limitações de cota ou falhas de conectividade.
- **Mistral API**: Provedor adicional (mistral-small-latest), disponível no fallback automático e seleção manual.
- **Heurísticas de Similaridade de Texto**: Utilizadas para deduplicação robusta de tópicos semelhantes.

## Estrutura do Projeto

```
src/
├── app/
│   ├── actions.ts           # Server Actions — expansão de tópicos + resumos por IA com fallback
│   ├── knowledge/
│   │   └── page.tsx         # Rota minimalista para ler resumos gerados por IA
│   ├── page.tsx             # Página principal com Canvas 3D e barra de busca
│   ├── layout.tsx           # Layout raiz da aplicação
│   └── globals.css          # Estilos globais
├── components/
│   ├── ThreeGraph.tsx       # Grafo 3D com nós, links e motor de física
│   ├── CameraController.tsx # Controle de câmera orbital com interpolação suave
│   ├── SubjectListModal.tsx # Modal de tópicos em árvore (pai-filho)
│   ├── SettingsMenu.tsx     # Menu de configurações (provedor, estrelas, limpar espaço)
│   └── LanguageSelector.tsx # Menu flutuante de seleção de idioma (PT/EN)
├── lib/
│   └── topicSimilarity.ts   # Normalização e deduplicação de tópicos semelhantes
└── store/
   ├── useInterestStore.ts  # Estado global: nós, links, foco da câmera e proteção contra duplicatas
   ├── useLanguageStore.ts  # Estado global: idioma selecionado
   └── useSettingsStore.ts  # Estado global: provedor IA e preferências visuais
```

## Funcionalidades Implementadas

- [x] Geração de mapa 3D de conhecimento a partir de interesses do usuário
- [x] Expansão de nós com IA via clique duplo
- [x] Foco da câmera por clique simples
- [x] Reset/centralização da câmera
- [x] Seleção manual de provedor de IA e fallback automático
- [x] Seleção de idioma PT/EN
- [x] Contador de tokens da sessão
- [x] Modal hierárquico de assuntos com expandir/recolher tudo
- [x] Modal mais largo para árvores profundas
- [x] Rota de conhecimento com layout minimalista
- [x] Resumos de tópicos gerados por IA
- [x] Pontos principais e perguntas de aprofundamento
- [x] Proteção robusta contra tópicos repetidos ou quase repetidos
- [x] Filtro e cache local de resumos na tela de conhecimento

## Observações de Uso

- O sistema reduz fortemente a chance de criar assuntos duplicados, mas ainda depende da qualidade semântica das respostas dos provedores.
- A rota de conhecimento consome tokens ao gerar resumos, assim como a expansão de tópicos no Space.
- O modo **Auto** continua sendo a melhor escolha para resiliência, pois tenta outros provedores quando o primeiro falha.

## Ambiente de Desenvolvimento

Para executar e depurar a plataforma em ambiente local, proceda com o roteiro abaixo:

1. Provisione os pacotes de dependências da aplicação utilizando seu gerenciador:
   ```bash
   npm install
   ```
2. Forneça os tokens privados dos modelos LLM. Na raiz do projeto, configure o arquivo `.env.local` com suas credenciais:

   ```env
   # API primária (recomendada)
   GEMINI_API_KEY="SUA_CHAVE_GEMINI"

   # API de fallback 1 (recomendada)
   GROQ_API_KEY="SUA_CHAVE_GROQ"

   # API de fallback 2 (opcional)
   MISTRAL_API_KEY="SUA_CHAVE_MISTRAL"
   ```

   > **Nota**: O sistema funciona com apenas uma chave configurada. Para melhor disponibilidade, recomenda-se configurar Gemini + Groq + Mistral.

3. Inicialize a instância local do servidor de desenvolvimento:
   ```bash
   npm run dev
   ```
4. Verifique a ativação do serviço acessando a porta de roteamento primária pelo navegador em: `http://localhost:3000`.
