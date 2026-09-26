# Verifiable distributed limits without a cloud credential (PM2)

The strict release gate refuses to promote a build whose admission control is `per-instance`.
That is correct - per-instance quotas are trivially multiplied by autoscaling - but it used to mean
the gate could only ever be verified by someone holding an Upstash credential. Everyone else had to
take our word for it, or loosen the gate. Both are launch-killers.

So the limiter contract is now executable by anyone:

```
npm run redis:loopback -- 8099
export UPSTASH_REDIS_REST_URL=http://127.0.0.1:8099
export UPSTASH_REDIS_REST_TOKEN=loopback-dev-token
export ALLOW_LOOPBACK_REDIS=true     # refused in production, always
npm test                              # tests/distributed-loopback.test.ts exercises the real code path
```

`scripts/upstash-rest-emulator.ts` speaks the exact Upstash REST `EVAL` contract our production code
uses - the fixed-window admission script and the rolling-window irrevocable token-reservation script -
with **server-side time** (so app clock skew cannot widen a budget) and fault injection
(`off | error | malformed | down`).

## Fail-closed guarantees (asserted in tests)

- A loopback URL is accepted **only** when `ALLOW_LOOPBACK_REDIS=true` **and** `NODE_ENV !== production`.
- In production, any non-`https://` limiter endpoint returns `unavailable`, which fails the request closed.
- Non-loopback plain HTTP is refused even with the opt-in set.
- Injected 5xx, malformed JSON and dropped sockets all resolve to `unavailable`, never to `ok`.
- 100 concurrent admissions against the emulator admit exactly the window size (80), never more.
