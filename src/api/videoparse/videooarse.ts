import { request } from '@/util/http'
import type { VideoParseRequest, VideoParseResponse } from './model'

export const videoParse = (data: VideoParseRequest) => {
  return request<VideoParseResponse>(`/video-parse`, 'post', data)
}
