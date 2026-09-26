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

`scripts/upstash-rest-emulator.ts` models the Upstash REST `EVAL` request/response contract our production code
uses - the fixed-window admission script and the rolling-window irrevocable token-reservation script -
with **server-side time** (so app clock skew cannot widen a budget) and fault injection
(`off | error | malformed | down`).

## Fail-closed guarantees (asserted in tests)

- A loopback URL is accepted **only** when `ALLOW_LOOPBACK_REDIS=true` **and** `NODE_ENV !== production`.
- In production, any non-`https://` limiter endpoint returns `unavailable`, which fails the request closed.
- Non-loopback plain HTTP is refused even with the opt-in set.
- Injected 5xx, malformed JSON and dropped sockets all resolve to `unavailable`, never to `ok`.
- 100 concurrent admissions against the emulator admit exactly the window size (80), never more.

## 1.5.1: execute the Lua, not only a reimplementation

The emulator is a contract double: it **does not execute Lua**, so it cannot prove script syntax,
Redis command semantics or cluster behavior. The previous server-time claim was also incomplete:
scan admission selected buckets with the app clock; only token reservations used Redis TIME.
Admission now derives fixed-window buckets inside Lua from Redis TIME and stores bucket/count hashes
under one cluster hash tag. Fixed windows can still admit two windows' quota across a boundary;
this is not a rolling 400-unit guarantee.

CI starts Redis 7 and runs `tests/redis-lua.test.ts` against the exact exported production scripts:
100 concurrent admissions → 80 accepted; shared global ceiling 400; stale-window rollover;
30 concurrent token reservations → 10 accepted; expired reservations pruned; TTLs present.
Locally start an isolated Redis, then run `REDIS_TEST_PORT=6379 npm test` (requires redis-cli).
Without that opt-in the Redis integration test is explicitly skipped, never silently passed.
This complements HTTP fault injection; it does not certify a provisioned Upstash deployment.

### Migration / rollback
The new hashes use `si:quota:v2:{admission}:*` to avoid WRONGTYPE against v1 string keys.
**Do not overlap v1 and v2 traffic:** their quotas are independent. Pause admission at the edge,
drain old instances, wait a full 10-minute window, promote all instances, then resume. A rollback
requires the same pause/drain/window procedure. Old keys expire automatically; do not flush a
shared Redis database. This deployment is currently per-instance; do the migration drill in
staging before enabling distributed production limits.
