export interface CSVParsedRow {
  [key: string]: string
}

export interface ColumnMapping {
  business_name: string
  contact_name: string
  phone: string
  city: string
  state: string
  niche: string
  website: string
  notes: string
}

export function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim())
  return result
}

export function parseCSV(text: string): { headers: string[]; data: CSVParsedRow[] } {
  const lines = text.split('\n').filter(line => line.trim())
  if (lines.length < 2) {
    throw new Error('CSV file is empty or invalid')
  }

  const headers = parseCSVLine(lines[0])
  const data: CSVParsedRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    if (values.length === headers.length) {
      const row: CSVParsedRow = {}
      headers.forEach((header, index) => {
        row[header] = values[index]
      })
      data.push(row)
    }
  }

  return { headers, data }
}

const KEYWORD_MAPPINGS: Record<keyof ColumnMapping, string[]> = {
  business_name: ['name', 'business', 'company', 'business name', 'company name', 'business_name'],
  contact_name: ['contact', 'contact name', 'first name', 'full name', 'person', 'contact_name'],
  phone: ['phone', 'phone number', 'telephone', 'mobile', 'cell', 'contact number'],
  city: ['city', 'town', 'location'],
  state: ['state', 'province', 'st'],
  niche: ['niche', 'industry', 'type', 'category', 'service'],
  website: ['website', 'url', 'site', 'web'],
  notes: ['notes', 'comments', 'description', 'info', 'details']
}

export function detectColumnMappings(headers: string[]): Partial<ColumnMapping> {
  const mappings: Partial<ColumnMapping> = {}

  Object.entries(KEYWORD_MAPPINGS).forEach(([field, keywords]) => {
    const match = headers.find(h =>
      keywords.some(kw => h.toLowerCase().includes(kw.toLowerCase()))
    )
    if (match) {
      mappings[field as keyof ColumnMapping] = match
    }
  })

  return mappings
}

export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
  } else if (cleaned.length === 11 && cleaned[0] === '1') {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`
  }
  return phone
}

export function exportToCSV(
  headers: string[],
  data: Record<string, string | number | boolean | null>[]
): string {
  const escape = (val: string): string => {
    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
      return `"${val.replace(/"/g, '""')}"`
    }
    return val
  }

  let csv = headers.map(escape).join(',') + '\n'

  data.forEach(row => {
    const line = headers.map(h => {
      const val = row[h]
      return escape(val === null || val === undefined ? '' : String(val))
    })
    csv += line.join(',') + '\n'
  })

  return csv
}
