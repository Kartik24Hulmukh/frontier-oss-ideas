import { test } from 'node:test'
import assert from 'node:assert/strict'
import { filterSourcesByRelevance, semanticRelevance } from '../lib/scoring/semantic-filter'
import { computeCrowding, qualifiedTotal } from '../lib/scoring/score'
import type { EvidenceItem, SourceResult } from '../lib/types'
const item = (title: string, description = ''): EvidenceItem => ({ title, description, url: 'https://example.org/' + encodeURIComponent(title), date: null, meta: null })
test('generic AI weather evidence cannot revive maximum confidence for code review', () => {
 const sources: SourceResult[] = ['github','npm','arxiv'].map((source, i) => ({source: source as SourceResult['source'], label: source, status: 'ok', totalCount: 1_000_000, items: Array.from({length:3}, (_,j) => item(`AI weather model ${i} sample ${j}`))}))
 const r = computeCrowding('AI code review agent', filterSourcesByRelevance(sources, 'AI code review agent'))
 assert.equal(r.confidence,0); assert.equal(r.score,0); assert.deepEqual(r.capsule.evidenceLinks,[])
})
test('specific anchors preserve workflows and synonyms, reject body dumps and generic queries', () => {
 for(const title of ['AI code review agent','Automated developer code audit','Code reviewer']) assert.ok(semanticRelevance('AI code review agent',item(title))>=0.18,title)
 for(const title of ['AI weather model','Restaurant reviews','AI coding agent']) assert.equal(semanticRelevance('AI code review agent',item(title)),0,title)
 assert.equal(semanticRelevance('AI code review agent',item('Weather forecast','AI code review agent code audit developer')),0)
 assert.equal(semanticRelevance('AI agent',item('AI agent')),0)
 assert.equal(semanticRelevance('中文',item('Weather forecast')),0)
})
test('fully qualified sample bound has no million-count discontinuity', () => {
 const src = (n:number):SourceResult => ({source:'npm',label:'npm',status:'ok',totalCount:1_000_000,items:[],relevanceFilter:{before:10,after:n,qualified:n,threshold:0.18}})
 assert.ok(qualifiedTotal(src(10)) < 100)
 assert.ok(qualifiedTotal(src(10))/qualifiedTotal(src(9)) < 1.12)
})

test('workflow aliases preserve PR/diff review while explicit contradictions abstain',()=>{
 for(const [title,description] of [['Automated PR reviewer','Uses an LLM to inspect pull-request diffs and post findings'],['GitHub review bot','LLM examines code changes for bugs'],['Patch inspector','Language model evaluates merge-request diffs for defects']]) assert.ok(semanticRelevance('AI code review agent',item(title,description))>=0.18,title)
 assert.equal(semanticRelevance('AI code review agent',item('Code of conduct review assistant','Reviews community policies')),0)
 assert.equal(semanticRelevance('AI code review agent',item('AI code review agent','This weather project does not review code')),0)
})
