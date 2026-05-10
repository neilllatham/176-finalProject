import { useId, useState } from 'react'
import './Panel3Governance.css'

function OrgBranchChart({ top, reports, note, ariaLabel, wide }) {
  const count = reports.length
  const rootClass = [
    'panel3-exec-chart-visual',
    wide ? 'panel3-exec-chart-visual--wide' : '',
    count > 3 ? 'panel3-exec-chart-visual--many-reports' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      className={rootClass}
      style={{ '--chart-cols': count }}
      role="img"
      aria-label={ariaLabel}
    >
      <div className="panel3-exec-chart-tier panel3-exec-chart-tier--ceo">
        <span className="panel3-exec-chart-node">{top}</span>
      </div>
      <div className="panel3-exec-chart-branch" aria-hidden>
        <span className="panel3-exec-chart-stem" />
        <span className="panel3-exec-chart-bar" />
        <div className="panel3-exec-chart-drops">
          {reports.map((_, i) => (
            <span key={i} className="panel3-exec-chart-drop" />
          ))}
        </div>
      </div>
      <div className="panel3-exec-chart-tier panel3-exec-chart-tier--reports">
        {reports.map((label) => (
          <span key={label} className="panel3-exec-chart-node">
            {label}
          </span>
        ))}
      </div>
      <p className="panel3-exec-chart-note">{note}</p>
    </div>
  )
}

function OrgChartToggleButton({ expanded, onToggle, controlsId, labelExpand, labelCollapse }) {
  return (
    <button
      type="button"
      className="panel3-org-add-btn"
      aria-expanded={expanded}
      aria-controls={controlsId}
      aria-label={expanded ? labelCollapse : labelExpand}
      onClick={onToggle}
    >
      <svg
        className="panel3-org-add-btn-icon"
        viewBox="0 0 24 24"
        width="14"
        height="14"
        aria-hidden
      >
        {expanded ? (
          <path
            fill="none"
            stroke="currentColor"
            strokeWidth="2.75"
            strokeLinecap="square"
            d="M5 12h14"
          />
        ) : (
          <path
            fill="none"
            stroke="currentColor"
            strokeWidth="2.75"
            strokeLinecap="square"
            d="M12 5v14M5 12h14"
          />
        )}
      </svg>
    </button>
  )
}

const GOVERNANCE_BOARDS = [
  {
    name: 'Executive Steering Board',
    description:
      'Owns executive sponsorship, strategic alignment, funding approvals, and enterprise risk decisions.',
  },
  {
    name: 'Cloud Governance Board',
    description:
      'Defines cloud standards, AWS operating model, account structure, tagging strategy, and governance policies.',
  },
  {
    name: 'Security & Compliance Board',
    description:
      'Oversees SOC 2, HIPAA, and ISO 27001 compliance, audit readiness, and security controls.',
  },
  {
    name: 'Architecture Review Board',
    description:
      'Reviews cloud architecture, resiliency, encryption standards, scalability, and technical risks.',
  },
  {
    name: 'Migration Execution Team',
    description:
      'Executes migration activities, testing, deployment, remediation, and cutover planning.',
  },
  {
    name: 'Operations / FinOps Team',
    description:
      'Monitors cloud operations, uptime, cloud cost optimization, monitoring, and operational KPIs.',
  },
]

const COMPLIANCE_FRAMEWORKS = [
  {
    key: 'soc2',
    name: 'SOC 2',
    description:
      'Ensures security, availability, and operational control monitoring.',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden>
        <path
          fill="currentColor"
          d="M12 1 3 4v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V4l-9-3zm-1 15-4-4 1.41-1.41L11 14.17l6.29-6.29L18.71 9 11 16.71z"
        />
      </svg>
    ),
  },
  {
    key: 'hipaa',
    name: 'HIPAA',
    description: 'Protects sensitive healthcare and medical claims data.',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden>
        <path
          fill="currentColor"
          d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-1 11h-4v4h-2v-4H8v-2h4V8h2v4h4v2z"
        />
      </svg>
    ),
  },
  {
    key: 'iso',
    name: 'ISO 27001',
    description:
      'Provides enterprise information security governance standards.',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden>
        <path fill="currentColor" d="M12 2 2 7l10 5 10-5-10-5z" />
        <path
          fill="currentColor"
          d="M2 12l10 5 10-5-2.5-1.25L12 15.5 4.5 10.75 2 12z"
          opacity="0.88"
        />
        <path
          fill="currentColor"
          d="M2 17l10 5 10-5-2.5-1.25L12 20.5 4.5 15.75 2 17z"
          opacity="0.72"
        />
      </svg>
    ),
  },
]

