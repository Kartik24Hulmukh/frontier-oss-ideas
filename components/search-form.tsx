'use client'

import { useState } from 'react'

const EXAMPLES = [
  'AI code review agent',
  'reasoning trace format',
  'acoustic predictive maintenance',
  'local-first AI agent OS',
]

export function SearchForm({
  onSearch,
  isLoading,
}: {
  onSearch: (query: string) => void
  isLoading: boolean
}) {
  const [value, setValue] = useState('')

  const submit = () => {
    const trimmed = value.trim()
    if (trimmed && !isLoading) onSearch(trimmed)
  }

  return (
    <div className="flex flex-col gap-4">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
        className="flex flex-col gap-2 sm:flex-row"
      >
        <label htmlFor="idea-input" className="sr-only">
          Describe your idea
        </label>
        <input
          id="idea-input"
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Describe the idea, e.g. AI code review agent"
          maxLength={120}
          className="h-14 flex-1 border border-border bg-card px-4 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !value.trim()}
          className="h-14 border border-foreground bg-foreground px-8 font-mono text-sm uppercase tracking-widest text-background transition-colors hover:bg-background hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isLoading ? 'Scanning…' : 'Run scan'}
        </button>
      </form>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Try:
        </span>
        {EXAMPLES.map((example) => (
          <button
            key={example}
            type="button"
            disabled={isLoading}
            onClick={() => {
              setValue(example)
              onSearch(example)
            }}
            className="border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-foreground hover:text-foreground disabled:opacity-40"
          >
            {example}
          </button>
        ))}
      </div>
    </div>
  )
}
