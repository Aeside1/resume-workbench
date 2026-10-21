/**
 * 带 HTTP 状态码的接口错误。
 *
 * 调用方需要区分「被引用而拒绝删除（409）」与一般失败，才能决定用哪种反馈方式
 * （阻断性弹窗 vs 内联提示），因此不能在抛出时丢掉 status。
 *
 * 单独成文件是为了让浏览器本地草稿后端（guest/backend.ts）与 HTTP 后端共用同一个
 * 错误类型，而不用互相 import 造成运行时循环依赖。
 */
export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

/** 是否属于「被简历方案引用」而拒绝删除（409） */
export function isReferenceBlocked(error: unknown): boolean {
  return error instanceof ApiError && error.status === 409
}
