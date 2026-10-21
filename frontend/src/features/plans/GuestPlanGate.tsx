import { Button, Card } from '@heroui/react'
import { FileText, LockKeyhole } from 'lucide-react'

export type GuestPlanGateProps = {
  onRequestAuth?: () => void
}

export function GuestPlanGate({ onRequestAuth }: GuestPlanGateProps) {
  return (
    <div className="guest-plan-gate">
      <div className="page-heading">
        <div>
          <p className="eyebrow">组合输出</p>
          <h2 className="workbench-title">简历方案</h2>
        </div>
        <p className="page-context">需要登录</p>
      </div>

      <Card role="region" aria-label="简历方案需要登录">
        <Card.Header>
          <div className="guest-plan-gate-title">
            <LockKeyhole size={18} aria-hidden="true" />
            <Card.Title>简历方案需要登录后使用</Card.Title>
          </div>
          <Card.Description className="guest-plan-gate-description">
            登录后可以按岗位组合经历资产、生成简历文稿，并保留修订与导出记录。
          </Card.Description>
        </Card.Header>
        <Card.Content>
          <Button variant="primary" onPress={onRequestAuth}>
            <FileText size={16} aria-hidden="true" />
            <span>登录 / 注册</span>
          </Button>
        </Card.Content>
      </Card>
    </div>
  )
}
