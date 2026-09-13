import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { EditorView } from '@milkdown/prose/view'
import type { EditorState } from '@milkdown/prose/state'
import { liveParser, markdownToHtml, serializeMarkdown } from './liveMarkdown'
import { createLiveEditorState } from './liveEditorState'
import { MilkdownToolbar } from './MilkdownToolbar'
import '@milkdown/prose/view/style/prosemirror.css'

export { markdownToHtml } from './liveMarkdown'
export { MilkdownToolbar } from './MilkdownToolbar'

export interface MilkdownViewProps {
  content?: string | null
  className?: string
  placeholder?: string
}

export function MilkdownView({
  content,
  className = '',
  placeholder = '暂无记录内容',
}: MilkdownViewProps) {
  const html = useMemo(() => markdownToHtml(content || ''), [content])
  if (!content?.trim()) return <p className="typography-text text-muted">{placeholder}</p>
  return <div className={'milkdown-view-container markdown-body-render ' + className}
    dangerouslySetInnerHTML={{ __html: html }} />
}

export interface MilkdownEditorProps {
  value: string
  onChange: (val: string) => void
  placeholder?: string
  rows?: number
  className?: string
  id?: string
  cacheKey?: string
  showToolbar?: boolean
}

/** 页面生命周期内的 EditorState 缓存，保持 Undo/Redo 历史栈跨编辑进出不被销毁 */
const globalEditorStateCache = new Map<string, EditorState>()

export function clearMilkdownEditorCache(key?: string) {
  if (key) {
    globalEditorStateCache.delete(key)
  } else {
    globalEditorStateCache.clear()
  }
}

/** React 只拥有宿主节点；编辑 DOM、选区、输入法与撤销栈由 ProseMirror 管理。 */
export function MilkdownEditor({
  value,
  onChange,
  placeholder = '在此输入工作内容...',
  rows = 3,
  className = '',
  id,
  cacheKey,
  showToolbar = true,
}: MilkdownEditorProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const changeRef = useRef(onChange)
  const initialValueRef = useRef(value)
  const publishedRef = useRef(value)
  const [editorState, setEditorState] = useState<EditorState | null>(null)

  useLayoutEffect(() => { changeRef.current = onChange }, [onChange])

  useLayoutEffect(() => {
    let completionTimer: ReturnType<typeof setTimeout> | undefined
    const publish = (view: EditorView) => {
      if (view.isDestroyed || view.composing) return
      const markdown = serializeMarkdown(view.state.doc)
      if (markdown !== publishedRef.current) {
        publishedRef.current = markdown
        changeRef.current(markdown)
      }
    }
    const publishAfterComposition = (view: EditorView) => {
      clearTimeout(completionTimer)
      // 等待浏览器的最终 input 与 ProseMirror 的 compositionend 输入规则完成。
      completionTimer = setTimeout(() => publish(view), 0)
      return false
    }

    // 尝试从页面级缓存恢复之前的 EditorState，以保持完整的 Undo/Redo 历史栈
    let initialState: EditorState
    const cachedState = cacheKey ? globalEditorStateCache.get(cacheKey) : null
    if (cachedState) {
      const cachedMarkdown = serializeMarkdown(cachedState.doc)
      if (cachedMarkdown === initialValueRef.current) {
        initialState = cachedState
      } else {
        // 如果外部传入的值发生变化，通过 transaction 将新内容写入已有 state，保留其历史栈
        const newDoc = liveParser.parse(initialValueRef.current)
        if (!newDoc.eq(cachedState.doc)) {
          const tr = cachedState.tr.replaceWith(0, cachedState.doc.content.size, newDoc.content)
          initialState = cachedState.apply(tr)
        } else {
          initialState = cachedState
        }
      }
    } else {
      initialState = createLiveEditorState(initialValueRef.current)
    }

    if (cacheKey) {
      globalEditorStateCache.set(cacheKey, initialState)
    }

    const view = new EditorView(hostRef.current!, {
      state: initialState,
      dispatchTransaction(transaction) {
        const nextState = view.state.apply(transaction)
        view.updateState(nextState)
        setEditorState(nextState)
        if (cacheKey) {
          globalEditorStateCache.set(cacheKey, nextState)
        }
        if (transaction.docChanged) publish(view)
      },
      handleDOMEvents: {
        compositionend: publishAfterComposition,
        blur: publishAfterComposition,
      },
      handlePaste(view, event) {
        const markdown = event.clipboardData?.getData('text/plain')
        if (!markdown || event.clipboardData?.getData('text/html') || view.composing) return false
        // 在代码块内保持原文；其他纯文本粘贴按同一 Markdown 规则解析。
        if (view.state.selection.$from.parent.type.spec.code) return false
        view.dispatch(view.state.tr.replaceSelection(
          liveParser.parse(markdown).slice(0, undefined, true),
        ).scrollIntoView())
        return true
      },
    })
    viewRef.current = view
    setEditorState(initialState)

    return () => {
      clearTimeout(completionTimer)
      viewRef.current = null
      view.destroy()
    }
  }, [cacheKey])

  useLayoutEffect(() => {
    const view = viewRef.current
    if (!view) return
    view.setProps({ attributes: state => ({
      id: id || '',
      role: 'textbox',
      'aria-multiline': 'true',
      ...(id ? { 'aria-labelledby': id + '-label' } : { 'aria-label': placeholder }),
      'data-placeholder': placeholder,
      'data-empty': String(state.doc.childCount === 1 && state.doc.firstChild?.type.name === 'paragraph' && state.doc.firstChild.content.size === 0),
      class: 'milkdown-live-content markdown-body-render',
      style: 'min-height: ' + rows * 28 + 'px',
    }) })
    const label = id ? document.getElementById(id + '-label') : null
    const focus = () => view.focus()
    label?.addEventListener('click', focus)
    return () => label?.removeEventListener('click', focus)
  }, [id, placeholder, rows])

  useLayoutEffect(() => {
    const view = viewRef.current
    // 父表单回传本次输入只作确认，不回写 DOM；聚焦/组词中的本地草稿优先。
    if (!view || value === publishedRef.current || view.hasFocus() || view.composing) return
    const doc = liveParser.parse(value)
    publishedRef.current = value
    if (!doc.eq(view.state.doc)) {
      const nextState = createLiveEditorState(doc)
      view.updateState(nextState)
      setEditorState(nextState)
      if (cacheKey) {
        globalEditorStateCache.set(cacheKey, nextState)
      }
    }
  }, [value, cacheKey])

  return (
    <div className={`milkdown-editor-wrapper ${className}`}>
      {showToolbar && (
        <MilkdownToolbar view={viewRef.current} state={editorState} />
      )}
      <div ref={hostRef} className="milkdown-live-editor" />
    </div>
  )
}

