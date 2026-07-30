import type { WordEntry } from './types'

export type WordlistExportMode = 'wordlist' | 'chinese' | 'english'

export interface WordlistExportPage {
  left: Array<WordEntry | null>
  right: Array<WordEntry | null>
}

export interface JpegPdfPage {
  bytes: Uint8Array
  width: number
  height: number
}

export const WORDLIST_EXPORT_ROWS = 20
export const WORDLIST_EXPORT_COLUMNS = 2

const EXPORT_MODE_FILE_LABELS: Record<WordlistExportMode, string> = {
  wordlist: 'wordlist',
  chinese: 'chinese-wordlist',
  english: 'english-wordlist'
}

function toEnglishFileIdentifier(value: string, fallback: string): string {
  const identifier = value
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return identifier || fallback
}

export function buildWordlistExportFilename(
  bookId: string,
  unitName: string,
  mode: WordlistExportMode
): string {
  const book = toEnglishFileIdentifier(bookId, 'current-book')
  const unit = toEnglishFileIdentifier(unitName, 'current-unit')
  return `${book}-${unit}-${EXPORT_MODE_FILE_LABELS[mode]}.pdf`
}

function padRows(words: WordEntry[]): Array<WordEntry | null> {
  return Array.from(
    { length: WORDLIST_EXPORT_ROWS },
    (_, index) => words[index] ?? null
  )
}

export function buildWordlistExportPages(words: WordEntry[]): WordlistExportPage[] {
  const wordsPerPage = WORDLIST_EXPORT_ROWS * WORDLIST_EXPORT_COLUMNS
  const pageCount = Math.max(1, Math.ceil(words.length / wordsPerPage))

  return Array.from({ length: pageCount }, (_, pageIndex) => {
    const pageWords = words.slice(
      pageIndex * wordsPerPage,
      (pageIndex + 1) * wordsPerPage
    )

    return {
      left: padRows(pageWords.slice(0, WORDLIST_EXPORT_ROWS)),
      right: padRows(pageWords.slice(WORDLIST_EXPORT_ROWS))
    }
  })
}

function asciiBytes(value: string): Uint8Array {
  const bytes = new Uint8Array(value.length)
  for (let index = 0; index < value.length; index += 1) {
    bytes[index] = value.charCodeAt(index) & 0xff
  }
  return bytes
}

function concatBytes(parts: Uint8Array[]): Uint8Array {
  const length = parts.reduce((total, part) => total + part.length, 0)
  const result = new Uint8Array(length)
  let offset = 0

  for (const part of parts) {
    result.set(part, offset)
    offset += part.length
  }

  return result
}

function pdfObject(objectNumber: number, body: Uint8Array): Uint8Array {
  return concatBytes([
    asciiBytes(`${objectNumber} 0 obj\n`),
    body,
    asciiBytes('\nendobj\n')
  ])
}

export function buildJpegPdf(pages: JpegPdfPage[]): Uint8Array {
  if (pages.length === 0) {
    throw new Error('At least one JPEG page is required.')
  }

  const a4Width = 595.28
  const a4Height = 841.89
  const pageObjectNumbers = pages.map((_, index) => 3 + index * 3)
  const objects: Uint8Array[] = [
    pdfObject(1, asciiBytes('<< /Type /Catalog /Pages 2 0 R >>')),
    pdfObject(
      2,
      asciiBytes(
        `<< /Type /Pages /Count ${pages.length} /Kids [${pageObjectNumbers.map(number => `${number} 0 R`).join(' ')}] >>`
      )
    )
  ]

  pages.forEach((page, index) => {
    const pageObjectNumber = 3 + index * 3
    const imageObjectNumber = pageObjectNumber + 1
    const contentObjectNumber = pageObjectNumber + 2
    const imageName = `Im${index + 1}`
    const content = asciiBytes(
      `q\n${a4Width} 0 0 ${a4Height} 0 0 cm\n/${imageName} Do\nQ`
    )

    objects.push(
      pdfObject(
        pageObjectNumber,
        asciiBytes(
          `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${a4Width} ${a4Height}] `
          + `/Resources << /XObject << /${imageName} ${imageObjectNumber} 0 R >> >> `
          + `/Contents ${contentObjectNumber} 0 R >>`
        )
      ),
      pdfObject(
        imageObjectNumber,
        concatBytes([
          asciiBytes(
            `<< /Type /XObject /Subtype /Image /Width ${page.width} /Height ${page.height} `
            + `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.bytes.length} >>\nstream\n`
          ),
          page.bytes,
          asciiBytes('\nendstream')
        ])
      ),
      pdfObject(
        contentObjectNumber,
        concatBytes([
          asciiBytes(`<< /Length ${content.length} >>\nstream\n`),
          content,
          asciiBytes('\nendstream')
        ])
      )
    )
  })

  const header = concatBytes([
    asciiBytes('%PDF-1.4\n%'),
    new Uint8Array([0xe2, 0xe3, 0xcf, 0xd3]),
    asciiBytes('\n')
  ])
  const offsets = [0]
  let byteOffset = header.length

  for (const object of objects) {
    offsets.push(byteOffset)
    byteOffset += object.length
  }

  const xrefOffset = byteOffset
  const xrefRows = [
    'xref',
    `0 ${objects.length + 1}`,
    '0000000000 65535 f ',
    ...offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n `)
  ]
  const trailer = [
    ...xrefRows,
    'trailer',
    `<< /Size ${objects.length + 1} /Root 1 0 R >>`,
    'startxref',
    String(xrefOffset),
    '%%EOF',
    ''
  ].join('\n')

  return concatBytes([header, ...objects, asciiBytes(trailer)])
}
