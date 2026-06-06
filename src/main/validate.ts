// Pure authoring-guardrail logic — no Electron, no DB imports — so it's
// trivially unit-testable. The single source of truth for the limits
// documented in docs/Rules/trivia-authoring.md. Keep the two in sync.

import type { SeedGame, SeedCategory, SeedClue } from '@shared/types'

export const LIMITS = {
  TITLE_MAX: 80,
  CATEGORY_NAME_MAX: 60,
  MIN_CATEGORIES: 2,
  MAX_CATEGORIES: 8,
  MIN_CLUES_PER_CATEGORY: 1,
  MAX_CLUES_PER_CATEGORY: 8,
  CLUE_MAX: 300,
  RESPONSE_MAX: 150
} as const

export interface ValidationResult {
  /** Best-effort coerced game; only safe to insert when `errors` is empty. */
  seed: SeedGame | null
  errors: string[]
  warnings: string[]
}

function asString(v: unknown): string {
  return typeof v === 'string' ? v.trim() : ''
}

/** Heuristic for Rule 11 — Jeopardy-style "Who is…?" phrasing. */
function looksLikeQuestion(s: string): boolean {
  const t = s.trim()
  if (!t.includes('?')) return false
  return /^(who|what|where|when|why|how|whom|whose|name|in (what|which))\b/i.test(t)
}

/**
 * Validate an untrusted parsed JSON object against the authoring rules.
 * Collects ALL violations (does not stop at the first) so the user can
 * fix them in one pass. Never throws.
 */
