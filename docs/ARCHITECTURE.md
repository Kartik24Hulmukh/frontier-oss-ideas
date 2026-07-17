# Architecture — Lightweight by design

## Goals
- <1s perceived UI feedback; <8s source timeouts  
- Partial failure OK  
- Stateless compute; optional cache layer  
- Adapters swappable without UI rewrite  

## Request path

```
POST /api/search { query }
        │
        ▼
  normalizeQuery()
        │
        ▼
  Promise.allSettled([ adapters... ])
        │
        ▼
  normalize → SourceResult[]
        │
        ▼
  computeCrowding() → score, confidence, breakdown
        │
        ▼
  computeWedges() → open wedges
        │
        ▼
  buildCapsule() → portable evidence JSON
        │
        ▼
  CrowdingResult response
```

## Modules

| Module | Responsibility |
|--------|----------------|
| `lib/core/normalize.ts` | Query cleanup, hash |
| `lib/core/fetch.ts` | Timeout fetch helper |
| `lib/sources/*` | One file per adapter |
| `lib/sources/index.ts` | Registry |
| `lib/scoring/score.ts` | Sub-scores + weights |
| `lib/scoring/wedge.ts` | Open wedge heuristics |
| `lib/scoring/capsule.ts` | Export package |
| `lib/types.ts` | Shared types |

## Adapter contract

```ts
type SourceAdapter = (query: string, ctx: AdapterContext) => Promise<SourceResult>
```

Each adapter returns `ok | error | rate_limited` — never throws to caller.

## Security / abuse
- Query max length 120  
- Server-side only for tokens  
- No user-controlled URL fetch  
- Rate limit at edge (P1)  

## Deploy
- Vercel / Node Next.js  
- Env: `NEXT_PUBLIC_SITE_URL`, `GITHUB_TOKEN`, `OPENALEX_API_KEY`, `OPENALEX_MAILTO`  
- Alpha label until reliability SLOs met  
