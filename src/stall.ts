export type StallReason =
  | 'filler'
  | 'fragment_silence'
  | 'question_silence'
  | 'japanese_mixed'
  | 'difficult_word'
  | 'explicit_tap'

export interface StallDetection {
  reason: StallReason
  matchedText?: string
  matchedWord?: string
  silenceMs?: number
}

const FILLER_PATTERNS = [
  /\buh\b/i,
  /\bum\b/i,
  /\ber\b/i,
  /\bhmm+\b/i,
  /えっと/,
  /あの/,
  /なんだっけ/,
  /how do you say/i,
  /what(?:'s| is) the word/i,
]

const QUESTION_PATTERNS = [
  /\?$/,
  /^(who|what|when|where|why|how|is|are|do|does|did|can|could|would|will|should)\b/i,
]

const FRAGMENT_ENDINGS = [
  'to',
  'the',
  'a',
  'an',
  'and',
  'but',
  'because',
  'that',
  'is',
  'was',
  'were',
  'how',
  'what',
  'why',
  'when',
  'where',
  'if',
  'for',
  'with',
  'about',
  'from',
  'into',
  'of',
  'on',
  'in',
  'at',
  'want to',
  'need to',
  'trying to',
  'going to',
  'have to',
  'not sure how to',
]

const DIFFICULT_WORDS = new Set([
  'acquisition','adjacent','aggregate','allocate','ambiguity','analogy','anticipate','apparatus','arbitrary','artifact',
  'articulate','assertive','assumption','asymmetry','authenticate','autonomous','backlog','benchmark','brevity','calibrate',
  'capability','cascade','catalyst','coherent','collateral','compliance','component','comprehensive','concurrent','configuration',
  'consensus','constraint','contingency','conventional','convey','correlate','credible','cumulative','curriculum','decentralized',
  'decompose','dedicated','definitive','delegate','deliberate','derivative','deterministic','diagnostic','differentiate','diminish',
  'discrete','discrepancy','distort','divergent','ecosystem','elaborate','elevate','eligible','embedded','empirical',
  'enablement','encapsulate','enforce','enhance','entitlement','equivalent','escalate','estimate','evidence','exception',
  'explicit','facilitate','feasible','fidelity','framework','friction','fundamental','granular','heuristic','hierarchy',
  'holistic','hypothesis','implement','incentive','incompatible','incremental','indicator','inevitable','inference','infrastructure',
  'inhibit','initiative','innovation','insight','integrity','interface','intermediate','interoperable','iterate','justification',
  'knowledgeable','latency','leverage','likelihood','longitudinal','maintainability','manifest','methodology','milestone','mitigate',
  'modality','momentum','multilingual','negotiation','nuance','objective','observable','optimize','orchestrate','outcome',
  'overhead','parameter','paradigm','parallel','perceive','persistent','plausible','portfolio','precedent','precision',
  'predictable','prerequisite','preserve','prioritize','probability','procedural','procurement','proficiency','projection','provisional',
  'qualitative','quantify','questionnaire','rationale','reconcile','redundant','refactor','regression','reinforce','reliable',
  'resilience','retention','retroactive','rigorous','roadmap','scaffold','scenario','scope','sequence','simulate',
  'sophisticated','specification','stakeholder','strategic','streamline','substitute','sufficient','synchronize','tangible','taxonomy',
  'throughput','tolerance','tradeoff','trajectory','transcript','transparent','uncertainty','underlying','validate','variability',
  'viable','workaround',
])

export function detectImmediateStall(text: string): StallDetection | null {
  const normalized = text.trim()
  if (!normalized) return null

  for (const pattern of FILLER_PATTERNS) {
    const match = normalized.match(pattern)
    if (match) {
      return {
        reason: 'filler',
        matchedText: match[0],
      }
    }
  }

  if (hasJapaneseScript(normalized)) {
    return {
      reason: 'japanese_mixed',
    }
  }

  const difficult = findDifficultWord(normalized)
  if (difficult) {
    return {
      reason: 'difficult_word',
      matchedWord: difficult,
    }
  }

  return null
}

export function detectSilenceStall(text: string, silenceMs: number): StallDetection | null {
  const normalized = text.trim()
  if (!normalized) return null

  if (silenceMs >= 1200 && endsWithFragment(normalized)) {
    return {
      reason: 'fragment_silence',
      silenceMs,
    }
  }

  if (silenceMs >= 2500 && isQuestionLike(normalized)) {
    return {
      reason: 'question_silence',
      silenceMs,
    }
  }

  return null
}

export function hasJapaneseScript(text: string): boolean {
  return /[ぁ-んァ-ヶ一-龠々ー]/.test(text)
}

function endsWithFragment(text: string): boolean {
  const lower = text.toLowerCase().replace(/[.!?,:;)\]]+$/g, '').trim()
  return FRAGMENT_ENDINGS.some(ending => lower.endsWith(ending))
}

function isQuestionLike(text: string): boolean {
  const normalized = text.trim()
  return QUESTION_PATTERNS.some(pattern => pattern.test(normalized))
}

function findDifficultWord(text: string): string | null {
  const words = text.toLowerCase().match(/[a-z][a-z'-]*/g) ?? []
  for (const word of words) {
    if (DIFFICULT_WORDS.has(word)) return word
  }
  return null
}
