# Intelligence Space

![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Three.js](https://img.shields.io/badge/Three.js-000000?style=for-the-badge&logo=threedotjs&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Groq API](https://img.shields.io/badge/Groq_API-F55036?style=for-the-badge&logo=groq&logoColor=white)

Sistema web interativo para exploracao e mapeamento tridimensional de conhecimento. A aplicacao usa a API da Groq para expandir topicos, organiza relacoes em um grafo 3D e oferece uma rota de leitura com resumos estruturados gerados por IA.

## O que este projeto faz

O Intelligence Space funciona como um mapa mental 3D com expansao por IA. A partir de um termo informado pelo usuario:

1. O termo e criado como node raiz no espaco tridimensional.
2. O servidor chama a Groq para gerar subtopicos relacionados.
3. A resposta da IA deve vir como JSON estrito.
4. O sistema remove topicos duplicados ou muito parecidos.
5. Os novos topicos sao adicionados como nodes filhos.
6. O grafo 3D reorganiza visualmente os nodes em tempo real.
7. A rota `/knowledge` permite selecionar topicos criados e gerar resumos de estudo.

## Interacao com os nodes

- Clique unico: foca a camera no node selecionado.
- Duplo clique: expande o node usando a Groq para gerar novos subtopicos.
- Botao de alvo: recentraliza a camera no centro do espaco.

## Modal de assuntos

O botao de lista abre um modal hierarquico com todos os topicos criados.

Recursos:

- Visualizacao pai-filho.
- Expandir/recolher por node.
- Expandir tudo.
- Recolher tudo.
- Snapshot dos nodes no momento de abertura do modal.
- Pausa da simulacao 3D enquanto o modal esta aberto.

## Rota de conhecimento

Arquivo: `src/app/knowledge/page.tsx`

A rota `/knowledge` transforma os topicos do grafo em uma interface de leitura.

Ela possui:

- Lista lateral de topicos.
- Filtro por texto.
- Breadcrumb do topico selecionado.
- Resumo gerado por IA.
- 3 pontos principais.
- 3 perguntas para aprofundamento.
- Topico pai.
- Subtopicos diretos.

Os resumos ficam em cache local da tela durante a navegacao, evitando chamadas repetidas para o mesmo topico e idioma.

## Provedor de IA

O projeto usa apenas a Groq.

Modelo configurado no codigo:

```txt
llama-3.1-8b-instant
```

Nao ha mais suporte a outros provedores ou fallback automatico.

Variavel de ambiente necessaria:

```env
GROQ_API_KEY=sua_chave_groq_aqui
```

## Arquitetura tecnica

A arquitetura e dividida em quatro camadas principais:

1. Rotas e interface: `src/app`
2. Componentes visuais: `src/components`
3. Estado global: `src/store`
4. Logica auxiliar: `src/lib`

## Estrutura do projeto

```txt
src/
├── app/
│   ├── actions.ts
│   ├── globals.css
│   ├── icon.svg
│   ├── layout.tsx
│   ├── page.tsx
│   └── knowledge/
│       └── page.tsx
├── components/
│   ├── CameraController.tsx
│   ├── LanguageSelector.tsx
│   ├── ParticleField.tsx
│   ├── SettingsMenu.tsx
│   ├── SubjectListModal.tsx
│   └── ThreeGraph.tsx
├── lib/
│   └── topicSimilarity.ts
└── store/
    ├── useInterestStore.ts
    ├── useLanguageStore.ts
    └── useSettingsStore.ts
```

## Arquivos principais

| Arquivo | Responsabilidade |
| --- | --- |
| `src/app/page.tsx` | Tela principal com Canvas 3D, busca e controles |
| `src/app/knowledge/page.tsx` | Tela de leitura e resumos por IA |
| `src/app/actions.ts` | Server Actions e integracao com Groq |
| `src/components/ThreeGraph.tsx` | Renderizacao do grafo 3D, fisica, foco e expansao |
| `src/components/CameraController.tsx` | Controle suave da camera com OrbitControls |
| `src/components/SubjectListModal.tsx` | Modal hierarquico de topicos |
| `src/components/SettingsMenu.tsx` | Configuracoes visuais e status da Groq |
| `src/components/LanguageSelector.tsx` | Seletor PT/EN |
| `src/store/useInterestStore.ts` | Estado global do grafo |
| `src/store/useLanguageStore.ts` | Estado global do idioma |
| `src/store/useSettingsStore.ts` | Estado global das configuracoes |
| `src/lib/topicSimilarity.ts` | Normalizacao e deduplicacao de topicos |

## Fluxo de criacao de topicos

```txt
Usuario digita um topico
  -> src/app/page.tsx
  -> useInterestStore.addNode
  -> src/app/actions.ts / generateSubInterests
  -> Groq
  -> parse JSON
  -> dedupeTopics
  -> useInterestStore.addNodes
  -> ThreeGraph renderiza nodes e links
```

## Fluxo de expansao por duplo clique

```txt
Usuario da duplo clique em um node
  -> ThreeGraph.handleExpand
  -> generateSubInterests
  -> Groq
  -> addNodes com parentId do node clicado
  -> link pai-filho criado
  -> simulacao 3D reposiciona o grafo
```

## Fluxo de resumo

```txt
Usuario abre /knowledge
  -> seleciona um topico
  -> summarizeTopic recebe topico + contexto
  -> Groq gera JSON estruturado
  -> tela mostra summary, keyPoints e questions
  -> resultado fica em cache local da pagina
```

## Estado global

O projeto usa Zustand com persistencia no navegador.

Stores:

- `useInterestStore`: nodes, links, foco da camera e tokens.
- `useLanguageStore`: idioma atual (`pt` ou `en`).
- `useSettingsStore`: preferencia de movimento das estrelas.

O projeto nao usa banco de dados. Os dados do grafo ficam no `localStorage`.

## Renderizacao 3D

O grafo usa React Three Fiber e Three.js.

Principais tecnicas:

- `instancedMesh` para renderizar nodes com melhor performance.
- `lineSegments` para conexoes.
- `BufferGeometry` para atualizar links.
- Simulacao fisica customizada com repulsao, atracao central e forca de mola.
- Labels com `Text` e `Billboard`.
- `Bloom` para brilho.
- `Stars` como fundo espacial.

## Protecao contra duplicatas

Arquivo: `src/lib/topicSimilarity.ts`

A deduplicacao compara labels por:

- caixa baixa
- remocao de acentos
- remocao de pontuacao
- normalizacao de espacos
- plural simples
- assinatura de tokens
- coeficiente de Dice por bigrams

A protecao acontece em dois pontos:

1. Depois da resposta da Groq, ainda no servidor.
2. Antes de criar nodes no Zustand.

## Variaveis de ambiente

Crie um arquivo `.env.local` na raiz:

```env
GROQ_API_KEY="SUA_CHAVE_GROQ"
```

## Scripts disponiveis

```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint"
}
```

## Como executar localmente

1. Instale as dependencias:

```bash
npm install
```

2. Configure `.env.local`:

```env
GROQ_API_KEY="SUA_CHAVE_GROQ"
```

3. Inicie o servidor de desenvolvimento:

```bash
npm run dev
```

4. Acesse:

```txt
http://localhost:3000
```

## Observacoes

- A aplicacao depende da chave `GROQ_API_KEY` para gerar subtopicos e resumos.
- Sem essa chave, a interface abre, mas as chamadas de IA falham.
- O mapa e salvo no navegador via `localStorage`.
- A rota `/knowledge` depende dos topicos ja criados no grafo.
- O projeto nao usa mais outros provedores ou fallback automatico.
