import { FormEvent, useState } from 'react'
import { Button, Input, TextArea } from '@heroui/react'
import type { ExperienceGroup, WorkContent } from '../../api'
import { ExperienceOverviewSection } from './ExperienceOverviewSection'
import { WorkContentBlock, ContentDraft } from './WorkContentBlock'

export type FocusCanvasDocumentProps = {
  group: ExperienceGroup
  contents: WorkContent[]
  editingId: number | null
  isCreatingNew: boolean
  onStartEdit: (item: WorkContent) => void
  onCancelEdit: () => void
  onSaveContent: (draft: ContentDraft, editingId: number | null) => Promise<void> | void
  onMoveContent: (index: number, direction: -1 | 1) => void
  onArchiveContent: (item: WorkContent) => void
  onStartCreateNew: () => void
  onCancelCreateNew: () => void
}

const emptyNewDraft: ContentDraft = {
  title: '',
  detailed_record: '',
  technical_materials: '',
  result_data: '',
  supplementary_notes: ''
}

export function FocusCanvasDocument({
  group,
  contents,
  editingId,
  isCreatingNew,
  onStartEdit,
  onCancelEdit,
  onSaveContent,
  onMoveContent,
  onArchiveContent,
  onStartCreateNew,
  onCancelCreateNew
}: FocusCanvasDocumentProps) {
  const [newDraft, setNewDraft] = useState<ContentDraft>(emptyNewDraft)

  const handleCreateSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!newDraft.title.trim()) return
    onSaveContent(newDraft, null)
    setNewDraft(emptyNewDraft)
  }

  const handleCancelNew = () => {
    setNewDraft(emptyNewDraft)
    onCancelCreateNew()
  }

  return (
    <div className="focus-canvas-document">
      <ExperienceOverviewSection group={group} />

      <section className="focus-work-contents-section" aria-label="具体工作内容列表">
        <div className="work-contents-header">
          <div className="work-contents-header-title">
            <h3 className="section-title">具体工作内容</h3>
            <span className="section-badge">{contents.length} 条</span>
          </div>
        </div>

        <div className="work-contents-list">
          {contents.map((item, index) => (
            <WorkContentBlock
              key={item.id}
              item={item}
              index={index}
              totalCount={contents.length}
              isEditing={editingId === item.id}
              onStartEdit={() => onStartEdit(item)}
              onCancelEdit={onCancelEdit}
              onSave={(draft) => onSaveContent(draft, item.id)}
              onMove={(direction) => onMoveContent(index, direction)}
              onArchive={() => onArchiveContent(item)}
            />
          ))}

          {isCreatingNew ? (
            <article className="work-content-card creating-new-card" aria-label="新建具体工作内容">
              <form className="work-content-edit-form" onSubmit={handleCreateSubmit}>
                <div className="edit-form-header">
                  <span className="edit-form-kicker">+ 新建具体工作内容</span>
                </div>

                <div className="canvas-field">
                  <label htmlFor="new-wc-title">工作项标题</label>
                  <Input
                    id="new-wc-title"
                    placeholder="例如：主导前端渲染性能专项优化"
                    value={newDraft.title}
                    onChange={(e) => setNewDraft({ ...newDraft, title: e.target.value })}
                    required
                  />
                </div>

                <div className="canvas-field">
                  <label htmlFor="new-wc-record">背景与难点</label>
                  <TextArea
                    id="new-wc-record"
                    placeholder="描述该工作的背景痛点、业务诉求或技术难点..."
                    rows={3}
                    value={newDraft.detailed_record}
                    onChange={(e) => setNewDraft({ ...newDraft, detailed_record: e.target.value })}
                  />
                </div>

                <div className="canvas-field">
                  <label htmlFor="new-wc-materials">技术方案与材料</label>
                  <TextArea
                    id="new-wc-materials"
                    placeholder="记录采用的架构方案、关键技术栈、设计文档或材料链接..."
                    rows={3}
                    value={newDraft.technical_materials}
                    onChange={(e) => setNewDraft({ ...newDraft, technical_materials: e.target.value })}
                  />
                </div>

                <div className="canvas-field">
                  <label htmlFor="new-wc-result">量化结果数据</label>
                  <TextArea
                    id="new-wc-result"
                    placeholder="说明带来的实际收益、性能提升百分比或关键量化业务指标..."
                    rows={2}
                    value={newDraft.result_data}
                    onChange={(e) => setNewDraft({ ...newDraft, result_data: e.target.value })}
                  />
                </div>

                <div className="canvas-field">
                  <label htmlFor="new-wc-notes">补充说明</label>
                  <TextArea
                    id="new-wc-notes"
                    placeholder="可记录专利、团队内分享或后续扩展思考..."
                    rows={2}
                    value={newDraft.supplementary_notes}
                    onChange={(e) => setNewDraft({ ...newDraft, supplementary_notes: e.target.value })}
                  />
                </div>

                <div className="edit-form-actions">
                  <Button
                    type="submit"
                    variant="primary"
                  >
                    添加工作内容
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onPress={handleCancelNew}
                  >
                    取消
                  </Button>
                </div>
              </form>
            </article>
          ) : (
            <button
              type="button"
              className="add-content-dashed-btn"
              onClick={onStartCreateNew}
            >
              <span className="plus-symbol" aria-hidden="true">+</span>
              <span className="btn-text">添加具体工作内容</span>
            </button>
          )}
        </div>
      </section>
    </div>
  )
}
