import { XMLParser, XMLValidator } from 'fast-xml-parser'
import { jsonrepair } from 'jsonrepair'
import { parseAllDocuments } from 'yaml'

export type StructuredDataFormat = 'json' | 'xml' | 'yaml'

export type StructuredDataParseResult =
  | {
      ok: true
      format: StructuredDataFormat
      value: unknown
      repaired?: boolean
    }
  | {
      ok: false
      format?: StructuredDataFormat
      error: string
    }

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@',
  textNodeName: '#text',
  cdataPropName: '#cdata',
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: true,
  ignoreDeclaration: true,
  ignorePiTags: true,
  processEntities: {
    enabled: true,
    maxEntitySize: 10_000,
    maxExpansionDepth: 10,
    maxTotalExpansions: 1_000,
    maxExpandedLength: 100_000,
    maxEntityCount: 100
  }
})

const errorText = (error: unknown) => {
  if (error instanceof Error) return error.message
  return String(error)
}

export const structuredDataFormatLabel: Record<StructuredDataFormat, string> = {
  json: 'JSON',
  xml: 'XML',
  yaml: 'YAML'
}

export const looksLikeXml = (text: string) => text.trimStart().startsWith('<')

export const looksLikeYaml = (text: string) => {
  const value = text.trim()
  if (!value) return false
  if (/^(?:---|\.\.\.|%YAML)(?:\s|$)/.test(value)) return true
  if (/^[{[]/.test(value)) return true

  return value.split(/\r?\n/).some((line) => {
    if (!line.trim() || /^\s*#/.test(line)) return false
    return /^\s*-\s+\S/.test(line) || /^\s*[^\s#][^:\n]*:(?:\s+.*)?$/.test(line)
  })
}

const domParserError = (text: string) => {
  if (typeof DOMParser === 'undefined') return null

  const document = new DOMParser().parseFromString(text, 'application/xml')
  const parserError = document.getElementsByTagName('parsererror')[0]
  if (!parserError) return null

  const message = parserError.textContent?.replace(/\s+/g, ' ').trim()
  return message || 'XML 文档格式不正确'
}

export const validateXml = (text: string) => {
  const validation = XMLValidator.validate(text)
  if (validation !== true) {
    const { msg, line, col } = validation.err
    return `${msg}（第 ${line} 行，第 ${col} 列）`
  }
  return domParserError(text)
}

const normalizeJsonValue = (value: unknown) => {
  const serialized = JSON.stringify(value)
  if (serialized === undefined) throw new Error('内容无法转换为 JSON')
  return JSON.parse(serialized) as unknown
}

export const parseJsonLike = (text: string): StructuredDataParseResult => {
  try {
    return { ok: true, format: 'json', value: JSON.parse(text) as unknown }
  } catch {
    try {
      return {
        ok: true,
        format: 'json',
        value: JSON.parse(jsonrepair(text)) as unknown,
        repaired: true
      }
    } catch (error) {
      return { ok: false, format: 'json', error: errorText(error) }
    }
  }
}

const parseXml = (text: string): StructuredDataParseResult => {
  const validationError = validateXml(text)
  if (validationError) return { ok: false, format: 'xml', error: validationError }

  try {
    return { ok: true, format: 'xml', value: xmlParser.parse(text) as unknown }
  } catch (error) {
    return { ok: false, format: 'xml', error: errorText(error) }
  }
}

const parseYaml = (text: string): StructuredDataParseResult => {
  try {
    const documents = parseAllDocuments(text, { merge: true, prettyErrors: false })
    const errors = documents.flatMap((document) => document.errors)
    if (errors.length) {
      return { ok: false, format: 'yaml', error: errors[0].message }
    }

    const values = documents.map((document) =>
      normalizeJsonValue(document.toJS({ mapAsMap: false, maxAliasCount: 100 }))
    )
    const value = values.length === 1 ? values[0] : values
    return { ok: true, format: 'yaml', value }
  } catch (error) {
    return { ok: false, format: 'yaml', error: errorText(error) }
  }
}

const extractJsonBlocks = (text: string) => {
  const blocks: unknown[] = []
  let index = 0

  while (index < text.length) {
    const startChar = text[index]
    if (startChar !== '{' && startChar !== '[') {
      index++
      continue
    }

    let depth = 0
    let inString = false
    let escaped = false
    let end = index

    for (; end < text.length; end++) {
      const char = text[end]
      if (inString) {
        if (escaped) escaped = false
        else if (char === '\\') escaped = true
        else if (char === '"') inString = false
        continue
      }

      if (char === '"') inString = true
      else if (char === '{' || char === '[') depth++
      else if (char === '}' || char === ']') {
        depth--
        if (depth === 0) {
          end++
          break
        }
      }
    }

    const parsed = parseJsonLike(text.slice(index, end))
    if (parsed.ok) blocks.push(parsed.value)
    index = Math.max(end, index + 1)
  }

  return blocks
}

export const parseStructuredData = (text: string): StructuredDataParseResult => {
  const value = text.trim()
  if (!value) return { ok: false, error: '请输入内容' }

  try {
    return { ok: true, format: 'json', value: JSON.parse(value) as unknown }
  } catch {
    // 继续自动识别 XML、YAML 或可修复的 JSON。
  }

  if (looksLikeXml(value)) return parseXml(value)

  // 以 { / [ 开头时优先走 JSON 修复：YAML flow 会把 `{a:1,}` 误解析成 `{"a:1": null}`。
  if (/^[{[]/.test(value)) {
    const jsonResult = parseJsonLike(value)
    if (jsonResult.ok) return jsonResult

    const yamlResult = parseYaml(value)
    if (yamlResult.ok) return yamlResult

    const blocks = extractJsonBlocks(value)
    if (blocks.length) return { ok: true, format: 'json', value: blocks, repaired: true }

    return jsonResult
  }

  // 块状 YAML / key:value 文本；失败时再尝试 JSON 修复与混杂文本提取。
  let yamlError: StructuredDataParseResult | null = null
  if (looksLikeYaml(value)) {
    const yamlResult = parseYaml(value)
    if (yamlResult.ok) return yamlResult
    yamlError = yamlResult
  }

  const jsonResult = parseJsonLike(value)
  if (jsonResult.ok) return jsonResult

  const blocks = extractJsonBlocks(value)
  if (blocks.length) return { ok: true, format: 'json', value: blocks, repaired: true }

  return yamlError || jsonResult
}
