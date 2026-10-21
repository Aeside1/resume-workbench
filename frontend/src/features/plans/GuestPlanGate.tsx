import { Button, Card } from '@heroui/react'
import { FileText, LockKeyhole } from 'lucide-react'

export type GuestPlanGateProps = {
  onRequestAuth?: () => void
}

/**
 * 游客态的简历方案入口（ADR 008 §2.3）。
 *
 * 简历方案是账号能力：组合、留档与文稿装配都依赖服务端，游客态不提供，
 * 但入口照常可见——用户要先知道这块能力存在，才知道登录能换来什么。
 */
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
            简历方案要把经历资产组合成面向某个岗位的一版简历，并保留不可变的修订与导出记录——这些都需要账号来保存。
            游客模式可以先把经历资产试写顺手，登录后再回来组合。
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
