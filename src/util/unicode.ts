//中文转unicode
export function encode(value: string) {
  const preStr = '\\u'
  const cnReg = /[\u0391-\uFFE5]/gm
  return value.replace(cnReg, function (str: string) {
    return preStr + str.charCodeAt(0).toString(16)
  })
}

//unicode转中文
export function decode(ovalue: string) {
  if (ovalue) {
    const uReg = /\\u(\w{4})/gim
    return ovalue.replace(uReg, function (str: string, subs: string) {
      return unescape('%u' + subs)
    })
  }
}
