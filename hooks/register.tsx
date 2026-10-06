import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Coaching } from '../types'

const PANE = 'prompt-coach'
const TITLE = 'Prompt Coach'
const ACCENT = '#a78bfa'

const coaching = atom({ plugin: 'prompt-coach', key: 'coaching' } as const, null)

const SYSTEM = [
  'You coach people on the prompts they give Claude Code. Return JSON only, no prose and no code fence.',
  'Score the prompt out of 10 on three things:',
  '- goal: is it clear what they want',
  '- context: does Claude have what it needs to do it',
  '- done: will Claude know when it has finished',
  'Give two or three short notes on what to fix, one sentence each.',
  'Then rewrite the prompt so it fixes them. Keep their voice and wording where it works. Make it no longer than it needs to be. Do not invent facts about their project: where something is missing, leave a short placeholder in square brackets.',
  'Shape: {"scores": {"goal": 0, "context": 0, "done": 0}, "notes": ["..."], "improved": "..."}',
].join('\n')

async function lastPrompt($: EngineInterface) {
  const messages = await $.session.messages()
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]
    if (!m || m.role !== 'user' || m.toolResults?.length) continue
    const text = m.text.trim()
    if (text && !text.startsWith('<')) return text
  }
  return ''
}

function parse(text: string) {
  try {
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    const o = JSON.parse(text.slice(start, end + 1))
    const s = o.scores ?? {}
    const score = (v: unknown) => Math.max(0, Math.min(10, Math.round(Number(v) || 0)))
    if (typeof o.improved !== 'string' || !o.improved.trim()) return null
    return {
      scores: { goal: score(s.goal), context: score(s.context), done: score(s.done) },
      notes: Array.isArray(o.notes) ? o.notes.filter((n: unknown) => typeof n === 'string').slice(0, 3) : [],
      improved: o.improved.trim(),
    }
  } catch {
    return null
  }
}

async function coach($: EngineInterface, original: string) {
  const fresh: Coaching = { status: 'thinking', original, scores: null, notes: [], improved: '', raw: '' }
  await update($, coaching, () => fresh)
  await $.ui.open({ id: PANE, title: TITLE, focus: true })
  $.ui.toast('Prompt Coach is reading your prompt...')

  const result = await $.model
    .complete({ model: 'claude-sonnet-5-5', maxTokens: 1500, system: SYSTEM, prompt: `The prompt to coach:\n\n${original}` })
    .catch((error: unknown) => ({ isAnswered: false as const, reason: String(error) }))

  // A newer /coach may have started while this one ran.
  const current = await read($, coaching)
  if (current?.original !== original) return

  if (!result.isAnswered) {
    await update($, coaching, c => (c ? { ...c, status: 'failed' as const, raw: result.reason } : c))
    return
  }
  const parsed = parse(result.text)
  if (!parsed) {
    await update($, coaching, c => (c ? { ...c, status: 'raw' as const, raw: result.text } : c))
    return
  }
  await update($, coaching, c => (c ? { ...c, status: 'done' as const, ...parsed } : c))
}

const scoreColour = (n: number) => (n >= 8 ? '#34d399' : n >= 5 ? '#fbbf24' : '#f87171')

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'coach',
      description: 'Score a prompt and get a better version. /coach <prompt>, or alone for your last prompt',
    })
    return next(e)
  })

  on('command.run', { command: 'coach' }, async ($, e) => {
    const original = e.args.trim() || (await lastPrompt($))
    if (!original) return { text: 'Nothing to coach. Type /coach followed by a prompt.' }
    void coach($, original)
    return { text: 'Prompt Coach started.' }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Button, Text } = $.ui.resolve(e)
    const c = await read($, coaching)
    if (!c) return <Text dimColor>Type /coach followed by a prompt to start.</Text>

    const button = (key: string, label: string, onPress: () => unknown) => (
      <Button key={key} label={label} variant="secondary" hover={{ color: ACCENT }} onPress={onPress} />
    )
    const close = button('close', 'Close', () => $.ui.close({ id: PANE }))

    if (c.status === 'thinking') {
      return (
        <Box flexDirection="column">
          <Text color="#fbbf24">Thinking...</Text>
          <Box key="row-wait" marginTop={1}>{close}</Box>
        </Box>
      )
    }

    if (c.status !== 'done') {
      return (
        <Box flexDirection="column">
          <Text color="#f87171">{c.status === 'failed' ? 'The model did not answer:' : 'Could not read the reply as JSON. Here it is as sent:'}</Text>
          <Text>{c.raw}</Text>
          <Box key="row-fail" columnGap={1} marginTop={1}>
            {button('send-mine', 'Send mine', () => $.prompt.submit({ text: c.original, asUser: true }))}
            {close}
          </Box>
        </Box>
      )
    }

    const scores = c.scores ?? { goal: 0, context: 0, done: 0 }
    const score = (label: string, n: number) => (
      <Box columnGap={1}>
        <Text dimColor>{label}</Text>
        <Text bold color={scoreColour(n)}>
          {n}/10
        </Text>
      </Box>
    )

    return (
      <Box flexDirection="column">
        <Box columnGap={3}>
          {score('Goal', scores.goal)}
          {score('Context', scores.context)}
          {score('Done', scores.done)}
        </Box>
        <Box flexDirection="column" marginTop={1}>
          {c.notes.map((note, i) => (
            <Text key={`note-${i}`}>
              <Text color={ACCENT}>› </Text>
              {note}
            </Text>
          ))}
        </Box>
        <Box flexDirection="column" marginTop={1} borderStyle="round" borderColor="#4b5563" paddingX={1}>
          <Text dimColor bold>
            Yours
          </Text>
          <Text dimColor>{c.original}</Text>
        </Box>
        <Box flexDirection="column" borderStyle="round" borderColor={ACCENT} paddingX={1}>
          <Text bold color={ACCENT}>
            Improved
          </Text>
          <Text>{c.improved}</Text>
        </Box>
        <Box key="row-actions" columnGap={1} marginTop={1}>
          {button('send-improved', 'Send improved', () => $.prompt.submit({ text: c.improved, asUser: true }))}
          {button('edit-improved', 'Edit improved', () => $.prompt.fill({ text: c.improved, mode: 'replace' }))}
          {button('send-mine', 'Send mine', () => $.prompt.submit({ text: c.original, asUser: true }))}
          {close}
        </Box>
      </Box>
    )
  })
}
