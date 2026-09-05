export interface ScorePosterQuote {
  lines: readonly [string, string]
  author: string
}

export const SCORE_POSTER_QUOTES: readonly ScorePosterQuote[] = [
  { lines: ['Believe you can', "and you're halfway there."], author: 'Theodore Roosevelt' },
  { lines: ['It always seems impossible', "until it's done."], author: 'Nelson Mandela' },
  { lines: ['The future depends on', 'what you do today.'], author: 'Mahatma Gandhi' },
  { lines: ['Nothing will work', 'unless you do.'], author: 'Maya Angelou' },
  { lines: ['Well done is better', 'than well said.'], author: 'Benjamin Franklin' },
  { lines: ['Learning never exhausts', 'the mind.'], author: 'Leonardo da Vinci' },
  { lines: ['Energy and persistence', 'conquer all things.'], author: 'Benjamin Franklin' },
  { lines: ['Great things are done', 'by a series of small things.'], author: 'Vincent van Gogh' },
  { lines: ['Success is not final;', 'failure is not fatal.'], author: 'Winston Churchill' },
  { lines: ['Stay hungry.', 'Stay foolish.'], author: 'Steve Jobs' }
]

export function pickScorePosterQuote(previousIndex: number, randomValue = Math.random()) {
  let index = Math.min(
    SCORE_POSTER_QUOTES.length - 1,
    Math.floor(Math.max(0, randomValue) * SCORE_POSTER_QUOTES.length)
  )
  if (SCORE_POSTER_QUOTES.length > 1 && index === previousIndex) {
    index = (index + 1) % SCORE_POSTER_QUOTES.length
  }
  return { index, quote: SCORE_POSTER_QUOTES[index]! }
}

export function formatScorePosterDate(date: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${String(date.getDate()).padStart(2, '0')} ${months[date.getMonth()] ?? ''} ${date.getFullYear()}`
}
