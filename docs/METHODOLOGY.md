# Methodology — Crowding Heuristics

## What we measure
**Supply-side crowding**: public evidence that independent teams are already building, launching, publishing, packaging, or releasing models related to an idea phrase.

## What we do *not* measure
- Willingness to pay  
- Total addressable market  
- Legal patent novelty  
- Founder-market fit  

## Sources & weights (v1.0)

| Source | Weight | Primary signals |
|--------|--------|-----------------|
| GitHub | 0.28 | match volume, 50+ star repos, recency |
| Hacker News | 0.18 | Show HN launches, 50+ point stories |
| Hugging Face | 0.14 | models/datasets, downloads |
| arXiv | 0.10 | phrase matches, recent papers |
| OpenAlex | 0.10 | broader scholarly works |
| npm | 0.10 | packages, recent publishes |
| PyPI | 0.10 | packages / project hits |

Failed or rate-limited sources are **excluded** from the weighted average. Coverage = fraction of sources OK.

Final score blend (v1.0):
`score = 0.65 × weightedMean + 0.35 × peakChannelSubscore`

Empty channels still lower the mean (honest “no signal there”), but a single high-traction channel (e.g. multiple 50+ star repos) cannot be diluted into a false Open lane.

## Score → verdict
| Score | Verdict |
|------:|---------|
| 0–25 | Open lane |
| 26–50 | Early movers |
| 51–75 | Crowded |
| 76–100 | Saturated |

## Confidence
`confidence ≈ 0.65 × coverage + 0.35 × agreement`  
where agreement rises when included sub-scores are less dispersed.

## Limitations
1. Keyword matching ≠ semantic identity of products  
2. Popular words inflate false positives  
3. Unauthenticated GitHub under-samples  
4. PyPI free-text is best-effort  
5. Not a scientific claim of independent invention (idea twins); it is a **crowding radar**

## Integrity rules
- No LLM-invented competitors  
- Every listed artifact must have a public URL  
- Partial failure never fabricates data  
