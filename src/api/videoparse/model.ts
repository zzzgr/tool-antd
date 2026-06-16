export interface VideoParseRequest {
  s: string
}

export interface VideoParseResponse {
  type: number
  nickname: string
  title: string
  cover: string
  urls: string[]
}
