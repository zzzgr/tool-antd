/**
 * Java toString 字符串解析为 JS 值。
 *
 * 覆盖常见风格：
 * - Lombok / record：`Foo(a=1, b=2)`
 * - IDE 生成 / Guava MoreObjects：`Foo{a=1, b=2}`
 * - Commons-Lang ToStringBuilder：`Foo[a=1,b=2]`
 * - 集合与数组 `[1, 2]`、Map `{k=v}`、Optional `Optional[x]` / `Optional.empty`
 *
 * 难点在于字段值里可能混入括号、逗号和中英文标点（例如 `名称（2025.1.16)`），
 * 因此标量的结束位置靠「后面是不是新字段 / 父容器能不能接上」的前瞻来判断，
 * 而不是单纯的括号配对。
 */

export type JavaToStringParseResult = { ok: true; value: unknown } | { ok: false; error: string }

type ContainerKind = 'object' | 'list' | 'map'

interface Container {
  kind: ContainerKind
  closer: string
}

type Attempt = { hit: true; value: unknown } | { hit: false }

const OPENER_TO_CLOSER: Record<string, string> = { '(': ')', '[': ']', '{': '}' }
const CLOSERS = ')]}'

/** 类名：支持全限定名 com.foo.Bar 与内部类 Foo$Bar */
const CLASS_NAME = /[A-Za-z_$][A-Za-z0-9_$.]*/y
/** 字段名前瞻：`name=`，排除 `==` */
const IDENT_ASSIGN = /[A-Za-z_$][A-Za-z0-9_$]*\s*=(?!=)/y
/** Map 键前瞻：允许中文等任意非结构字符 */
const MAP_KEY_ASSIGN = /[^,()[\]{}=]+=(?!=)/y
/** 数组的默认 toString：[I@1a2b3c、[Ljava.lang.String;@1a2b3c */
const RAW_ARRAY = /\[+(?:[ZBCDFIJS]|L[A-Za-z_$][A-Za-z0-9_$.]*;)@[0-9a-fA-F]+/y

/** Optional 空值 */
const OPTIONAL_EMPTY = /^Optional(?:Int|Long|Double)?\.empty$/
const OPTIONAL_NAMES = ['Optional', 'OptionalInt', 'OptionalLong', 'OptionalDouble']
/** 可能是数字的字面量（整数、小数、科学计数法） */
const NUMERIC = /^-?(?:\d+|\d+\.\d+|\d+(?:\.\d+)?[eE][+-]?\d+)$/

/** 类名紧跟括号且括号内是 `字段=`，Java toString 最强的特征 */
const TYPED_OBJECT_HINT = /[A-Za-z_$][A-Za-z0-9_$.]*[({[][A-Za-z_$][A-Za-z0-9_$]*\s*=(?!=)/
/** 裸 Map：`{k=v, ...}` 或 `[{k=v}, ...]` */
const MAP_ENTRY_HINT = /[{[,]\s*[A-Za-z0-9_$一-龥][^{}[\](),=]*=(?!=)/

const isWs = (ch: string | undefined) => ch !== undefined && /\s/.test(ch)

const matchAt = (re: RegExp, text: string, index: number) => {
  re.lastIndex = index
  return re.exec(text)
}

/**
 * 标量转 JS 值。数字用「转回字符串是否与原文一致」判断能否安全转成 number，
 * 这一条规则同时挡住了超长 ID 丢精度（2852595019871682604）、
 * BigDecimal 尾零（2.0000）和前导零（000）三种情况。
 */
const coerceScalar = (raw: string): unknown => {
  if (raw === 'null') return null
  if (raw === 'true') return true
  if (raw === 'false') return false
  if (OPTIONAL_EMPTY.test(raw)) return null
  if (!NUMERIC.test(raw)) return raw

  const value = Number(raw)
  if (!Number.isFinite(value) || String(value) !== raw) return raw
  return value
}

class JavaToStringParser {
  private readonly text: string
  private pos = 0
  private readonly stack: Container[] = []

  constructor(text: string) {
    this.text = text
  }

  parse(): unknown {
    this.skipWs()
    if (this.pos >= this.text.length) this.fail('内容为空')

    const values: unknown[] = []
    for (;;) {
      values.push(this.parseValue())
      this.skipWs()
      if (this.peek() !== ',') break
      this.pos++
      this.skipWs()
    }

    // 容忍日志行尾常见的分号
    while (this.pos < this.text.length && (isWs(this.peek()) || this.peek() === ';')) this.pos++
    if (this.pos < this.text.length) this.fail('存在无法解析的多余内容')

    return values.length === 1 ? values[0] : values
  }

  /* ---------------- 基础游标 ---------------- */

  private peek(offset = 0): string | undefined {
    return this.text[this.pos + offset]
  }

  private skipWs() {
    while (isWs(this.peek())) this.pos++
  }

  private fail(reason: string): never {
    const snippet = this.text.slice(this.pos, this.pos + 24).replace(/\s+/g, ' ')
    const where = snippet ? `「${snippet}」附近` : '内容结尾'
    throw new Error(`${reason}（第 ${this.pos + 1} 个字符，${where}）`)
  }

  private container(depth: number): Container | undefined {
    return this.stack[this.stack.length - depth]
  }

  /* ---------------- 值 ---------------- */

  private parseValue(): unknown {
    const ch = this.peek()
    if (ch === undefined) this.fail('内容意外结束')

    // 数组默认 toString 以 [ 开头但不是集合，先于列表识别
    const rawArray = matchAt(RAW_ARRAY, this.text, this.pos)
    if (rawArray) {
      this.pos += rawArray[0].length
      return rawArray[0]
    }

    if (ch === '[') return this.parseList()
    if (ch === '{') return this.parseMap()

    if (/[A-Za-z_$]/.test(ch)) {
      const typed = this.tryParseTypedObject()
      if (typed.hit) return typed.value
    }

    return this.parseScalar()
  }

  /** `Foo(a=1)` / `Foo{a=1}` / `Foo[a=1]` / `Optional[x]`，不匹配时不移动游标 */
  private tryParseTypedObject(): Attempt {
    const start = this.pos
    const name = matchAt(CLASS_NAME, this.text, this.pos)
    if (!name) return { hit: false }

    const openerIndex = this.pos + name[0].length
    const opener = this.text[openerIndex]
    if (!opener || !(opener in OPENER_TO_CLOSER)) return { hit: false }
    const closer = OPENER_TO_CLOSER[opener]

    // Optional[x] 直接拆成内部的值
    if (opener === '[' && OPTIONAL_NAMES.includes(name[0])) {
      this.pos = openerIndex + 1
      this.stack.push({ kind: 'list', closer })
      const inner = this.parseValue()
      this.stack.pop()
      this.skipWs()
      if (this.peek() === closer) {
        this.pos++
        return { hit: true, value: inner }
      }
      this.pos = start
      return { hit: false }
    }

    // 括号里必须是 `字段=`，否则当成普通文本（如 Foo[abc]）
    let bodyStart = openerIndex + 1
    while (isWs(this.text[bodyStart])) bodyStart++

    if (this.text[bodyStart] === closer) {
      this.pos = bodyStart + 1
      return { hit: true, value: {} }
    }
    if (!matchAt(IDENT_ASSIGN, this.text, bodyStart)) return { hit: false }

    this.pos = openerIndex + 1
    this.stack.push({ kind: 'object', closer })
    const value = this.parseFields(closer)
    this.stack.pop()
    return { hit: true, value }
  }

  private parseFields(closer: string): Record<string, unknown> {
    const result: Record<string, unknown> = {}
    for (;;) {
      this.skipWs()
      const key = this.readFieldName()
      result[key] = this.parseValue()
      this.skipWs()

      const ch = this.peek()
      if (ch === ',') {
        this.pos++
        continue
      }
      if (ch === closer) {
        this.pos++
        return result
      }
      this.fail(`字段 ${key} 之后缺少 , 或 ${closer}`)
    }
  }

  private readFieldName(): string {
    const matched = matchAt(CLASS_NAME, this.text, this.pos)
    if (!matched) this.fail('缺少字段名')

    let index = this.pos + matched[0].length
    while (isWs(this.text[index])) index++
    if (this.text[index] !== '=') this.fail(`字段名 ${matched[0]} 之后缺少 =`)

    this.pos = index + 1
    return matched[0]
  }

  private parseList(): unknown[] {
    this.pos++
    const result: unknown[] = []
    this.skipWs()
    if (this.peek() === ']') {
      this.pos++
      return result
    }

    this.stack.push({ kind: 'list', closer: ']' })
    for (;;) {
      this.skipWs()
      result.push(this.parseValue())
      this.skipWs()

      const ch = this.peek()
      if (ch === ',') {
        this.pos++
        continue
      }
      if (ch === ']') {
        this.pos++
        break
      }
      this.fail('列表元素之后缺少 , 或 ]')
    }
    this.stack.pop()
    return result
  }

  private parseMap(): Record<string, unknown> {
    this.pos++
    const result: Record<string, unknown> = {}
    this.skipWs()
    if (this.peek() === '}') {
      this.pos++
      return result
    }

    this.stack.push({ kind: 'map', closer: '}' })
    for (;;) {
      this.skipWs()
      const key = this.readMapKey()
      result[key] = this.parseValue()
      this.skipWs()

      const ch = this.peek()
      if (ch === ',') {
        this.pos++
        continue
      }
      if (ch === '}') {
        this.pos++
        break
      }
      this.fail(`Map 键 ${key} 之后缺少 , 或 }`)
    }
    this.stack.pop()
    return result
  }

  /** Map 的键可以是中文等任意文本，扫到同层的 = 为止 */
  private readMapKey(): string {
    const start = this.pos
    let depth = 0

    while (this.pos < this.text.length) {
      const ch = this.text[this.pos]
      if (depth === 0 && (ch === '=' || ch === ',')) break
      if (ch in OPENER_TO_CLOSER) depth++
      else if (CLOSERS.includes(ch)) {
        if (depth === 0) break
        depth--
      }
      this.pos++
    }

    if (this.text[this.pos] !== '=') this.fail('Map 键之后缺少 =')
    const key = this.text.slice(start, this.pos).trim()
    this.pos++
    return key
  }

  /* ---------------- 标量 ---------------- */

  private parseScalar(): unknown {
    const start = this.pos
    this.pos = this.scanScalarEnd(start, true)
    // Java toString 不会给值补空白，首尾空白只可能来自换行排版，去掉；值内部的空白保留
    return coerceScalar(this.text.slice(start, this.pos).trim())
  }

  /**
   * 找出标量的结束位置。trackDepth 为真时把成对的括号当作文本跳过；
   * 若因为括号不成对一路扫到结尾，则退回不看括号再扫一遍。
   */
  private scanScalarEnd(from: number, trackDepth: boolean): number {
    const { text } = this
    const current = this.container(1)
    const parent = this.container(2)
    let depth = 0
    let index = from

    while (index < text.length) {
      const ch = text[index]

      if (trackDepth) {
        if (ch in OPENER_TO_CLOSER) {
          depth++
          index++
          continue
        }
        if (depth > 0 && CLOSERS.includes(ch)) {
          depth--
          index++
          continue
        }
      }

      if (depth === 0 && current) {
        if (ch === ',' && this.isSeparatorAt(index, current)) return index
        if (ch === current.closer && this.canCloseAt(index, parent)) return index
      }
      index++
    }

    if (trackDepth && depth > 0) return this.scanScalarEnd(from, false)
    return text.length
  }

  /** 逗号是不是同层分隔符：列表里任何逗号都算，对象 / Map 里要求后面跟着 `键=` */
  private isSeparatorAt(index: number, current: Container): boolean {
    if (current.kind === 'list') return true
    return this.hasAssignAfter(index + 1, current.kind)
  }

  /**
   * 闭合符是真的闭合，还是值里的一个普通字符？
   * 判据是「闭合之后父容器能不能顺理成章地接下去」：
   * 例如 `名称（2025.1.16), spuShortname=` 里父容器是列表，
   * 而 `, spuShortname=` 是字段写法，说明这个 ) 属于文本而不是闭合。
   */
  private canCloseAt(index: number, parent: Container | undefined): boolean {
    let next = index + 1
    while (isWs(this.text[next])) next++
    if (next >= this.text.length) return true

    const ch = this.text[next]
    if (CLOSERS.includes(ch)) return true
    if (ch !== ',') return true

    const assign = this.hasAssignAfter(next + 1, parent?.kind)
    if (!parent || parent.kind === 'list') return !assign
    return assign
  }

  /** 从 index 起（跳过空白）是不是 `键=` */
  private hasAssignAfter(index: number, kind: ContainerKind | undefined): boolean {
    let next = index
    while (isWs(this.text[next])) next++
    const re = kind === 'map' ? MAP_KEY_ASSIGN : IDENT_ASSIGN
    return matchAt(re, this.text, next) !== null
  }
}

/** 粗筛：内容是否值得按 Java toString 去解析 */
export const looksLikeJavaToString = (text: string) => {
  const value = text.trim()
  if (!value) return false
  if (TYPED_OBJECT_HINT.test(value)) return true
  return /^[[{]/.test(value) && MAP_ENTRY_HINT.test(value)
}

export const parseJavaToString = (text: string): JavaToStringParseResult => {
  try {
    const value = new JavaToStringParser(text).parse()
    if (value === null || typeof value !== 'object') {
      return { ok: false, error: '内容不是 Java toString 结构' }
    }
    return { ok: true, value }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}
