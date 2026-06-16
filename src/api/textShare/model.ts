export interface TextShareRequest {
  text: string
  hour: number
}

export interface TextShareResponse {
  key: string
}

export interface TextShareGetResponse {
  text: string
}