export function validateSeed(raw: unknown): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (!raw || typeof raw !== 'object') {
    return { seed: null, errors: ['File is not a JSON object.'], warnings }
  }
  const obj = raw as Record<string, unknown>

  // Rule 1 — title
  const title = asString(obj.title)
  if (!title) errors.push('Rule 1: missing "title".')
  else if (title.length > LIMITS.TITLE_MAX) {
    errors.push(`Rule 1: title exceeds ${LIMITS.TITLE_MAX} characters.`)
  }

  // Rule 2 — categories array + size
  const categories: SeedCategory[] = []
  let ladderRef: number[] | null = null
  const clueTextSeen = new Map<string, string>() // normalized clue -> first category name

  if (!Array.isArray(obj.categories) || obj.categories.length === 0) {
    errors.push('Rule 2: "categories" must be a non-empty array.')
  } else {
    if (obj.categories.length < LIMITS.MIN_CATEGORIES || obj.categories.length > LIMITS.MAX_CATEGORIES) {
      errors.push(
        `Rule 2: a board needs ${LIMITS.MIN_CATEGORIES}–${LIMITS.MAX_CATEGORIES} categories (found ${obj.categories.length}).`
      )
    }

    obj.categories.forEach((c, ci) => {
      const label = `category #${ci + 1}`
      if (!c || typeof c !== 'object') {
        errors.push(`Rule 2: ${label} is not an object.`)
        return
      }
      const cat = c as Record<string, unknown>
      const name = asString(cat.name)
      if (!name) errors.push(`Rule 2: ${label} is missing "name".`)
      else if (name.length > LIMITS.CATEGORY_NAME_MAX) {
        errors.push(`Rule 2: category "${name}" name exceeds ${LIMITS.CATEGORY_NAME_MAX} characters.`)
      }
      const catName = name || label

      // Rule 3 — clue count
      if (!Array.isArray(cat.clues) || cat.clues.length === 0) {
        errors.push(`Rule 3: category "${catName}" must have a non-empty "clues" array.`)
        return
      }
      if (
        cat.clues.length < LIMITS.MIN_CLUES_PER_CATEGORY ||
        cat.clues.length > LIMITS.MAX_CLUES_PER_CATEGORY
      ) {
        errors.push(
          `Rule 3: category "${catName}" needs ${LIMITS.MIN_CLUES_PER_CATEGORY}–${LIMITS.MAX_CLUES_PER_CATEGORY} clues (found ${cat.clues.length}).`
        )
      }

      const clues: SeedClue[] = []
      const valuesSeen = new Set<number>()
      cat.clues.forEach((cl, li) => {
        const clueLabel = `clue #${li + 1} in "${catName}"`
        if (!cl || typeof cl !== 'object') {
          errors.push(`Rule 7: ${clueLabel} is not an object.`)
          return
        }
        const clue = cl as Record<string, unknown>

        // Rule 4 — value is a positive integer
        const value = Number(clue.value)
        if (!Number.isInteger(value) || value <= 0) {
          errors.push(`Rule 4: ${clueLabel} has an invalid "value" (must be a positive integer).`)
        } else {
          // Rule 5 — no duplicate value within a category
          if (valuesSeen.has(value)) {
            errors.push(`Rule 5: category "${catName}" has two clues worth $${value}.`)
          }
          valuesSeen.add(value)
        }

        // Rule 7 — clue & response present and bounded
        const text = asString(clue.clue)
        const response = asString(clue.response)
        if (!text) errors.push(`Rule 7: ${clueLabel} is missing "clue".`)
        else if (text.length > LIMITS.CLUE_MAX) {
          errors.push(`Rule 7: ${clueLabel} exceeds ${LIMITS.CLUE_MAX} characters.`)
        }
        if (!response) errors.push(`Rule 7: ${clueLabel} is missing "response".`)
        else if (response.length > LIMITS.RESPONSE_MAX) {
          errors.push(`Rule 7: ${clueLabel} response exceeds ${LIMITS.RESPONSE_MAX} characters.`)
        }

        // Rule 8 — no duplicate clue text anywhere
        if (text) {
          const norm = text.toLowerCase().replace(/\s+/g, ' ')
          const prev = clueTextSeen.get(norm)
          if (prev) {
            errors.push(`Rule 8: duplicate clue text in "${prev}" and "${catName}": "${text}".`)
          } else {
            clueTextSeen.set(norm, catName)
          }
        }

        // Rule 11 — question phrasing (warning only)
        if (response && !looksLikeQuestion(response)) {
          warnings.push(`Rule 11: ${clueLabel} response is not phrased as a question: "${response}".`)
        }

        clues.push({ value: Number.isFinite(value) ? value : 0, clue: text, response })
      })

      // Rule 6 — uniform value ladder across categories
      const ladder = [...valuesSeen].sort((a, b) => a - b)
      if (ladderRef === null) {
        ladderRef = ladder
      } else if (ladder.length && ladder.join(',') !== ladderRef.join(',')) {
        errors.push(
          `Rule 6: category "${catName}" value ladder [${ladder.join(', ')}] does not match the first category [${ladderRef.join(', ')}].`
        )
      }

      // Rule 10 — normalize: sort clues by value
      clues.sort((a, b) => a.value - b.value)
      categories.push({ name, clues })
    })
  }

  // Rule 9 — Final round completeness (optional key)
  let final: SeedGame['final']
  if (obj.final != null) {
    if (typeof obj.final !== 'object') {
      errors.push('Rule 9: "final" must be an object (or omitted).')
    } else {
      const f = obj.final as Record<string, unknown>
      const fClue = asString(f.clue)
      const fResponse = asString(f.response)
      const fCategory = asString(f.category)
      if (!fClue || !fResponse) {
        errors.push('Rule 9: "final" is present but missing "clue" and/or "response".')
      } else {
        if (fResponse && !looksLikeQuestion(fResponse)) {
          warnings.push(`Rule 11: Final response is not phrased as a question: "${fResponse}".`)
        }
        final = { category: fCategory, clue: fClue, response: fResponse }
      }
    }
  }

  const seed: SeedGame | null = title && categories.length ? { title, categories, final } : null
  return { seed, errors, warnings }
}
