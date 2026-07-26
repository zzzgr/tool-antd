/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

declare module 'gif.js' {
  interface GIFOptions {
    workers?: number
    quality?: number
    width?: number
    height?: number
    workerScript?: string
    repeat?: number
    background?: string
    transparent?: string | number | null
    dither?: boolean | string
    debug?: boolean
  }

  interface AddFrameOptions {
    delay?: number
    copy?: boolean
    dispose?: number
  }

  export default class GIF {
    constructor(options?: GIFOptions)
    addFrame(
      image: CanvasImageSource | CanvasRenderingContext2D | ImageData,
      options?: AddFrameOptions
    ): void
    on(event: 'progress', cb: (progress: number) => void): void
    on(event: 'finished', cb: (blob: Blob) => void): void
    on(event: 'abort', cb: () => void): void
    render(): void
    abort(): void
  }
}
