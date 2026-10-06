# Methodology — Crowding Heuristics

## What we measure
**Supply-side crowding**: related public artifacts: repositories, launches, papers, packages, models and datasets. Matches are not a count of unique teams or independent inventions.

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
| npm | 0.08 | packages, recent publishes |
| PyPI | 0.08 | packages / project hits |
| crates.io | 0.04 | Rust crates, recent maintenance |

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
`confidence ≈ (0.65 × coverage + 0.35 × agreement) × min(1, qualifiedItems / 8) × min(1, qualifiedSources / 3)`
where agreement rises when included sub-scores are less dispersed. Confidence is forced to **zero** with no qualified supply evidence. This proxy is not a calibrated probability.

## Relevance and usable totals (crowding-1.3)
Below-threshold audit-floor items remain inspectable but cannot support scoring, sub-lane estimates or recommendations. With a partially qualified sample:
`usable = min(raw × qualified / sampled, qualified × (1 + log10(1 + raw / sampled)))`.
An empty inspectable sample contributes zero usable total. Fully qualified samples preserve the raw total. The bound remains uncalibrated; see `METHODOLOGY_CROWDING_1_3.md`. Healthy comparison adapters are required before ecosystem-asymmetry recommendations.

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

Market quadrants abstain when supply confidence proxy is below 50% or fewer than two of the three demand adapters respond (coverage below 67%). These are conservative, uncalibrated safeguards, not validity guarantees. Demand relevance/time-window qualification remains a launch blocker. Exported supply links and analyst references contain qualified observations only; full scan source sections retain audit-floor items.
