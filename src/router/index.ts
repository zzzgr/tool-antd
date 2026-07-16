import { createRouter, createWebHashHistory } from 'vue-router'
import NProgress from 'nprogress'
import 'nprogress/nprogress.css'

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'index',
      component: () => import('@/views/index.vue')
    },
    {
      path: '/timestamp',
      name: 'timestamp',
      component: () => import('@/views/timestamp/index.vue'),
      meta: {
        title: '时间戳转换'
      }
    },
    {
      path: '/json',
      name: 'json',
      component: () => import('@/views/json/TabIndex.vue'),
      meta: {
        title: 'JSON'
      }
    },
    {
      path: '/xml',
      name: 'xml',
      component: () => import('@/views/xml/index.vue'),
      meta: {
        title: 'XML 格式化'
      }
    },
    {
      path: '/picbed',
      name: 'picbed',
      component: () => import('@/views/picbed/index.vue'),
      meta: {
        title: '图床'
      }
    },
    {
      path: '/codec',
      name: 'codec',
      component: () => import('@/views/codec/index.vue'),
      meta: {
        title: '编解码'
      }
    },
    {
      path: '/qr',
      name: 'qr',
      component: () => import('@/views/qr/index.vue'),
      meta: {
        title: '二维码制作'
      }
    },
    {
      path: '/textShare',
      name: 'textShare',
      component: () => import('@/views/textShare/index.vue'),
      meta: {
        title: '文本分享'
      }
    },
    {
      path: '/ace',
      name: 'ace',
      component: () => import('@/views/ace/index.vue'),
      meta: {
        title: '代码编辑器'
      }
    },
    {
      path: '/diff',
      name: 'editorDiff',
      component: () => import('@/views/editorDiff/index.vue'),
      meta: {
        title: '文本比较'
      }
    },

    {
      path: '/textproc',
      name: 'textproc',
      component: () => import('@/views/textproc/index.vue'),
      meta: {
        title: '文本处理'
      }
    },

    {
      path: '/videoparse',
      name: 'videoparse',
      component: () => import('@/views/videoparse/index.vue'),
      meta: {
        title: '视频解析'
      }
    },

    {
      path: '/ua',
      name: 'ua',
      component: () => import('@/views/ua/index.vue'),
      meta: {
        title: 'ua'
      }
    },

    {
      path: '/gifscroll',
      name: 'gifscroll',
      component: () => import('@/views/gifscroll/index.vue'),
      meta: {
        title: 'GIF滚动生成'
      }
    },

    {
      path: '/uuid',
      name: 'uuid',
      component: () => import('@/views/uuid/index.vue'),
      meta: {
        title: 'UUID 生成'
      }
    },

    {
      path: '/regex',
      name: 'regex',
      component: () => import('@/views/regex/index.vue'),
      meta: {
        title: '正则测试'
      }
    },

    {
      path: '/imgbase64',
      name: 'imgbase64',
      component: () => import('@/views/imgbase64/index.vue'),
      meta: {
        title: '图片 Base64'
      }
    },

    { path: '/:pathMatch(.*)', redirect: '/' }
  ]
})

router.beforeEach((to, from, next) => {
  NProgress.start()
  if (to.meta.title) {
    document.title = `${to.meta.title}`
  } else {
    document.title = '工具箱'
  }
  next()
})

router.afterEach(() => {
  NProgress.done()
})

export default router