const SECURITY_CONTROLS = [
  {
    title: 'IAM Policy Audits',
    description:
      'Review AWS IAM permissions and least-privilege access policies.',
  },
  {
    title: 'AES-256 Encryption',
    description:
      'Encrypt medical claims data at rest across cloud storage platforms.',
  },
  {
    title: 'TLS Encryption In Transit',
    description:
      'Secure data transmission between applications and AWS services.',
  },
  {
    title: 'Quarterly Access Reviews',
    description:
      'Validate user access rights and remove unauthorized access.',
  },
  {
    title: 'HIPAA Safeguards',
    description:
      'Ensure administrative, physical, and technical healthcare protections.',
  },
  {
    title: 'SOC 2 Monitoring',
    description: 'Continuously monitor operational and security controls.',
  },
  {
    title: 'ISO 27001 Risk Register',
    description: 'Track enterprise technology risks and mitigation actions.',
  },
  {
    title: 'Incident Response Reviews',
    description:
      'Perform recurring incident simulations and response evaluations.',
  },
  {
    title: 'Cloud Cost / FinOps Reviews',
    description:
      'Review cloud spending efficiency and optimization opportunities.',
  },
]

const BUSINESS_KPIS = [
  { metric: '99.9%', label: 'Uptime Target', sub: 'Service availability SLA' },
  {
    metric: '75%',
    label: 'Latency Reduction',
    sub: 'End-to-end claims processing paths',
  },
  {
    metric: '30%',
    label: 'Infrastructure Cost Reduction',
    sub: 'Target vs. legacy on-prem spend',
  },
  {
    metric: 'Improved',
    label: 'Audit Readiness',
    sub: 'Structured evidence for SOC 2 & HIPAA',
  },
]

