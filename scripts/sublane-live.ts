import { scanIdea } from '../lib/scan'
const q = process.argv[2] ?? 'AI code review'
scanIdea(q).then((r) => {
  console.log(JSON.stringify({ query: r.query, score: r.score, verdict: r.verdict, sources: r.sources.map((s) => `${s.source}:${s.status}:${s.items.length}`), subLanes: r.subLanes }, null, 2))
}).catch((e) => { console.error(e); process.exit(1) })
