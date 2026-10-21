import { Button, Card } from '@heroui/react'
import { BookOpen, LogIn } from 'lucide-react'

export type GuestBannerProps = {
  onRequestAuth?: () => void
}

export function GuestBanner({ onRequestAuth }: GuestBannerProps) {
  return (
    <Card className="guest-banner" role="region" aria-label="游客模式说明">
      <Card.Content className="guest-banner-content">
        <span className="guest-banner-icon" aria-hidden="true">
          <BookOpen size={18} />
        </span>
        <div className="guest-banner-text">
          <p className="guest-banner-title">示例内容 · 只读</p>
          <p className="guest-banner-copy">登录后可以创建、编辑并保存你的经历资产与简历方案。</p>
        </div>
        <div className="guest-banner-actions">
          <Button size="sm" variant="primary" onPress={onRequestAuth}>
            <LogIn size={14} aria-hidden="true" />
            <span>登录 / 注册</span>
          </Button>
        </div>
      </Card.Content>
    </Card>
  )
}
