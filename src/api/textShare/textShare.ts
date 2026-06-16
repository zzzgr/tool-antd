import { request } from '@/util/http'
import type { TextShareGetResponse, TextShareRequest, TextShareResponse } from './model'

export const textShareApi = (data: TextShareRequest) => {
  return request<TextShareResponse>(`/text/share`, 'post', data)
}

export const textShareGetApi = (key: string) => {
  return request<TextShareGetResponse>(`/text/get?key=${key}`, 'get')
}
