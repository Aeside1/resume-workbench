import { MilkdownView } from '../../components/ui/MilkdownView'

export type PlanDocumentViewProps = {
  markdown: string
}

/**
 * 简历文稿预览（只读）。渲染的就是下载与导出快照使用的那份 Markdown
 * （读时装配，与中栏共用同一份结果，NFR-02）。
 */
export function PlanDocumentView({ markdown }: PlanDocumentViewProps) {
  return (
    <div className="plan-document-view" aria-label="简历文稿预览">
      <MilkdownView content={markdown} placeholder="简历大纲还是空的：先添加一段经历，再把简历亮点挑进来。" />
    </div>
  )
}
