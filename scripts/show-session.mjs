import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'

const logsDir = path.resolve(process.cwd(), 'logs')
const files = (await readdir(logsDir).catch(() => []))
  .filter(name => /^session-.*\.jsonl$/.test(name))
  .sort()

const latest = files.at(-1)

if (!latest) {
  console.error('No session logs found in ./logs')
  process.exit(1)
}

const filePath = path.join(logsDir, latest)
const raw = await readFile(filePath, 'utf8')
const events = raw
  .split('\n')
  .map(line => line.trim())
  .filter(Boolean)
  .map(line => JSON.parse(line))
  .sort((left, right) => left.elapsedMs - right.elapsedMs)

const summary = {
  asrCount: 0,
  asrLatencyMs: 0,
  decisionCount: 0,
  decisionLatencyMs: 0,
  recapCount: 0,
  recapLatencyMs: 0,
  totalCostUsd: 0,
}

console.log(`Session: ${latest}`)
console.log(`Events: ${events.length}`)
console.log('')

for (const event of events) {
  const prefix = `[+${String(event.elapsedMs).padStart(6, ' ')}ms]`

  if (event.type === 'asr') {
    summary.asrCount += 1
    summary.asrLatencyMs += event.payload.asrLatencyMs
    const matches = event.payload.roleInference.matches.length > 0
      ? event.payload.roleInference.matches.map(match => `${match.keyword}=${match.matchedText}`).join(', ')
      : 'none'
    console.log(`${prefix} ASR  ${event.payload.role.toUpperCase()} "${event.payload.transcript}"`)
    console.log(`         rule=${event.payload.roleInference.rule} matches=${matches} rms=${event.payload.rms} audio=${event.payload.audioSeconds}s asr=${event.payload.asrLatencyMs}ms`)
    continue
  }

  if (event.type === 'decision') {
    summary.decisionCount += 1
    summary.decisionLatencyMs += event.payload.latencyMs
    summary.totalCostUsd += event.payload.estimatedCostUsd
    if (event.payload.trigger === 'recap') {
      summary.recapCount += 1
      summary.recapLatencyMs += event.payload.latencyMs
    }
    const text = event.payload.decision.type === 'HINT'
      ? event.payload.decision.choices.map((choice, index) => `${index + 1}:${choice.english}`).join(' | ')
      : event.payload.decision.text || '(none)'
    console.log(`${prefix} COACH ${event.payload.trigger.toUpperCase()} -> ${event.payload.decision.type} "${text}"`)
    console.log(`         model=${event.payload.model} latency=${event.payload.latencyMs}ms cost=$${event.payload.estimatedCostUsd.toFixed(6)} usage=${event.payload.usage.inputTokens}/${event.payload.usage.outputTokens}`)
    continue
  }

  if (event.type === 'hud') {
    if (event.payload.phase === 'render') {
      console.log(`${prefix} HUD  ${event.payload.type} "${event.payload.body}"`)
      console.log(`         aux=${event.payload.aux} ttl=${event.payload.ttl_ms ?? 0}ms displayedAt=${event.payload.displayedAt}`)
      continue
    }
    console.log(`${prefix} HUD  QUIET from ${event.payload.type}`)
    console.log(`         reason=${event.payload.reason} quietAt=${event.payload.quietAt} previously="${event.payload.body}"`)
    continue
  }

  if (event.type === 'recap_flow') {
    console.log(`${prefix} RECAP ${event.payload.stage}`)
    console.log(`         source=${event.payload.source} silence=${event.payload.silenceMs}ms latency=${event.payload.latencyMs ?? '-'} decision="${event.payload.decisionText ?? ''}" error="${event.payload.error ?? ''}"`)
    continue
  }

  if (event.type === 'nod') {
    console.log(`${prefix} NOD  ${event.payload.event}`)
    console.log(`         card=${event.payload.activeCardType} ttl=${event.payload.ttl_ms ?? '-'} detectCount=${event.payload.detectCount ?? '-'}`)
  }
}

console.log('')
console.log('Summary')
console.log(`ASR avg latency: ${average(summary.asrLatencyMs, summary.asrCount)}ms (${summary.asrCount} calls)`)
console.log(`Decision avg latency: ${average(summary.decisionLatencyMs, summary.decisionCount)}ms (${summary.decisionCount} calls)`)
console.log(`Recap avg latency: ${average(summary.recapLatencyMs, summary.recapCount)}ms (${summary.recapCount} calls)`)
console.log(`Estimated total cost: $${summary.totalCostUsd.toFixed(6)}`)

function average(total, count) {
  if (!count) return 0
  return Math.round(total / count)
}
