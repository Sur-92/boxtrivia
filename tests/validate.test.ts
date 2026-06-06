// Standalone smoke test for the authoring guardrails. Run with:
//   node --test tests/validate.test.ts        (Node 23+ runs TS natively)
// or: npm test
//
// Exercises every reject rule, the warn-only rule, and confirms the
// shipped "Early 2000s Pop Animals" board passes strict validation.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { validateSeed } from '../src/main/validate.ts'

const here = dirname(fileURLToPath(import.meta.url))

const good = {
  title: 'Two-by-Two Demo',
  categories: [
    { name: 'Colors', clues: [
      { value: 200, clue: 'The color of a clear daytime sky.', response: 'What is blue?' },
      { value: 400, clue: 'Blue plus yellow.', response: 'What is green?' }
    ]},
    { name: 'Numbers', clues: [
      { value: 200, clue: 'Sides on a triangle.', response: 'What is three?' },
      { value: 400, clue: 'A baker’s dozen.', response: 'What is thirteen?' }
    ]}
  ]
}

test('a clean board passes with no errors or warnings', () => {
  const r = validateSeed(good)
  assert.deepEqual(r.errors, [])
  assert.deepEqual(r.warnings, [])
  assert.ok(r.seed)
})

test('the bundled Early 2000s Pop Animals board passes strict', () => {
  const raw = JSON.parse(readFileSync(join(here, '../games/early-2000s-pop-animals.json'), 'utf-8'))
  const r = validateSeed(raw)
  assert.deepEqual(r.errors, [], r.errors.join('\n'))
  assert.deepEqual(r.warnings, [], r.warnings.join('\n'))
})

test('Rule 6: non-uniform value ladder is rejected', () => {
  const bad = structuredClone(good)
  bad.categories[1].clues[1].value = 999
  const r = validateSeed(bad)
  assert.ok(r.errors.some((e) => e.startsWith('Rule 6')), r.errors.join('\n'))
})

test('Rule 5: duplicate value in a category is rejected', () => {
  const bad = structuredClone(good)
  bad.categories[0].clues[1].value = 200
  const r = validateSeed(bad)
  assert.ok(r.errors.some((e) => e.startsWith('Rule 5')))
})

test('Rule 8: duplicate clue text is rejected', () => {
  const bad = structuredClone(good)
  bad.categories[1].clues[0].clue = 'The color of a clear daytime sky.'
  const r = validateSeed(bad)
  assert.ok(r.errors.some((e) => e.startsWith('Rule 8')))
})

test('Rule 4: non-integer value is rejected', () => {
  const bad = structuredClone(good)
  // @ts-expect-error intentionally bad
  bad.categories[0].clues[0].value = 'free'
  const r = validateSeed(bad)
  assert.ok(r.errors.some((e) => e.startsWith('Rule 4')))
})

test('Rules 1 + 2: missing title and too few categories collected together', () => {
  const r = validateSeed({ categories: [good.categories[0]] })
  assert.ok(r.errors.some((e) => e.startsWith('Rule 1')))
  assert.ok(r.errors.some((e) => e.startsWith('Rule 2')))
  assert.equal(r.seed, null)
})

test('Rule 11: non-question response warns but does not block', () => {
  const warnable = structuredClone(good)
  warnable.categories[0].clues[0].response = 'Blue'
  const r = validateSeed(warnable)
  assert.deepEqual(r.errors, [])
  assert.ok(r.warnings.some((w) => w.startsWith('Rule 11')))
  assert.ok(r.seed) // still importable
})

test('Rule 12: a clue that contains its own answer is rejected', () => {
  const bad = structuredClone(good)
  bad.categories[0].clues[0] = {
    value: 200,
    clue: 'What is burnt bread called, like toast?',
    response: 'What is toast?'
  }
  const r = validateSeed(bad)
  assert.ok(r.errors.some((e) => e.startsWith('Rule 12')), r.errors.join('\n'))
})

test('Rule 12: an incidental shared common word does NOT trip the rule', () => {
  const ok = structuredClone(good)
  ok.categories[0].clues[0] = {
    value: 200,
    clue: 'This GameCube life-sim is full of talking animal villagers.',
    response: 'What is Animal Crossing?'
  }
  ok.categories[1].clues[0] = {
    value: 200,
    clue: 'A 1984 Eddie Murphy cop comedy set in California.',
    response: 'What is Beverly Hills Cop?'
  }
  const r = validateSeed(ok)
  assert.ok(!r.errors.some((e) => e.startsWith('Rule 12')), r.errors.join('\n'))
})

test('all violations are collected, not just the first', () => {
  const messy = {
    title: '',
    categories: [
      { name: 'A', clues: [{ value: -1, clue: '', response: 'nope' }] }
    ]
  }
  const r = validateSeed(messy)
  assert.ok(r.errors.length >= 3, `expected several errors, got ${r.errors.length}`)
})
