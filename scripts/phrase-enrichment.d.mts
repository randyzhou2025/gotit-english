export function isMeaningfulPhrase(
  english: string,
  word: string,
  partOfSpeech: string
): boolean

export function getAggregatedPhraseBank(root: string): Map<string, string>

export function suggestClassicPhrase(
  root: string,
  word: string,
  partOfSpeech: string,
  meaning: string,
  exampleSentence?: string
): string | undefined

export function enrichMissingPhrase<T extends unknown[]>(root: string, tuple: T): T
