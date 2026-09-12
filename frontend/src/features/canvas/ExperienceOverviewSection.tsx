import type { ExperienceGroup } from '../../api'

export type ExperienceOverviewSectionProps = {
  group: ExperienceGroup
}

export function ExperienceOverviewSection({ group }: ExperienceOverviewSectionProps) {
  const isInternship = group.type === 'internship'
  const hasDates = Boolean(group.start_date || group.end_date)

  return (
    <section
      id="section-overview"
      className="focus-experience-overview"
      aria-label="经历概况"
    >
      <div className="overview-header-row">
        <div>
          <span className={`overview-type-pill ${group.type}`}>
            {isInternship ? '实习经历' : '项目经历'}
          </span>
          <h2 className="overview-title">{group.name}</h2>
          <p className="overview-org-date">
            <span>{group.organization || '未填写归属'}</span>
            {hasDates && (
              <>
                <span className="dot-divider" aria-hidden="true">·</span>
                <span>
                  {group.start_date || '至今'} — {group.end_date || '至今'}
                </span>
              </>
            )}
          </p>
        </div>
      </div>

      {group.description && (
        <div className="overview-description-box">
          <p>{group.description}</p>
        </div>
      )}
    </section>
  )
}
