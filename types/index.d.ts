export type CoachScores = { goal: number; context: number; done: number }

export type Coaching = {
  status: 'thinking' | 'done' | 'raw' | 'failed'
  original: string
  scores: CoachScores | null
  notes: string[]
  improved: string
  raw: string
}

declare module 'claude-code' {
  interface PluginState {
    'prompt-coach': { coaching: Coaching | null }
  }
}
