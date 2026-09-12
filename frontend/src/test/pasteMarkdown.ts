import { fireEvent } from '@testing-library/react'

/** 通过真实编辑面的粘贴入口驱动表单，避免隐藏输入框掩盖编辑器缺陷。 */
export function pasteMarkdown(editor: HTMLElement, markdown: string) {
  fireEvent.paste(editor, {
    clipboardData: { getData: (type: string) => type === 'text/plain' ? markdown : '' },
  })
}