export function Panel3GovernanceCompliancePanel() {
  const [execSteeringChartOpen, setExecSteeringChartOpen] = useState(false)
  const [cloudGovernanceChartOpen, setCloudGovernanceChartOpen] = useState(false)
  const [securityComplianceChartOpen, setSecurityComplianceChartOpen] =
    useState(false)
  const [architectureReviewChartOpen, setArchitectureReviewChartOpen] =
    useState(false)
  const [migrationExecutionChartOpen, setMigrationExecutionChartOpen] =
    useState(false)
  const [operationsFinOpsChartOpen, setOperationsFinOpsChartOpen] =
    useState(false)
  const execChartPanelId = useId()
  const cloudChartPanelId = useId()
  const securityChartPanelId = useId()
  const architectureChartPanelId = useId()
  const migrationChartPanelId = useId()
  const operationsFinOpsChartPanelId = useId()

  return (
    <main className="migration-panel panel3-governance-page">
      <header className="panel-header panel-header-context">
        <p className="migration-eyebrow">
          Panel 3 · Medical claims migration to AWS
        </p>
        <p className="panel-title-context">
          Governance, Risk &amp; Control Framework
        </p>
        <p className="panel-subtitle panel3-hero-subtitle">
          Governance structure and compliance controls supporting the migration of
          medical claims processing workloads to AWS.
        </p>
      </header>

      <section
        className="panel-card"
        aria-labelledby="panel3-context-heading"
      >
        <h2 id="panel3-context-heading" className="card-heading">
          Business context
        </h2>
        <p className="card-lead">
          This panel supports the cloud migration initiative to move unreliable
          on-premise data centers to AWS—improving uptime, reducing latency,
          strengthening security posture, and maintaining HIPAA and enterprise
          compliance for medical claims processing.
        </p>
      </section>

      <section
        className="panel-card"
        aria-labelledby="panel3-org-heading"
      >
        <h2 id="panel3-org-heading" className="card-heading">
          Governance organizational hierarchy
        </h2>
        <p className="panel3-org-section-lead">
          Executive direction flows through chartered boards and execution teams,
          aligning claims modernization with audit, security, and operational
          standards.
        </p>
        <div className="panel3-org-chart" role="list" aria-label="Governance hierarchy">
          {GOVERNANCE_BOARDS.map((board, index) => (
            <div key={board.name} role="listitem">
              <article className="panel3-org-card">
                <h3 className="panel3-org-card-title">
                  <span className="panel3-org-card-title-text">{board.name}</span>
                  {board.name === 'Executive Steering Board' ? (
                    <OrgChartToggleButton
                      expanded={execSteeringChartOpen}
                      onToggle={() => setExecSteeringChartOpen((open) => !open)}
                      controlsId={execChartPanelId}
                      labelExpand="Show executive reporting chart"
                      labelCollapse="Hide executive reporting chart"
                    />
                  ) : null}
                  {board.name === 'Cloud Governance Board' ? (
                    <OrgChartToggleButton
                      expanded={cloudGovernanceChartOpen}
                      onToggle={() => setCloudGovernanceChartOpen((open) => !open)}
                      controlsId={cloudChartPanelId}
                      labelExpand="Show Cloud Governance reporting chart"
                      labelCollapse="Hide Cloud Governance reporting chart"
                    />
                  ) : null}
                  {board.name === 'Security & Compliance Board' ? (
                    <OrgChartToggleButton
                      expanded={securityComplianceChartOpen}
                      onToggle={() =>
                        setSecurityComplianceChartOpen((open) => !open)
                      }
                      controlsId={securityChartPanelId}
                      labelExpand="Show Security and Compliance reporting chart"
                      labelCollapse="Hide Security and Compliance reporting chart"
                    />
                  ) : null}
                  {board.name === 'Architecture Review Board' ? (
                    <OrgChartToggleButton
                      expanded={architectureReviewChartOpen}
                      onToggle={() =>
                        setArchitectureReviewChartOpen((open) => !open)
                      }
                      controlsId={architectureChartPanelId}
                      labelExpand="Show Architecture Review reporting chart"
                      labelCollapse="Hide Architecture Review reporting chart"
                    />
                  ) : null}
                  {board.name === 'Migration Execution Team' ? (
                    <OrgChartToggleButton
                      expanded={migrationExecutionChartOpen}
                      onToggle={() =>
                        setMigrationExecutionChartOpen((open) => !open)
                      }
                      controlsId={migrationChartPanelId}
                      labelExpand="Show Migration Execution reporting chart"
                      labelCollapse="Hide Migration Execution reporting chart"
                    />
                  ) : null}
                  {board.name === 'Operations / FinOps Team' ? (
                    <OrgChartToggleButton
                      expanded={operationsFinOpsChartOpen}
                      onToggle={() =>
                        setOperationsFinOpsChartOpen((open) => !open)
                      }
                      controlsId={operationsFinOpsChartPanelId}
                      labelExpand="Show Operations and FinOps reporting chart"
                      labelCollapse="Hide Operations and FinOps reporting chart"
                    />
                  ) : null}
                </h3>
                <p className="panel3-org-card-desc">{board.description}</p>
                {board.name === 'Executive Steering Board' && execSteeringChartOpen ? (
                  <div
                    id={execChartPanelId}
                    className="panel3-exec-chart"
                    role="region"
                    aria-label="Executive reporting structure"
                  >
                    <OrgBranchChart
                      top="CEO"
                      reports={['CFO', 'CTO', 'COO']}
                      note="CFO, CTO, and COO report to the CEO."
                      ariaLabel="Organization chart: CFO, CTO, and COO report to the CEO."
                    />
                  </div>
                ) : null}
                {board.name === 'Cloud Governance Board' && cloudGovernanceChartOpen ? (
                  <div
                    id={cloudChartPanelId}
                    className="panel3-exec-chart"
                    role="region"
                    aria-label="Cloud Governance reporting structure"
                  >
                    <OrgBranchChart
                      top="ELT"
                      reports={[
                        'CIO',
                        'Chief Architect',
                        'FinOps',
                        'Platform Head',
                        'Applications Head',
                      ]}
                      note="CIO, Chief Architect, FinOps, Platform Head, and Applications Head report to the ELT."
                      ariaLabel="Organization chart: CIO, Chief Architect, FinOps, Platform Head, and Applications Head report to the ELT."
                      wide
                    />
                  </div>
                ) : null}
                {board.name === 'Security & Compliance Board' &&
                securityComplianceChartOpen ? (
                  <div
                    id={securityChartPanelId}
                    className="panel3-exec-chart"
                    role="region"
                    aria-label="Security and Compliance reporting structure"
                  >
                    <OrgBranchChart
                      top="CTO"
                      reports={[
                        'CISO',
                        'Chief Architect',
                        'Compliance Head',
                        'Chief Controls Officer',
                      ]}
                      note="CISO, Chief Architect, Compliance Head, and Chief Controls Officer report to the CTO."
                      ariaLabel="Organization chart: CISO, Chief Architect, Compliance Head, and Chief Controls Officer report to the CTO."
                      wide
                    />
                  </div>
                ) : null}
                {board.name === 'Architecture Review Board' &&
                architectureReviewChartOpen ? (
                  <div
                    id={architectureChartPanelId}
                    className="panel3-exec-chart"
                    role="region"
                    aria-label="Architecture Review reporting structure"
                  >
                    <OrgBranchChart
                      top="Head CIO"
                      reports={[
                        'Chief Architect',
                        'CISO',
                        'Head of Biz Apps',
                        'Head of Customer Apps',
                        'Head of Platform',
                      ]}
                      note="Chief Architect, CISO, Head of Biz Apps, Head of Customer Apps, and Head of Platform report to the Head CIO."
                      ariaLabel="Organization chart: Chief Architect, CISO, Head of Biz Apps, Head of Customer Apps, and Head of Platform report to the Head CIO."
                      wide
                    />
                  </div>
                ) : null}
                {board.name === 'Migration Execution Team' &&
                migrationExecutionChartOpen ? (
                  <div
                    id={migrationChartPanelId}
                    className="panel3-exec-chart"
                    role="region"
                    aria-label="Migration Execution reporting structure"
                  >
                    <OrgBranchChart
                      top="Head CIO"
                      reports={[
                        'Head of Platform',
                        'Head of Biz Apps',
                        'Head of Customer Apps',
                        'Business Owners',
                      ]}
                      note="Head of Platform, Head of Biz Apps, Head of Customer Apps, and Business Owners report to the Head CIO."
                      ariaLabel="Organization chart: Head of Platform, Head of Biz Apps, Head of Customer Apps, and Business Owners report to the Head CIO."
                      wide
                    />
                  </div>
                ) : null}
                {board.name === 'Operations / FinOps Team' &&
                operationsFinOpsChartOpen ? (
                  <div
                    id={operationsFinOpsChartPanelId}
                    className="panel3-exec-chart"
                    role="region"
                    aria-label="Operations and FinOps reporting structure"
                  >
                    <OrgBranchChart
                      top="CTO"
                      reports={[
                        'FinOps',
                        'Head of Business Apps',
                        'Head of Customer Apps',
                        'Head of Platform',
                      ]}
                      note="FinOps, Head of Business Apps, Head of Customer Apps, and Head of Platform report to the CTO."
                      ariaLabel="Organization chart: FinOps, Head of Business Apps, Head of Customer Apps, and Head of Platform report to the CTO."
                      wide
                    />
                  </div>
                ) : null}
              </article>
              {index < GOVERNANCE_BOARDS.length - 1 ? (
                <div className="panel3-org-connector" aria-hidden />
              ) : null}
            </div>
          ))}
        </div>
      </section>

      <section
        className="panel-card"
        aria-labelledby="panel3-frameworks-heading"
      >
        <h2 id="panel3-frameworks-heading" className="card-heading">
          Compliance frameworks
        </h2>
        <p className="card-lead">
          Frameworks in scope for this migration program. Each is actively
          maintained with aligned policies, evidence collection, and executive
          reporting.
        </p>
        <p className="card-lead">
          The CISO is responsible for compliance to these frameworks, and will
          supply the auditing and controls required to ensure compliance.
        </p>
        <div className="panel3-framework-row">
          {COMPLIANCE_FRAMEWORKS.map((fw) => (
            <article
              key={fw.key}
              className="panel3-framework-card"
              aria-labelledby={`panel3-fw-${fw.key}`}
            >
              <div className="panel3-framework-icon">{fw.icon}</div>
              <h3 id={`panel3-fw-${fw.key}`} className="panel3-framework-name">
                {fw.name}
              </h3>
              <p className="panel3-framework-desc">{fw.description}</p>
              <span className="panel3-status-pill">Active</span>
            </article>
          ))}
        </div>
      </section>

      <section
        className="panel-card"
        aria-labelledby="panel3-matrix-heading"
      >
        <h2 id="panel3-matrix-heading" className="card-heading">
          Security &amp; control matrix
        </h2>
        <p className="card-lead">
          Key technical and operational controls underpinning HIPAA-covered claims
          data in AWS—with continuous monitoring tied to SOC 2 and ISO 27001
          commitments.
        </p>
        <p className="card-lead">
          The CIO and CISO are jointly responsible for compliance to Security and
          Controls.
        </p>
        <div className="panel3-control-grid">
          {SECURITY_CONTROLS.map((ctrl) => (
            <article key={ctrl.title} className="panel3-control-card">
              <h3 className="panel3-control-title">{ctrl.title}</h3>
              <p className="panel3-control-desc">{ctrl.description}</p>
              <span className="panel3-status-pill panel3-status-pill--operational">
                Operational
              </span>
            </article>
          ))}
        </div>
      </section>

      <section
        className="panel-card"
        aria-labelledby="panel3-outcomes-heading"
      >
        <h2 id="panel3-outcomes-heading" className="card-heading">
          Target business outcomes
        </h2>
        <p className="card-lead">
          Program-level KPIs aligning infrastructure modernization with payer and
          regulator expectations for availability, performance, cost, and
          auditability.
        </p>
        <div className="panel3-kpi-row">
          {BUSINESS_KPIS.map((k) => (
            <article key={k.label} className="panel3-kpi-card">
              <p className="panel3-kpi-value">{k.metric}</p>
              <div className="panel3-kpi-meta">
                <p className="panel3-kpi-label">{k.label}</p>
                <p className="panel3-kpi-sub">{k.sub}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}
