import type { Method } from 'axios'
import axios from 'axios'
import { message } from 'ant-design-vue'
import router from '@/router'

import { useLoadingStore } from '@/stores/loading'
import type { R } from '@/api/global'

const store = useLoadingStore()

// axios对象
const instance = axios.create({
  baseURL: '/api',
  timeout: 30000
})

// 请求拦截器
instance.interceptors.request.use(
  (config) => {
    store.isLoading(true)
    return config
  },
  (error) => {
    store.isLoading(false)
    return Promise.reject(error)
  }
)

// 响应拦截器
instance.interceptors.response.use(
  (response) => {
    store.isLoading(false)
    const { code, msg } = response.data
    if (code != 200) {
      message.error(msg)
      return Promise.reject(msg)
    }
    return response.data
  },
  (error) => {
    store.isLoading(false)
    const response = error.response
    const httpStatus = response.status

    const { code, msg } = response.data
    if (code && msg) {
      message.error(msg)
      return Promise.reject(msg)
    }

    // 再判断状态码
    if (httpStatus == 401) {
      router.push({ path: '/' })
      return Promise.reject(error)
    } else {
      message.error(error.message)
      return Promise.reject(error)
    }
  }
)

// 请求工具函数
const request = <T>(url: string, method: Method = 'get', requestParams?: object) => {
  return instance.request<T, R<T>>({
    url,
    method,
    [method.toLowerCase() === 'get' ? 'params' : 'data']: requestParams
  })
}

export { instance, request }
