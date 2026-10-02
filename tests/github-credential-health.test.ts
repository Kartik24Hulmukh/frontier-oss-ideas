import { test, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { searchGitHub, githubCredentialStatus, __resetGitHubCredentialForTests } from '../lib/sources/github'
import { __resetSourceHealthForTests } from '../lib/core/pace'
const realFetch = globalThis.fetch
afterEach(() => { globalThis.fetch = realFetch; __resetGitHubCredentialForTests(); __resetSourceHealthForTests() })
test('credential presence is not acceptance; observations do not transfer to a rotated token', async () => {
  assert.equal(githubCredentialStatus('token-a'), 'configured-unverified')
  globalThis.fetch = (async () => Response.json({ total_count: 0, items: [] })) as typeof fetch
  await searchGitHub('test', { githubToken: 'token-a' })
  assert.equal(githubCredentialStatus('token-a'), 'accepted')
  assert.equal(githubCredentialStatus('token-b'), 'configured-unverified')
  assert.equal(githubCredentialStatus(''), 'absent-anonymous')
})
test('401 followed by successful anonymous fallback never labels the token accepted', async () => {
  globalThis.fetch = (async (_url, init) => new Headers(init?.headers).has('Authorization') ? new Response('', { status: 401 }) : Response.json({ total_count: 0, items: [] })) as typeof fetch
  const result = await searchGitHub('test', { githubToken: 'rejected-token' })
  assert.equal(result.status, 'ok')
  assert.equal(githubCredentialStatus('rejected-token'), 'rejected-anonymous-fallback')
  assert.doesNotMatch(JSON.stringify(result), /rejected-token/)
})
test('network failure does not certify a configured credential', async () => {
  globalThis.fetch = (async () => { throw new TypeError('offline') }) as typeof fetch
  await searchGitHub('test', { githubToken: 'unverified' })
  assert.equal(githubCredentialStatus('unverified'), 'configured-unverified')
})
