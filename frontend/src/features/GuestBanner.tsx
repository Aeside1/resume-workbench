import { Button, Card } from '@heroui/react'
import { CloudOff, HardDriveDownload, LogIn, Trash2 } from 'lucide-react'

export type GuestBannerProps = {
  /** 本地已有草稿时才给「清空」入口，避免给出一个点了没反应的按钮 */
  hasLocalDrafts: boolean
  onRequestAuth?: () => void
  onLoadSample: () => void
  onClear: () => void
}

/**
 * 游客态顶层横幅（ADR 008 §2.6）。
 *
 * 未登录工作台的唯一硬约束是「数据只在这台浏览器」——它必须常驻可见，
 * 否则用户会把本地草稿误当成云端数据。右侧三个动作用 HeroUI Button，
 * 图标取 lucide 标准矢量，颜色随语义变量流转（AGENTS.md 第 3/4 条）。
 */
export function GuestBanner({ hasLocalDrafts, onRequestAuth, onLoadSample, onClear }: GuestBannerProps) {
  return (
    <Card className="guest-banner" role="region" aria-label="游客模式说明">
      <Card.Content className="guest-banner-content">
        <span className="guest-banner-icon" aria-hidden="true">
          <CloudOff size={18} />
        </span>
        <div className="guest-banner-text">
          <p className="guest-banner-title">游客模式：数据只保存在这台浏览器</p>
          <p className="guest-banner-copy">
            不用注册就能试写经历分组、具体工作内容与简历亮点；简历方案需要登录后才能使用。本地草稿不会自动同步到账号。
          </p>
        </div>
        <div className="guest-banner-actions">
          <Button size="sm" variant="ghost" onPress={onLoadSample}>
            <HardDriveDownload size={14} aria-hidden="true" />
            <span>{hasLocalDrafts ? '重新载入示例内容' : '载入示例内容'}</span>
          </Button>
          {hasLocalDrafts && (
            <Button size="sm" variant="ghost" onPress={onClear}>
              <Trash2 size={14} aria-hidden="true" />
              <span>清空本地草稿</span>
            </Button>
          )}
          <Button size="sm" variant="primary" onPress={onRequestAuth}>
            <LogIn size={14} aria-hidden="true" />
            <span>登录 / 注册</span>
          </Button>
        </div>
      </Card.Content>
    </Card>
  )
}
