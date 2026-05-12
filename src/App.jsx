import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react'
import './App.css'
import { Panel3GovernanceCompliancePanel } from './Panel3Governance.jsx'

const YEARS = [1, 2, 3, 4, 5]

/**
 * Panel 1 — Cash flow detail rows: Table 6 CAPEX line + Table 3B OPEX streams (v2).
 * "Total Cost" is computed as the sum of these rows per period.
 * @see 5-Year Detailed Financial Tables (v2 — Corrected)
 */
const PANEL1_CASHFLOW_DATA_ROWS = [
  {
    label: 'CAPEX (Cloud + AI)',
    years: [4_264_200, 2_842_800, null, null, null],
    fiveYrTotal: 7_107_000,
  },
  {
    label: 'OPEX (On-Premise)',
    years: [20_264_400, 8_105_760, null, null, null],
    fiveYrTotal: 28_370_160,
  },
  {
    label: 'OPEX (Cloud + AI)',
    years: [4_266_960, 10_667_400, 14_223_200, 14_649_896, 15_089_393],
    fiveYrTotal: 58_896_849,
  },
]

function panel1SumCashflowTotals(rows) {
  const yearly = YEARS.map((_, yi) =>
    rows.reduce((sum, r) => {
      const v = r.years[yi]
      return sum + (v == null || !Number.isFinite(v) ? 0 : v)
    }, 0),
  )
  const fiveYr = rows.reduce((sum, r) => sum + r.fiveYrTotal, 0)
  return { yearly, fiveYr }
}

/** Table 1: 60% Year 1, remainder Year 2 (totals preserved). */
function splitPanel1Table1BudgetToYears(totalUsd) {
  const t = Math.max(0, Math.round(Number(totalUsd)) || 0)
  const y1 = Math.round(t * 0.6)
  const y2 = t - y1
  return { total: t, y1, y2 }
}

function sumPanel1Table1LineBudgets(rows) {
  return rows
    .filter((r) => r.t === 'l')
    .reduce(
      (acc, r) => ({
        total: acc.total + (r.total ?? 0),
        y1: acc.y1 + (r.y1 ?? 0),
        y2: acc.y2 + (r.y2 ?? 0),
      }),
      { total: 0, y1: 0, y2: 0 },
    )
}

/** Table 2 on-prem: Y1 = 100% of annual baseline; Y2 = 40%; 5-yr = Y1 + Y2. */
function splitPanel2OnpremBaselineToYears(annualBaselineUsd) {
  const b = Math.max(0, Math.round(Number(annualBaselineUsd)) || 0)
  const y1 = b
  const y2 = Math.round(b * 0.4)
  const fiveYr = y1 + y2
  return { baseline: b, y1, y2, fiveYr }
}

function sumPanel2OnpremLineBudgets(rows) {
  return rows
    .filter((r) => r.t === 'l')
    .reduce(
      (acc, r) => ({
        baseline: acc.baseline + (r.baseline ?? 0),
        y1: acc.y1 + (r.y1 ?? 0),
        y2: acc.y2 + (r.y2 ?? 0),
        fiveYr: acc.fiveYr + (r.fiveYr ?? 0),
      }),
      { baseline: 0, y1: 0, y2: 0, fiveYr: 0 },
    )
}

/**
 * Table 3 cloud: Y1=30%, Y2=75%, Y3=stabilized; Y4=stabilized×(1+g/100);
 * Y5=Y4×(1+g/100). `annualGrowthPct` is the same annual step (e.g. 3 → 3%).
 */
function splitPanel3CloudStabilizedToYears(stabilizedUsd, annualGrowthPct = 3) {
  const s = Math.max(0, Math.round(Number(stabilizedUsd)) || 0)
  const g = Number(annualGrowthPct)
  const r = 1 + (Number.isFinite(g) ? g : 3) / 100
  const y1 = Math.round(s * 0.3)
  const y2 = Math.round(s * 0.75)
  const y3 = s
  const y4 = Math.round(s * r)
  const y5 = Math.round(y4 * r)
  const fiveYr = y1 + y2 + y3 + y4 + y5
  return { stabilized: s, y1, y2, y3, y4, y5, fiveYr }
}

function formatPanel1OpexGrowthPctLabel(p) {
  const n = Number(p)
  if (!Number.isFinite(n)) return '0'
  return n % 1 === 0 ? String(n) : n.toFixed(1)
}

function sumPanel3CloudLineBudgets(rows) {
  return rows
    .filter((r) => r.t === 'l')
    .reduce(
      (acc, r) => ({
        stabilized: acc.stabilized + (r.stabilized ?? 0),
        y1: acc.y1 + (r.y1 ?? 0),
        y2: acc.y2 + (r.y2 ?? 0),
        y3: acc.y3 + (r.y3 ?? 0),
        y4: acc.y4 + (r.y4 ?? 0),
        y5: acc.y5 + (r.y5 ?? 0),
        fiveYr: acc.fiveYr + (r.fiveYr ?? 0),
      }),
      {
        stabilized: 0,
        y1: 0,
        y2: 0,
        y3: 0,
        y4: 0,
        y5: 0,
        fiveYr: 0,
      },
    )
}

/**
 * Table 1 — Capital Expenditure (CAPEX) by line item (v2 Corrected).
 * `g` = group header, `l` = line, `total` = footer (Years 3–5 unused).
 */
const PANEL1_TABLE1_CAPEX_ROWS = [
  { t: 'g', label: 'Cloud Infrastructure Setup' },
  {
    t: 'l',
    line: 'Cloud Landing Zone Design & Architecture',
    total: 180_000,
    y1: 108_000,
    y2: 72_000,
  },
  {
    t: 'l',
    line: 'Initial Cloud Provisioning (Compute/Storage/DB)',
    total: 220_000,
    y1: 132_000,
    y2: 88_000,
  },
  {
    t: 'l',
    line: 'Multi-Region Disaster Recovery Setup',
    total: 150_000,
    y1: 90_000,
    y2: 60_000,
  },
  {
    t: 'l',
    line: 'CDN & Edge Network Configuration',
    total: 80_000,
    y1: 48_000,
    y2: 32_000,
  },
  { t: 'g', label: 'Migration Execution' },
  {
    t: 'l',
    line: 'Application Assessment & Dependency Mapping',
    total: 200_000,
    y1: 120_000,
    y2: 80_000,
  },
  {
    t: 'l',
    line: 'Lift-and-Shift — Core Systems (Policy/Claims/Billing)',
    total: 350_000,
    y1: 210_000,
    y2: 140_000,
  },
  {
    t: 'l',
    line: 'Application Refactoring & Re-platforming',
    total: 480_000,
    y1: 288_000,
    y2: 192_000,
  },
  {
    t: 'l',
    line: 'Data Migration, ETL Pipelines & Validation',
    total: 280_000,
    y1: 168_000,
    y2: 112_000,
  },
  {
    t: 'l',
    line: 'Database Migration (Oracle/SQL Server → Cloud DB)',
    total: 220_000,
    y1: 132_000,
    y2: 88_000,
  },
  {
    t: 'l',
    line: 'API Integration Layer & Microservices Gateway',
    total: 160_000,
    y1: 96_000,
    y2: 64_000,
  },
  { t: 'g', label: 'Security & Compliance Infra' },
  {
    t: 'l',
    line: 'Zero-Trust Architecture Implementation',
    total: 250_000,
    y1: 150_000,
    y2: 100_000,
  },
  {
    t: 'l',
    line: 'SIEM & SOC Tooling Platform',
    total: 180_000,
    y1: 108_000,
    y2: 72_000,
  },
  {
    t: 'l',
    line: 'Data Encryption & Key Management (HSM/KMS)',
    total: 120_000,
    y1: 72_000,
    y2: 48_000,
  },
  {
    t: 'l',
    line: 'Compliance Framework Setup (SOC2/ISO27001/GDPR)',
    total: 150_000,
    y1: 90_000,
    y2: 60_000,
  },
  {
    t: 'l',
    line: 'Penetration Testing & Initial Security Audit',
    total: 90_000,
    y1: 54_000,
    y2: 36_000,
  },
  { t: 'g', label: 'AI Platform Implementation' },
  {
    t: 'l',
    line: 'AI Platform Licensing & Setup',
    total: 300_000,
    y1: 180_000,
    y2: 120_000,
  },
  {
    t: 'l',
    line: 'Conversational AI Chatbot Development',
    total: 420_000,
    y1: 252_000,
    y2: 168_000,
  },
  {
    t: 'l',
    line: 'Agent-Assist AI Copilot Build',
    total: 280_000,
    y1: 168_000,
    y2: 112_000,
  },
  {
    t: 'l',
    line: 'Knowledge Base Construction & Ingestion',
    total: 150_000,
    y1: 90_000,
    y2: 60_000,
  },
  {
    t: 'l',
    line: 'Voice AI & IVR Integration',
    total: 180_000,
    y1: 108_000,
    y2: 72_000,
  },
  {
    t: 'l',
    line: 'CRM–AI Workflow Integration',
    total: 120_000,
    y1: 72_000,
    y2: 48_000,
  },
  { t: 'g', label: 'Workplace Modernization' },
  {
    t: 'l',
    line: 'Endpoint Device Refresh (400 devices × $1,000)',
    total: 400_000,
    y1: 240_000,
    y2: 160_000,
  },
  {
    t: 'l',
    line: 'Collaboration Platform Setup (M365/Google WS)',
    total: 80_000,
    y1: 48_000,
    y2: 32_000,
  },
  {
    t: 'l',
    line: 'VPN Replacement with SASE/Zero-Trust Network Access',
    total: 120_000,
    y1: 72_000,
    y2: 48_000,
  },
  { t: 'g', label: 'Program Management' },
  {
    t: 'l',
    line: 'Cloud Migration Consulting (SI Partner)',
    total: 350_000,
    y1: 210_000,
    y2: 140_000,
  },
  {
    t: 'l',
    line: 'Project Management Office (18-month program)',
    total: 200_000,
    y1: 120_000,
    y2: 80_000,
  },
  {
    t: 'l',
    line: 'Change Management Consulting',
    total: 120_000,
    y1: 72_000,
    y2: 48_000,
  },
  {
    t: 'l',
    line: 'Vendor Selection, RFP & Legal Contracting',
    total: 50_000,
    y1: 30_000,
    y2: 20_000,
  },
  { t: 'g', label: 'Training & Enablement' },
  {
    t: 'l',
    line: 'IT Staff Cloud Certifications (AWS/Azure/GCP × 40)',
    total: 120_000,
    y1: 72_000,
    y2: 48_000,
  },
  {
    t: 'l',
    line: 'Developer Retraining (DevOps, Cloud-Native)',
    total: 80_000,
    y1: 48_000,
    y2: 32_000,
  },
  {
    t: 'l',
    line: 'CS Agent AI Tools Training (120 agents × $500)',
    total: 60_000,
    y1: 36_000,
    y2: 24_000,
  },
  {
    t: 'l',
    line: 'General End-User Training Program',
    total: 40_000,
    y1: 24_000,
    y2: 16_000,
  },
  { t: 'g', label: 'Contingency (15%)' },
  {
    t: 'l',
    line: 'Contingency Reserve (15% of base CAPEX $6,180,000)',
    total: 927_000,
    y1: 556_200,
    y2: 370_800,
  },
  { t: 'total', line: 'TOTAL CAPEX' },
]

/**
 * Table 2 — On-Premise OPEX (Baseline, Wind-Down) — v2 Corrected.
 * 100% Y1, 40% Y2 dual-running, decommissioned Y3+.
 */
const PANEL1_TABLE2_ONPREM_OPEX_ROWS = [
  { t: 'g', label: 'Hardware & Facilities' },
  {
    t: 'l',
    line: 'Hardware Maintenance Contracts (Servers/Storage/Network)',
    baseline: 1_200_000,
    y1: 1_200_000,
    y2: 480_000,
    fiveYr: 1_680_000,
  },
  {
    t: 'l',
    line: 'Hardware Refresh — Amortized 5-Year Cycle',
    baseline: 800_000,
    y1: 800_000,
    y2: 320_000,
    fiveYr: 1_120_000,
  },
  {
    t: 'l',
    line: 'Data Center Colocation Lease ($80K/month)',
    baseline: 960_000,
    y1: 960_000,
    y2: 384_000,
    fiveYr: 1_344_000,
  },
  {
    t: 'l',
    line: 'Power & Cooling (Electricity, HVAC)',
    baseline: 480_000,
    y1: 480_000,
    y2: 192_000,
    fiveYr: 672_000,
  },
  {
    t: 'l',
    line: 'Physical Security (Data Center)',
    baseline: 120_000,
    y1: 120_000,
    y2: 48_000,
    fiveYr: 168_000,
  },
  { t: 'g', label: 'Software Licensing' },
  {
    t: 'l',
    line: 'OS & Database Licenses (Windows Server, Oracle, SQL Server)',
    baseline: 650_000,
    y1: 650_000,
    y2: 260_000,
    fiveYr: 910_000,
  },
  {
    t: 'l',
    line: 'Middleware & Integration Tools (MQ, ESB)',
    baseline: 280_000,
    y1: 280_000,
    y2: 112_000,
    fiveYr: 392_000,
  },
  {
    t: 'l',
    line: 'Monitoring & Management Tools (Nagios, Splunk On-Prem)',
    baseline: 150_000,
    y1: 150_000,
    y2: 60_000,
    fiveYr: 210_000,
  },
  {
    t: 'l',
    line: 'Security Software (AV, Firewall, IDS/IPS Licenses)',
    baseline: 320_000,
    y1: 320_000,
    y2: 128_000,
    fiveYr: 448_000,
  },
  { t: 'g', label: 'IT Personnel' },
  {
    t: 'l',
    line: 'Infrastructure Engineers — 12 FTE × $120K',
    baseline: 1_440_000,
    y1: 1_440_000,
    y2: 576_000,
    fiveYr: 2_016_000,
  },
  {
    t: 'l',
    line: 'Database Administrators — 5 FTE × $120K',
    baseline: 600_000,
    y1: 600_000,
    y2: 240_000,
    fiveYr: 840_000,
  },
  {
    t: 'l',
    line: 'Network Engineers — 4 FTE × $120K',
    baseline: 480_000,
    y1: 480_000,
    y2: 192_000,
    fiveYr: 672_000,
  },
  {
    t: 'l',
    line: 'Security Operations — 5 FTE × $120K',
    baseline: 600_000,
    y1: 600_000,
    y2: 240_000,
    fiveYr: 840_000,
  },
  {
    t: 'l',
    line: 'Helpdesk Support — 8 FTE × $90K',
    baseline: 720_000,
    y1: 720_000,
    y2: 288_000,
    fiveYr: 1_008_000,
  },
  { t: 'g', label: 'Customer Service' },
  {
    t: 'l',
    line: 'CS Agent Salaries & Benefits — 120 agents × $60K',
    baseline: 7_200_000,
    y1: 7_200_000,
    y2: 2_880_000,
    fiveYr: 10_080_000,
  },
  {
    t: 'l',
    line: 'Telephony & IVR (PBX, Telecom)',
    baseline: 360_000,
    y1: 360_000,
    y2: 144_000,
    fiveYr: 504_000,
  },
  {
    t: 'l',
    line: 'Workforce Management Software',
    baseline: 120_000,
    y1: 120_000,
    y2: 48_000,
    fiveYr: 168_000,
  },
  {
    t: 'l',
    line: 'Quality Assurance Team & Tools',
    baseline: 180_000,
    y1: 180_000,
    y2: 72_000,
    fiveYr: 252_000,
  },
  { t: 'g', label: 'Risk & Compliance' },
  {
    t: 'l',
    line: 'Compliance Audit Costs (Annual Audits & Certifications)',
    baseline: 400_000,
    y1: 400_000,
    y2: 160_000,
    fiveYr: 560_000,
  },
  {
    t: 'l',
    line: 'Cyber Liability Insurance Premium',
    baseline: 850_000,
    y1: 850_000,
    y2: 340_000,
    fiveYr: 1_190_000,
  },
  {
    t: 'l',
    line: 'Regulatory Reporting — Manual Effort',
    baseline: 250_000,
    y1: 250_000,
    y2: 100_000,
    fiveYr: 350_000,
  },
  {
    t: 'l',
    line: 'Expected Data Breach Cost (18% prob × $6.58M avg)',
    baseline: 1_184_400,
    y1: 1_184_400,
    y2: 473_760,
    fiveYr: 1_658_160,
  },
  { t: 'g', label: 'Backup & Recovery' },
  {
    t: 'l',
    line: 'Tape Backup & Offsite Storage',
    baseline: 180_000,
    y1: 180_000,
    y2: 72_000,
    fiveYr: 252_000,
  },
  {
    t: 'l',
    line: 'Secondary DR Site Maintenance',
    baseline: 240_000,
    y1: 240_000,
    y2: 96_000,
    fiveYr: 336_000,
  },
  { t: 'g', label: 'Overhead & Misc' },
  {
    t: 'l',
    line: 'Vendor Support Contracts',
    baseline: 300_000,
    y1: 300_000,
    y2: 120_000,
    fiveYr: 420_000,
  },
  {
    t: 'l',
    line: 'IT Management Overhead & Administration',
    baseline: 200_000,
    y1: 200_000,
    y2: 80_000,
    fiveYr: 280_000,
  },
  { t: 'total', line: 'TOTAL ON-PREM OPEX' },
]

/**
 * Table 3 — Cloud + AI OPEX (New Cost Structure) — v2 Corrected.
 * Ramp 30% / 75% / 100%; Y4 +3%; Y5 vs Y3 per model.
 */
const PANEL1_TABLE3_CLOUD_AI_OPEX_ROWS = [
  { t: 'g', label: 'Cloud Infrastructure (IaaS/PaaS)' },
  {
    t: 'l',
    line: 'Cloud Compute — Reserved Instances (EC2/Azure VM)',
    stabilized: 1_800_000,
    y1: 540_000,
    y2: 1_350_000,
    y3: 1_800_000,
    y4: 1_854_000,
    y5: 1_909_620,
    fiveYr: 7_453_620,
  },
  {
    t: 'l',
    line: 'Cloud Storage & Backup (S3/Blob + Backup)',
    stabilized: 480_000,
    y1: 288_000,
    y2: 720_000,
    y3: 960_000,
    y4: 988_800,
    y5: 1_018_464,
    fiveYr: 3_975_264,
  },
  {
    t: 'l',
    line: 'Cloud Database Services (RDS, Cosmos, Managed DB)',
    stabilized: 720_000,
    y1: 432_000,
    y2: 1_080_000,
    y3: 1_440_000,
    y4: 1_483_200,
    y5: 1_527_696,
    fiveYr: 5_962_896,
  },
  {
    t: 'l',
    line: 'Cloud Networking & CDN (VPN, Load Balancer, CDN)',
    stabilized: 360_000,
    y1: 216_000,
    y2: 540_000,
    y3: 720_000,
    y4: 741_600,
    y5: 763_848,
    fiveYr: 2_981_448,
  },
  {
    t: 'l',
    line: 'Cloud Security Services (WAF, Shield, GuardDuty)',
    stabilized: 400_000,
    y1: 240_000,
    y2: 600_000,
    y3: 800_000,
    y4: 824_000,
    y5: 848_720,
    fiveYr: 3_312_720,
  },
  {
    t: 'l',
    line: 'Cloud Monitoring & Observability (Datadog, CW)',
    stabilized: 240_000,
    y1: 144_000,
    y2: 360_000,
    y3: 480_000,
    y4: 494_400,
    y5: 509_232,
    fiveYr: 1_987_632,
  },
  { t: 'g', label: 'SaaS & Platform Licenses' },
  {
    t: 'l',
    line: 'Core Insurance Platform SaaS (Policy/Claims/Billing)',
    stabilized: 2_400_000,
    y1: 720_000,
    y2: 1_800_000,
    y3: 2_400_000,
    y4: 2_472_000,
    y5: 2_546_160,
    fiveYr: 9_938_160,
  },
  {
    t: 'l',
    line: 'Collaboration Suite — M365 E3 ($30/user × 1,000)',
    stabilized: 720_000,
    y1: 216_000,
    y2: 540_000,
    y3: 720_000,
    y4: 741_600,
    y5: 763_848,
    fiveYr: 2_981_448,
  },
  {
    t: 'l',
    line: 'CRM Platform SaaS (Salesforce/ServiceNow)',
    stabilized: 360_000,
    y1: 108_000,
    y2: 270_000,
    y3: 360_000,
    y4: 370_800,
    y5: 381_924,
    fiveYr: 1_490_724,
  },
  {
    t: 'l',
    line: 'DevOps & CI/CD Tools (GitHub, Jira)',
    stabilized: 160_000,
    y1: 48_000,
    y2: 120_000,
    y3: 160_000,
    y4: 164_800,
    y5: 169_744,
    fiveYr: 662_544,
  },
  {
    t: 'l',
    line: 'Security SaaS (CASB, SIEM-as-a-Service, EDR)',
    stabilized: 480_000,
    y1: 144_000,
    y2: 360_000,
    y3: 480_000,
    y4: 494_400,
    y5: 509_232,
    fiveYr: 1_987_632,
  },
  { t: 'g', label: 'AI Platform & Services' },
  {
    t: 'l',
    line: 'LLM API Consumption (GPT/Claude/Gemini)',
    stabilized: 960_000,
    y1: 288_000,
    y2: 720_000,
    y3: 960_000,
    y4: 988_800,
    y5: 1_018_464,
    fiveYr: 3_975_264,
  },
  {
    t: 'l',
    line: 'AI Platform Annual Subscription',
    stabilized: 600_000,
    y1: 180_000,
    y2: 450_000,
    y3: 600_000,
    y4: 618_000,
    y5: 636_540,
    fiveYr: 2_484_540,
  },
  {
    t: 'l',
    line: 'AI Model Maintenance & Fine-Tuning',
    stabilized: 300_000,
    y1: 90_000,
    y2: 225_000,
    y3: 300_000,
    y4: 309_000,
    y5: 318_270,
    fiveYr: 1_242_270,
  },
  {
    t: 'l',
    line: 'AI Chatbot Hosting & Infrastructure',
    stabilized: 240_000,
    y1: 72_000,
    y2: 180_000,
    y3: 240_000,
    y4: 247_200,
    y5: 254_616,
    fiveYr: 993_816,
  },
  { t: 'g', label: 'IT Personnel (Cloud-Optimized)' },
  {
    t: 'l',
    line: 'Cloud & DevOps Engineers — 8 FTE × $150K',
    stabilized: 1_200_000,
    y1: 360_000,
    y2: 900_000,
    y3: 1_200_000,
    y4: 1_236_000,
    y5: 1_273_080,
    fiveYr: 4_969_080,
  },
  {
    t: 'l',
    line: 'Cloud Security Engineers — 3 FTE × $160K',
    stabilized: 480_000,
    y1: 144_000,
    y2: 360_000,
    y3: 480_000,
    y4: 494_400,
    y5: 509_232,
    fiveYr: 1_987_632,
  },
  {
    t: 'l',
    line: 'Data Engineers & MLOps — 4 FTE × $150K',
    stabilized: 600_000,
    y1: 180_000,
    y2: 450_000,
    y3: 600_000,
    y4: 618_000,
    y5: 636_540,
    fiveYr: 2_484_540,
  },
  {
    t: 'l',
    line: 'Helpdesk Support (Reduced) — 5 FTE × $90K',
    stabilized: 450_000,
    y1: 135_000,
    y2: 337_500,
    y3: 450_000,
    y4: 463_500,
    y5: 477_405,
    fiveYr: 1_863_405,
  },
  { t: 'g', label: 'Customer Service (AI-Augmented)' },
  {
    t: 'l',
    line: 'CS Agent Salaries (Reduced) — 60 agents × $60K',
    stabilized: 3_600_000,
    y1: 1_080_000,
    y2: 2_700_000,
    y3: 3_600_000,
    y4: 3_708_000,
    y5: 3_819_240,
    fiveYr: 14_907_240,
  },
  {
    t: 'l',
    line: 'AI Contact Handling Cost (65% of 1.8M × $0.69 net)',
    stabilized: 810_000,
    y1: 243_000,
    y2: 607_500,
    y3: 810_000,
    y4: 834_300,
    y5: 859_329,
    fiveYr: 3_354_129,
  },
  {
    t: 'l',
    line: 'Cloud Telephony (CCaaS)',
    stabilized: 120_000,
    y1: 36_000,
    y2: 90_000,
    y3: 120_000,
    y4: 123_600,
    y5: 127_308,
    fiveYr: 496_908,
  },
  {
    t: 'l',
    line: 'AI-Powered Quality Analytics',
    stabilized: 80_000,
    y1: 24_000,
    y2: 60_000,
    y3: 80_000,
    y4: 82_400,
    y5: 84_872,
    fiveYr: 331_272,
  },
  { t: 'g', label: 'Risk & Compliance' },
  {
    t: 'l',
    line: 'Compliance Automation Tools (GRC Platform)',
    stabilized: 200_000,
    y1: 60_000,
    y2: 150_000,
    y3: 200_000,
    y4: 206_000,
    y5: 212_180,
    fiveYr: 828_180,
  },
  {
    t: 'l',
    line: 'Cyber Liability Insurance (Reduced Premium)',
    stabilized: 500_000,
    y1: 150_000,
    y2: 375_000,
    y3: 500_000,
    y4: 515_000,
    y5: 530_450,
    fiveYr: 2_070_450,
  },
  {
    t: 'l',
    line: 'Cloud Compliance Certifications (SOC2/ISO27001)',
    stabilized: 150_000,
    y1: 45_000,
    y2: 112_500,
    y3: 150_000,
    y4: 154_500,
    y5: 159_135,
    fiveYr: 621_135,
  },
  {
    t: 'l',
    line: 'Expected Data Breach Cost (4% prob × $6.58M)',
    stabilized: 263_200,
    y1: 78_960,
    y2: 197_400,
    y3: 263_200,
    y4: 271_096,
    y5: 279_229,
    fiveYr: 1_089_885,
  },
  { t: 'g', label: 'Managed Services & Overhead' },
  {
    t: 'l',
    line: 'Cloud Managed Services (MSP for Cloud Ops)',
    stabilized: 360_000,
    y1: 108_000,
    y2: 270_000,
    y3: 360_000,
    y4: 370_800,
    y5: 381_924,
    fiveYr: 1_490_724,
  },
  {
    t: 'l',
    line: 'Cloud Vendor Enterprise Support',
    stabilized: 150_000,
    y1: 45_000,
    y2: 112_500,
    y3: 150_000,
    y4: 154_500,
    y5: 159_135,
    fiveYr: 621_135,
  },
  {
    t: 'l',
    line: 'IT Management Overhead & Administration',
    stabilized: 150_000,
    y1: 45_000,
    y2: 112_500,
    y3: 150_000,
    y4: 154_500,
    y5: 159_135,
    fiveYr: 621_135,
  },
  { t: 'total', line: 'TOTAL CLOUD OPEX' },
]

/** Minimal inline icons for sidebar (Acme-style nav). */
function IconHome({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="22" height="22" aria-hidden>
      <path
        fill="currentColor"
        d="M10 19v-5h4v5h5v-7h3L12 3 2 12h3v7h5z"
      />
    </svg>
  )
}

function IconBudget({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="22" height="22" aria-hidden>
      <path
        fill="currentColor"
        d="M14 17H4v2h10v-2zm6-10H8v4h12V7zm-6 6H4v2h12v-2zm0-12h-8v6h12V7h-4V1zm-10 14H4v-2h2v2z"
      />
    </svg>
  )
}

function IconRoiValue({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="22" height="22" aria-hidden>
      <path
        fill="currentColor"
        d="M4 18h2V9H4v9zm4 0h2V5H8v13zm4 0h2v-7h-2v7zm4 0h2V9h-2v9z"
      />
    </svg>
  )
}

function IconGovernanceCompliance({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="22" height="22" aria-hidden>
      <path
        fill="currentColor"
        d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-1 14l-4-4 1.41-1.41L11 12.17l6.59-6.58L19 7l-8 8z"
      />
    </svg>
  )
}

function IconPerformanceResilience({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="22" height="22" aria-hidden>
      <path
        fill="currentColor"
        d="M13 2.05v3.03c3.39.49 6 3.39 6 6.92 0 .9-.18 1.75-.49 2.53l2.6 1.53A9.983 9.983 0 0022 12c0-5.4-3.71-9.93-8.71-10.95zM11 2.05C5.71 3.06 2 7.53 2 12c0 4.73 3.25 8.71 7.62 9.76l2.52-5.76A4.942 4.942 0 019 17c0 2.76 2.24 5 5 5s5-2.24 5-5c0-1.28-.51-2.43-1.32-3.31L11 2.05z"
      />
    </svg>
  )
}

function IconHelp({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="18" height="18" aria-hidden>
      <path
        fill="currentColor"
        d="M11 17h2v2h-2v-2zm1-13a4 4 0 013.9 5.1l-1 .3A3 3 0 009 13H7a5 5 0 019.3-3.2 2 2 0 001.9-4.3A6 6 0 008 17h2a4 4 0 014-7z"
      />
    </svg>
  )
}

function IconPanels({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="22" height="22" aria-hidden>
      <path
        fill="currentColor"
        d="M3 3h8v8H3V3zm0 10h8v8H3v-8zm10-10h8v8h-8V3zm0 10h8v8h-8v-8z"
      />
    </svg>
  )
}

function IconCiCdPipeline({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="22" height="22" aria-hidden>
      <path
        fill="currentColor"
        d="M2 13h13v11H2V13zm15 13h9V8h-9v18zM17 11V2H9v15h13V11h-5z"
      />
    </svg>
  )
}

function IconRoiSensitivity({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="22" height="22" aria-hidden>
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 20h18M5 20V8m4 12V11m4 9V5m4 15v-7m4 7v-3"
      />
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeDasharray="2 2"
        d="M14 4v16"
      />
    </svg>
  )
}

function IconAdoption({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="22" height="22" aria-hidden>
      <path
        fill="currentColor"
        d="M3 3h2v16h16v2H3V3zm17 4l1.4 1.4-6 6-3-3-5 5L6 15l6-6 3 3 5-5z"
      />
    </svg>
  )
}

function IconDiffusion({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="22" height="22" aria-hidden>
      <path
        fill="currentColor"
        d="M12 4a8 8 0 100 16 8 8 0 000-16zm0 2a6 6 0 110 12 6 6 0 010-12zm0 2a4 4 0 100 8 4 4 0 000-8zm0 2a2 2 0 110 4 2 2 0 010-4z"
      />
    </svg>
  )
}

function parseMoney(s) {
  if (s === '' || s === null || s === undefined) return 0
  const n = Number(String(s).replace(/,/g, '').trim())
  return Number.isFinite(n) ? n : 0
}

function formatCurrency(n) {
  if (!Number.isFinite(n)) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Math.round(n))
}

/**
 * 12-month adoption + resistance curves:
 *   rate(t)       = maxAdoption * (1 - e^(-k * t))
 *   resistance(t) = baseResistance * e^(-decayRate * t)
 *   maxAdoption    = 0.4 + (training/40)*0.35 + (leadership/100)*0.25, capped at 1.0
 *   k              = 0.15 + (training/40)*0.2 + (leadership/100)*0.15
 *   baseResistance = 1 - (training/40)*0.5 - (leadership/100)*0.5, floored at 0
 *   decayRate      = 0.1 + (training/40)*0.15 + (leadership/100)*0.1
 */
function buildAdoptionCurve(trainingHours, leadershipEngagement) {
  const tFrac = Math.min(Math.max(trainingHours / 40, 0), 1)
  const lFrac = Math.min(Math.max(leadershipEngagement / 100, 0), 1)
  const maxAdoption = Math.min(1, 0.4 + tFrac * 0.35 + lFrac * 0.25)
  const k = 0.15 + tFrac * 0.2 + lFrac * 0.15
  const baseResistance = Math.max(0, 1 - tFrac * 0.5 - lFrac * 0.5)
  const decayRate = 0.1 + tFrac * 0.15 + lFrac * 0.1
  const points = []
  for (let t = 1; t <= 12; t++) {
    points.push({
      month: t,
      rate: maxAdoption * (1 - Math.exp(-k * t)),
      resistance: baseResistance * Math.exp(-decayRate * t),
    })
  }
  return { points, maxAdoption, k, baseResistance, decayRate }
}

/**
 * 24-month Bass Diffusion cumulative-adoption curve.
 *   p = (marketingSpend / 200) * marketMult.p
 *   q = (networkEffect * 0.5) * marketMult.q
 *   F(t) = (1 - e^(-(p+q)t)) / (1 + (q/p) * e^(-(p+q)t))
 *   newAdopters(t) = F(t) - F(t-1)
 * Guards the p ≈ 0 degenerate case (no innovators ⇒ no diffusion).
 */
const BASS_MARKET_MULTIPLIERS = {
  B2C: { p: 1.0, q: 1.0 },
  B2B: { p: 0.5, q: 0.4 },
}

function buildBassDiffusionCurve(marketingSpend, networkEffect, marketType) {
  const mult =
    BASS_MARKET_MULTIPLIERS[marketType] ?? BASS_MARKET_MULTIPLIERS.B2C
  const p = (Math.max(0, marketingSpend) / 200) * mult.p
  const q = (Math.max(0, Math.min(1, networkEffect)) * 0.5) * mult.q
  const sum = p + q
  const points = []
  let prevCumulative = 0
  for (let t = 1; t <= 24; t++) {
    let f
    if (sum <= 1e-9 || p <= 1e-9) {
      f = 0
    } else {
      const e = Math.exp(-sum * t)
      f = (1 - e) / (1 + (q / p) * e)
    }
    const cumulative = Math.min(1, Math.max(0, f))
    const newAdopters = Math.max(0, cumulative - prevCumulative)
    points.push({ month: t, cumulative, newAdopters })
    prevCumulative = cumulative
  }
  return { points, p, q, marketType: marketType ?? 'B2C' }
}

/**
 * Panel 1 — Cost by year: baseline on-prem bar + migration stack
 * (CAPEX bottom, OPEX on-prem middle, OPEX Cloud+AI top).
 */
function Panel1CostByYearChart({ rows, baselineOnPremByYear }) {
  const w = 640
  const h = 320
  const padL = 58
  const padR = 24
  const padT = 28
  const padB = 56
  const innerW = w - padL - padR
  const innerH = h - padT - padB

  const maxY = Math.max(
    1,
    ...baselineOnPremByYear,
    ...rows.map((r) => r.totalCost),
  )

  const groupW = innerW / rows.length
  /** Space between year clusters (applied on both sides of each year’s pair). */
  const clusterSidePad = Math.max(10, groupW * 0.12)
  /** Tight gap between baseline bar and stacked bar for the same year. */
  const intraYearGap = Math.min(6, Math.max(2, groupW * 0.028))
  const usablePairW = Math.max(1, groupW - 2 * clusterSidePad)
  const barW = Math.max(8, (usablePairW - intraYearGap) / 2)

  const yBaseline = padT + innerH

  return (
    <svg
      className="cost-chart panel1-cost-chart"
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Cost by year: baseline on-prem OPEX versus migration CAPEX plus on-prem OPEX and Cloud+AI OPEX stacked"
    >
      <title>Annual cost — baseline versus migration CAPEX and split operating OPEX</title>
      <defs>
        <linearGradient id="panel1GradientBaselinePrem" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#1e40af" />
        </linearGradient>
        <linearGradient id="panel1GradientCapexBar" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fb923c" />
          <stop offset="100%" stopColor="#c2410c" />
        </linearGradient>
        <linearGradient id="panel1GradientOpexOnPremBar" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#86efac" />
          <stop offset="100%" stopColor="#16a34a" />
        </linearGradient>
        <linearGradient id="panel1GradientOpexCloudBar" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7dd3fc" />
          <stop offset="100%" stopColor="#0284c7" />
        </linearGradient>
      </defs>
      {[0, 0.25, 0.5, 0.75, 1].map((t) => {
        const y = padT + innerH * (1 - t)
        const tick = Math.round(maxY * t)
        return (
          <g key={t}>
            <line
              x1={padL}
              y1={y}
              x2={padL + innerW}
              y2={y}
              className="chart-grid-line"
            />
            <text x={padL - 8} y={y + 4} textAnchor="end" className="chart-axis-label">
              {tick >= 1_000_000
                ? `${(tick / 1_000_000).toFixed(1)}M`
                : tick >= 1000
                  ? `${Math.round(tick / 1000)}k`
                  : tick}
            </text>
          </g>
        )
      })}
      {rows.map((row, i) => {
        const groupLeft = padL + i * groupW
        const pairLeft = groupLeft + clusterSidePad
        const xBaseline = pairLeft
        const xStack = pairLeft + barW + intraYearGap
        const groupCx = groupLeft + groupW / 2
        const baselineVal = baselineOnPremByYear[i] ?? 0
        const hhBase = innerH * (baselineVal / maxY)
        const hhCap = innerH * (row.capex / maxY)
        const hhOpOn = innerH * ((row.opexOnPrem ?? 0) / maxY)
        const hhOpCloud = innerH * ((row.opexCloudAi ?? 0) / maxY)
        const yCapTop = yBaseline - hhCap
        const yOpOnTop = yCapTop - hhOpOn
        const yOpCloudTop = yOpOnTop - hhOpCloud
        return (
          <g key={row.year}>
            <rect
              x={xBaseline}
              y={yBaseline - hhBase}
              width={barW}
              height={Math.max(0, hhBase)}
              rx={3}
              className="chart-bar panel1-chart-bar-baseline"
              fill="url(#panel1GradientBaselinePrem)"
            />
            <rect
              x={xStack}
              y={yCapTop}
              width={barW}
              height={Math.max(0, hhCap)}
              rx={3}
              className="chart-bar panel1-chart-bar-capex"
              fill="url(#panel1GradientCapexBar)"
            />
            <rect
              x={xStack}
              y={yOpOnTop}
              width={barW}
              height={Math.max(0, hhOpOn)}
              rx={3}
              className="chart-bar panel1-chart-bar-opex-onprem"
              fill="url(#panel1GradientOpexOnPremBar)"
            />
            <rect
              x={xStack}
              y={yOpCloudTop}
              width={barW}
              height={Math.max(0, hhOpCloud)}
              rx={3}
              className="chart-bar panel1-chart-bar-opex-cloud"
              fill="url(#panel1GradientOpexCloudBar)"
            />
            <text
              x={groupCx}
              y={h - 8}
              textAnchor="middle"
              className="chart-axis-label chart-axis-year"
            >
              Year {row.year}
            </text>
          </g>
        )
      })}
      <text
        x={padL + innerW / 2}
        y={18}
        textAnchor="middle"
        className="chart-title"
      >
        Dollars (USD)
      </text>
    </svg>
  )
}

const LANDING_BASELINE_METRICS = [
  {
    metric: 'Workforce',
    value: '1,000',
    description:
      'Total employees (80 IT staff, 120 Customer Service agents)',
  },
  {
    metric: 'Customer Base',
    value: '350,000',
    description:
      'Unique customers holding 500,000 active policies',
  },
  {
    metric: 'Annual Revenue',
    value: '$250,000,000',
    description: 'Gross written premium revenue',
  },
  {
    metric: 'Current IT Budget',
    value: '$13,750,000',
    description: '5.5% of revenue (industry benchmark)',
  },
  {
    metric: 'Customer Contacts',
    value: '1,800,000',
    description: 'Annual inbound inquiries (~5.1 per customer)',
  },
  {
    metric: 'Infrastructure Age',
    value: '6 Years',
    description:
      'Average age of on-premise hardware (due for refresh)',
  },
  {
    metric: 'System Uptime',
    value: '95%',
    description: 'Current SLA (Target: 99.9% post-migration)',
  },
]

function LandingHome({ visible }) {
  return (
    <div
      className="landing-root"
      hidden={!visible}
      aria-hidden={!visible}
      style={{ display: visible ? 'block' : 'none' }}
    >
      <div className="landing-hero-card">
        <div className="landing-hero-intro">
          <p className="landing-welcome">Welcome</p>
          <h2 className="landing-title-dash">Technology Benefit Simulator</h2>
          <p className="landing-tagline">
            Model cloud migration paths, recurring benefits, total cost of
            ownership, and ROI so leadership can compare scenarios with clarity.
          </p>
        </div>
        <p className="landing-hint-soft">
          Open <strong>Panel 1: Cost Estimation</strong> from the sidebar when
          you&apos;re ready to work the numbers.
        </p>
      </div>

      <section
        className="panel-card landing-overview-section"
        aria-labelledby="landing-purpose-heading"
      >
        <h2 id="landing-purpose-heading" className="card-heading">
          Project purpose
        </h2>
        <p className="card-lead landing-purpose-lead">
          The objective of this programme is to{' '}
          <strong>
            migrate our core on-premise infrastructure to the cloud
          </strong>{' '}
          and to{' '}
          <strong>
            implement an enterprise-wide AI customer service platform
          </strong>
          . This estimator turns model inputs into financial and operational
          views so the{' '}
          <strong>C-suite</strong> can weigh trade-offs and move forward with
          evidence-backed decisions.
        </p>
      </section>

      <section
        className="panel-card landing-overview-section"
        aria-labelledby="landing-baseline-heading"
      >
        <h2 id="landing-baseline-heading" className="card-heading">
          Baseline organizational metrics
        </h2>
        <p className="card-lead">
          The financial model is built upon the following baseline metrics for
          our organization:
        </p>
        <div className="table-scroll">
          <table className="data-table data-table-landing-baseline">
            <thead>
              <tr>
                <th scope="col">Metric</th>
                <th scope="col" className="num">
                  Value
                </th>
                <th scope="col">Description</th>
              </tr>
            </thead>
            <tbody>
              {LANDING_BASELINE_METRICS.map((row) => (
                <tr key={row.metric}>
                  <th scope="row">{row.metric}</th>
                  <td className="num num-strong">{row.value}</td>
                  <td>{row.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function AppTopHeader({ showBack, title, onBackToHome }) {
  return (
    <header className="app-top-header">
      <div className="app-top-header-leading">
        {showBack ? (
          <button
            type="button"
            className="app-header-back-link"
            onClick={onBackToHome}
            aria-label="Back to overview"
          >
            ← Overview
          </button>
        ) : null}
        <h1 className="app-top-header-title">{title}</h1>
      </div>
    </header>
  )
}

/** Panel 4 — decision structure (single Mermaid flowchart). */
const PANEL4_DECISION_STRUCTURE_MERMAID = `flowchart TD
    classDef strategic   fill:#E39C26,color:#1a1a1a,stroke:#C57614
    classDef oversight   fill:#6C3483,color:#fff,stroke:#6C3483
    classDef delivery    fill:#1565C0,color:#fff,stroke:#0D47A1
    classDef operational fill:#1A6B3C,color:#fff,stroke:#145229

    subgraph esc_panel ["Strategic governance"]
      ESC["Executive Steering Committee<br/>Chair: CEO | Members: CIO · CTO · CFO · CRO · CCO · COO<br/>Cadence: Monthly"]:::strategic
    end
    style esc_panel fill:#FFF8E7,stroke:#E39C26,stroke-width:2px,color:#263238

    subgraph sponsor_panel ["Programme owner & business co-sponsors"]
      direction LR
      CCO["CCO — Business Co-Sponsor<br/>Veto Rights: CX & Customer Workflows<br/>Cadence: Quarterly"]:::oversight
      CRO["CRO / Compliance — Business Co-Sponsor<br/>Veto Rights: Risk & Regulatory Decisions<br/>Cadence: Quarterly"]:::oversight
      COO["COO — Operations Owner<br/>Full Business Continuity & Service Delivery<br/>Chairs Executive Operations Committee | Monthly"]:::oversight
      CIO["CIO — Primary Owner<br/>Full AI & Cloud Programme<br/>Chairs Cloud Migration Board | Fortnightly"]:::oversight
    end
    style sponsor_panel fill:#f8f4fc,stroke:#6C3483,stroke-width:2px,color:#263238
    style CIO stroke:#C62828,stroke-width:3px

    subgraph delivery_leads ["Delivery leadership tier"]
      direction LR
      HCS["Head of Customer Service<br/>Formal Stakeholder — CS Department<br/>UAT Sign-off Rights | Fortnightly Sprint Review"]:::delivery
      HAI["Head of AI — Reports to CIO<br/>Owns: Models · MLOps · Data Pipelines<br/>Fortnightly"]:::delivery
      LCA["Lead Cloud Architect — Reports to CIO<br/>Owns: Cloud Infrastructure · CI/CD Pipelines · Security Architecture · FinOps<br/>Fortnightly"]:::delivery
    end
    style delivery_leads fill:#E3F2FD,stroke:#1565C0,stroke-width:2px,color:#263238

    subgraph ops_tier ["Operational squads"]
      direction LR
      ACSS["AI Customer Service Squad<br/>Lead: AI Product Owner<br/>Chatbot · Agent-Assist · Model Training | Weekly"]:::operational
      MLOPS["MLOps & Data Engineering Squad<br/>Lead: Head of AI<br/>Model Quality · Pipelines · Monitoring | Weekly"]:::operational
      CFAS["Cloud FinOps & Architecture Squad<br/>Infra · Security · Cost Optimisation | Weekly"]:::operational
    end
    style ops_tier fill:#E8F5E9,stroke:#1A6B3C,stroke-width:2px,color:#263238

    ESC -->|"Programme Mandate & Budget"| CIO
    ESC -->|"Business Priorities"| CCO
    ESC -->|"Risk Appetite"| CRO
    ESC -->|"Service Delivery & Continuity"| COO

    CIO -->|"AI Programme Ownership"| HAI
    CIO -->|"Architecture Guidelines"| LCA
    LCA -->|"Squad direction"| CFAS

    HAI -->|"Model & Data Direction"| ACSS
    HAI -->|"MLOps Standards"| MLOPS

    CCO -->|"CX Standards & Workflow Alignment"| HCS

    HCS -.->|"UAT Sign-off & Business Requirements"| ACSS`

/** Hover notes for Panel 4 flowchart nodes (shown when cursor rests on a node). */
const PANEL4_MERMAID_NODE_NOTES = {
  ESC: {
    title: 'Executive Steering Committee',
    paragraphs: [
      'The Executive Steering Committee (gold, top — strategic governance in the legend) is the highest governing body of the programme. It sits alone in the bordered “Strategic governance” panel above the other tiers. It sets the programme mandate and budget to the CIO, business priorities to the CCO, risk appetite to the CRO, and service delivery and continuity expectations to the COO. In the flowchart, the CIO, COO, CCO, and CRO sit together in one bordered “Programme owner & business co-sponsors” panel as peers at the same level. The ESC also holds the CTO as a member, providing technology strategy perspective at the board level. The ESC meets monthly and is the only body with authority to approve major scope or budget changes.',
    ],
  },
  CCO: {
    title: 'CCO — Business Co-Sponsor',
    paragraphs: [
      'The CCO, CRO, CIO, and COO (purple, business oversight in the legend) share the “Programme owner & business co-sponsors” panel. A dedicated chart link runs from the CCO to the Head of Customer Service for CX standards and workflow alignment. The Head of Customer Service is shown separately in the “Delivery leadership tier” alongside Head of AI and Lead Cloud Architect — same chart level for readability — with UAT sign-off rights over customer-facing AI. The CCO holds veto rights over customer-facing AI workflows and CX standards.',
    ],
  },
  CRO: {
    title: 'CRO / Compliance — Business Co-Sponsor',
    paragraphs: [
      'The CCO and CRO share one panel with the COO and CIO as programme owner & business co-sponsors. The Head of Customer Service sits in the delivery leadership tier with Head of AI and Lead Cloud Architect at one level in the chart. The CRO holds veto rights over risk and regulatory decisions.',
    ],
  },
  COO: {
    title: 'COO — Operations Owner',
    paragraphs: [
      'The COO (purple, same business oversight colour family as the CCO, CRO, and CIO in the diagram) sits in the “Programme owner & business co-sponsors” panel alongside them. They own full business continuity and service delivery, chair the Executive Operations Committee on a monthly cadence, and receive service delivery and continuity direction from the ESC.',
    ],
  },
  HCS: {
    title: 'Head of Customer Service',
    paragraphs: [
      'The Head of Customer Service (blue, delivery leadership in the legend — same family as Head of AI and Lead Cloud Architect) appears in the bordered “Delivery leadership tier” together with those roles — one row, same level in the diagram. They receive CX standards and workflow alignment direction from the CCO (shown as a link on the chart). They are formal CS stakeholder with UAT sign-off rights over every AI customer service feature before production, and feed business requirements to the AI Customer Service Squad (in the “Operational squads” tier below); that relationship is drawn as a dotted line on the chart.',
    ],
  },
  CIO: {
    title: 'CIO — Primary Owner',
    paragraphs: [
      'The CIO (purple, in the co-sponsor panel — same legend family as CCO, CRO, and COO) is the single primary owner of the full programme — both the cloud migration and the AI implementation. The chart places the CIO in the same bordered tier as the CCO, CRO, and COO (peers at one level); there are no direct arrows from CCO or CRO to the CIO. The CIO receives the programme mandate from the ESC. Below that, the CIO directs three roles shown together in the “Delivery leadership tier”: Head of Customer Service, Head of AI, and Lead Cloud Architect — Head of AI and Lead Cloud Architect receive direct CIO arrows (programme ownership and architecture guidelines). The CIO chairs the Cloud Migration Board on a fortnightly basis.',
    ],
  },
  LCA: {
    title: 'Lead Cloud Architect',
    paragraphs: [
      'The Lead Cloud Architect reports to the CIO and shares the “Delivery leadership tier” panel with Head of AI and Head of Customer Service at one level in the chart. They receive architecture guidelines from the CIO and direct the Cloud FinOps & Architecture Squad inside the bordered “Operational squads” tier below. They own cloud infrastructure, CI/CD pipelines, security architecture, and FinOps on a fortnightly cadence.',
    ],
  },
  HAI: {
    title: 'Head of AI',
    paragraphs: [
      'The Head of AI shares the “Delivery leadership tier” with Lead Cloud Architect and Head of Customer Service at one level in the diagram. They report to the CIO and own the full AI model lifecycle — models, MLOps, and data pipelines. They direct the AI Customer Service Squad and MLOps & Data Engineering Squad in the same “Operational squads” panel at one chart level.',
    ],
  },
  CFAS: {
    title: 'Cloud FinOps & Architecture Squad',
    paragraphs: [
      'The three operational squads (green, operational execution in the legend) sit together in the bordered “Operational squads” panel (left to right: AI Customer Service, MLOps & Data Engineering, Cloud FinOps & Architecture) and execute on a weekly cadence. The Cloud FinOps & Architecture Squad handles infrastructure, security, and cost optimisation under direction from the Lead Cloud Architect.',
    ],
  },
  ACSS: {
    title: 'AI Customer Service Squad',
    paragraphs: [
      'The three squads share one “Operational squads” panel at the same level (green, operational execution in the legend). The AI Customer Service Squad, led by the AI Product Owner, builds the chatbot, agent-assist tool, and model training pipelines.',
    ],
  },
  MLOPS: {
    title: 'MLOps & Data Engineering Squad',
    paragraphs: [
      'The three squads share one “Operational squads” panel at the same level (green, operational execution in the legend). The MLOps & Data Engineering Squad, led by the Head of AI, maintains model quality, data pipelines, and production monitoring.',
    ],
  },
}

function inferPanel4MermaidNodeKey(nodeGroup) {
  const id = nodeGroup.getAttribute('id') || ''
  const keys = [
    'ESC',
    'CCO',
    'CRO',
    'COO',
    'CIO',
    'HAI',
    'LCA',
    'HCS',
    'CFAS',
    'ACSS',
    'MLOPS',
  ]
  for (const k of keys) {
    if (new RegExp(`(?:^|-)${k}(?:-|_|\\d|$)`).test(id)) return k
  }
  const text = (nodeGroup.textContent || '').slice(0, 120)
  if (text.includes('Executive Steering Committee')) return 'ESC'
  if (text.includes('CCO —')) return 'CCO'
  if (text.includes('CRO / Compliance')) return 'CRO'
  if (text.includes('COO — Operations Owner')) return 'COO'
  if (text.includes('CIO — Primary Owner')) return 'CIO'
  if (text.includes('Head of AI —')) return 'HAI'
  if (text.includes('Lead Cloud Architect — Reports to CIO')) return 'LCA'
  if (text.includes('Head of Customer Service')) return 'HCS'
  if (text.includes('Cloud FinOps & Architecture')) return 'CFAS'
  if (text.includes('AI Customer Service Squad')) return 'ACSS'
  if (text.includes('MLOps & Data Engineering')) return 'MLOPS'
  return null
}

function attachPanel4MermaidNodeHover(svgEl, setHoverTip) {
  const cleanups = []
  const nodes = svgEl.querySelectorAll('g.node')
  nodes.forEach((g) => {
    const key = inferPanel4MermaidNodeKey(g)
    if (!key || !PANEL4_MERMAID_NODE_NOTES[key]) return
    const note = PANEL4_MERMAID_NODE_NOTES[key]
    g.setAttribute('tabindex', '0')
    g.setAttribute('aria-label', note.title)
    g.style.cursor = 'help'
    const onEnter = (e) => {
      setHoverTip({
        key,
        x: e.clientX,
        y: e.clientY,
      })
    }
    const onMove = (e) => {
      setHoverTip((prev) =>
        prev && prev.key === key
          ? { ...prev, x: e.clientX, y: e.clientY }
          : prev,
      )
    }
    const onLeave = () => setHoverTip(null)
    const onFocus = () => {
      const r = g.getBoundingClientRect()
      setHoverTip({
        key,
        x: r.left + r.width / 2,
        y: r.top + r.height / 2,
      })
    }
    const onBlur = () => setHoverTip(null)
    g.addEventListener('mouseenter', onEnter)
    g.addEventListener('mousemove', onMove)
    g.addEventListener('mouseleave', onLeave)
    g.addEventListener('focus', onFocus)
    g.addEventListener('blur', onBlur)
    cleanups.push(() => {
      g.removeEventListener('mouseenter', onEnter)
      g.removeEventListener('mousemove', onMove)
      g.removeEventListener('mouseleave', onLeave)
      g.removeEventListener('focus', onFocus)
      g.removeEventListener('blur', onBlur)
      g.removeAttribute('tabindex')
      g.removeAttribute('aria-label')
      g.style.cursor = ''
    })
  })
  return () => cleanups.forEach((fn) => fn())
}

/** Panel 4 — colour legend (matches Mermaid classDef fills). */
const PANEL4_DECISION_COLOUR_LEGEND = [
  {
    colourName: 'Gold',
    swatch: '#E39C26',
    family: 'Strategic',
    roles: 'Executive Steering Committee',
  },
  {
    colourName: 'Purple',
    swatch: 'linear-gradient(90deg, #6C3483 0% 50%, #7D3C98 50% 100%)',
    family: 'Business Oversight',
    roles: 'CCO, CRO, CIO, COO',
  },
  {
    colourName: 'Blue',
    swatch: '#1565C0',
    family: 'Delivery Leadership',
    roles: 'Head of Customer Service, Lead Cloud Architect, Head of AI',
  },
  {
    colourName: 'Green',
    swatch: '#1A6B3C',
    family: 'Operational Execution',
    roles: 'Cloud FinOps Squad, AI CS Squad, MLOps Squad',
  },
]

function Panel4DecisionStructureMermaid() {
  const hostRef = useRef(null)
  const renderSeq = useRef(0)
  const baseId = `p4-mermaid-${useId().replace(/:/g, '')}`
  const [hoverTip, setHoverTip] = useState(null)

  useEffect(() => {
    let cancelled = false
    let detachHover = () => {}
    const mountEl = hostRef.current
    if (!mountEl) return
    renderSeq.current += 1
    const rid = `${baseId}-r${renderSeq.current}`

    ;(async () => {
      try {
        const mermaid = (await import('mermaid')).default
        mermaid.initialize({
          startOnLoad: false,
          theme: 'neutral',
          securityLevel: 'loose',
          fontFamily: 'inherit',
        })
        const { svg } = await mermaid.render(rid, PANEL4_DECISION_STRUCTURE_MERMAID)
        if (!cancelled && mountEl) {
          mountEl.innerHTML = svg
          const svgEl = mountEl.querySelector('svg')
          if (svgEl) {
            detachHover = attachPanel4MermaidNodeHover(svgEl, setHoverTip)
          }
        }
      } catch (e) {
        console.error(e)
        if (!cancelled && mountEl) {
          mountEl.innerHTML =
            '<p class="p4-mermaid-fallback">Diagram could not be rendered.</p>'
        }
      }
    })()

    return () => {
      cancelled = true
      detachHover()
      setHoverTip(null)
      mountEl.innerHTML = ''
    }
  }, [baseId])

  const tipMeta =
    hoverTip && PANEL4_MERMAID_NODE_NOTES[hoverTip.key]
      ? PANEL4_MERMAID_NODE_NOTES[hoverTip.key]
      : null

  const tooltipStyle = useMemo(() => {
    if (!hoverTip) return null
    const pad = 14
    const approxWidth = 352
    let left = hoverTip.x + pad
    let top = hoverTip.y + pad
    if (typeof window !== 'undefined') {
      left = Math.min(left, Math.max(12, window.innerWidth - approxWidth))
      top = Math.min(top, Math.max(12, window.innerHeight - 180))
    }
    return {
      position: 'fixed',
      left,
      top,
      zIndex: 80,
    }
  }, [hoverTip])

  return (
    <div className="p4-mermaid-scroll">
      <div
        ref={hostRef}
        className="p4-mermaid-root"
        aria-label="Decision structure flowchart — hover or focus a node for narrative notes"
      />
      {tipMeta && tooltipStyle ? (
        <div
          className="p4-mermaid-node-tooltip"
          role="tooltip"
          aria-live="polite"
          style={tooltipStyle}
        >
          <p className="p4-mermaid-node-tooltip-title">{tipMeta.title}</p>
          {tipMeta.paragraphs.map((p, i) => (
            <p key={i} className="p4-mermaid-node-tooltip-p">
              {p}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  )
}

/* ─────────────────────────────────────────────
   PANEL 4 – Customer Service SLA (policyholder-facing excerpt)
───────────────────────────────────────────── */
function Panel4CustomerServiceSla() {
  return (
    <div className="p4-sla-document">
      <header className="p4-sla-doc-header">
        <h3 className="p4-sla-doc-title">
          InsureCo Customer Service Commitment
        </h3>
        <p className="p4-sla-doc-subtitle">
          Service Level Agreement for Policyholders
        </p>
        <dl className="p4-sla-doc-meta">
          <div className="p4-sla-meta-row">
            <dt>Effective date</dt>
            <dd>
              Upon commencement of your policy with InsureCo
            </dd>
          </div>
          <div className="p4-sla-meta-row">
            <dt>Applies to</dt>
            <dd>
              All InsureCo policyholders across personal, commercial, and life
              insurance products
            </dd>
          </div>
        </dl>
      </header>

      <section
        className="p4-sla-section"
        aria-labelledby="p4-sla-commitment-intro"
      >
        <h4 id="p4-sla-commitment-intro" className="p4-sla-section-title">
          Our Commitment to You
        </h4>
        <p className="p4-sla-prose">
          At InsureCo, we understand that when you contact us, it is often at a
          moment that matters — after an accident, during a property emergency,
          or when you need urgent guidance on your coverage. We have invested in
          a modern cloud-based platform and AI-assisted customer service tools
          specifically to ensure that you receive a fast, accurate, and
          consistent response every time, through whichever channel you choose to
          reach us.
        </p>
        <p className="p4-sla-prose">
          This Service Level Agreement sets out the specific service standards
          you are entitled to as an InsureCo policyholder, and what we will do
          if we fall short of them.
        </p>
      </section>

      <section
        className="p4-sla-section"
        aria-labelledby="p4-sla-s1"
      >
        <h4 id="p4-sla-s1" className="p4-sla-section-title">
          1. Service Availability
        </h4>
        <p className="p4-sla-prose">
          Our digital services — including the InsureCo customer portal, mobile
          app, AI chat assistant, and online claims submission — are available{' '}
          <strong>
            24 hours a day, 7 days a week, 365 days a year
          </strong>
          , with a guaranteed monthly availability of{' '}
          <strong>99.9%</strong>.
        </p>
        <p className="p4-sla-prose">
          This means that in any given month, planned or unplanned downtime will
          not exceed 43.8 minutes. In the rare event of a system outage, our
          emergency claims line remains available at all times as an alternative
          channel.
        </p>
        <div className="table-scroll">
          <table className="data-table p4-sla-table">
            <thead>
              <tr>
                <th scope="col">Service channel</th>
                <th scope="col">Availability commitment</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Online customer portal &amp; mobile app</td>
                <td>99.9% monthly availability</td>
              </tr>
              <tr>
                <td>AI chat assistant</td>
                <td>99.9% monthly availability</td>
              </tr>
              <tr>
                <td>Online claims submission</td>
                <td>99.9% monthly availability</td>
              </tr>
              <tr>
                <td>Emergency claims phone line</td>
                <td>
                  24 / 7 / 365 — <strong>no exceptions</strong>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="p4-sla-prose">
          If our digital services fall below the 99.9% availability commitment in
          any calendar month, we will proactively contact affected policyholders
          and apply a goodwill credit to their next renewal premium as described
          in Section 5.
        </p>
      </section>

      <section className="p4-sla-section" aria-labelledby="p4-sla-s2">
        <h4 id="p4-sla-s2" className="p4-sla-section-title">
          2. Response Time Standards
        </h4>
        <p className="p4-sla-prose">
          We commit to the following response times across all service channels.
          These standards apply regardless of whether you are served by our AI
          assistant or a human agent.
        </p>

        <h5 className="p4-sla-subsection-title">
          2.1 General Enquiries (policy information, coverage questions, billing)
        </h5>
        <div className="table-scroll">
          <table className="data-table p4-sla-table">
            <thead>
              <tr>
                <th scope="col">Channel</th>
                <th scope="col">Response commitment</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>AI chat assistant</td>
                <td>Immediate — available 24 / 7</td>
              </tr>
              <tr>
                <td>Phone (human agent)</td>
                <td>Answer within 3 minutes during business hours</td>
              </tr>
              <tr>
                <td>Email or online form</td>
                <td>Substantive response within 1 business day</td>
              </tr>
              <tr>
                <td>Secure message via portal</td>
                <td>Substantive response within 1 business day</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h5 className="p4-sla-subsection-title">
          2.2 Claims — Standard (non-emergency)
        </h5>
        <p className="p4-sla-prose">
          A standard claim is any claim that does not involve immediate risk to
          life, safety, or property. This includes motor claims with no
          injuries, minor property damage, and travel claims.
        </p>
        <div className="table-scroll">
          <table className="data-table p4-sla-table">
            <thead>
              <tr>
                <th scope="col">Stage</th>
                <th scope="col">Commitment</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Claim acknowledgement</td>
                <td>Within 1 business hour of submission</td>
              </tr>
              <tr>
                <td>Claim handler assigned</td>
                <td>Within 4 business hours</td>
              </tr>
              <tr>
                <td>Initial coverage decision communicated</td>
                <td>
                  Within 3 business days of receiving all required documents
                </td>
              </tr>
              <tr>
                <td>Settlement payment issued (approved claims)</td>
                <td>Within 5 business days of final approval</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h5 className="p4-sla-subsection-title">
          2.3 Claims — Emergency (immediate risk to safety or property)
        </h5>
        <p className="p4-sla-prose">
          An emergency claim involves an active risk to your safety, your home, or
          your vehicle — for example, a flood in progress, a road accident with
          injuries, or a break-in at your property.
        </p>
        <div className="table-scroll">
          <table className="data-table p4-sla-table">
            <thead>
              <tr>
                <th scope="col">Stage</th>
                <th scope="col">Commitment</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Emergency line answered</td>
                <td>Within 60 seconds, 24 / 7 / 365</td>
              </tr>
              <tr>
                <td>Emergency assistance dispatched (where applicable)</td>
                <td>Within 30 minutes of call</td>
              </tr>
              <tr>
                <td>Emergency claim registered and handler assigned</td>
                <td>Within 1 hour of first contact</td>
              </tr>
              <tr>
                <td>
                  Interim payment or emergency accommodation arranged
                </td>
                <td>
                  Within 4 hours where policy entitlement confirmed
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="p4-sla-section" aria-labelledby="p4-sla-s3">
        <h4 id="p4-sla-s3" className="p4-sla-section-title">
          3. AI-Assisted Service Standards
        </h4>
        <p className="p4-sla-prose">
          InsureCo uses AI tools to assist both customers and our agents. We are
          committed to ensuring that AI enhances your experience rather than
          replacing the human judgement that matters in complex or sensitive
          situations.
        </p>
        <p className="p4-sla-prose">
          <strong>What our AI assistant can do for you:</strong> Answer policy
          questions, provide coverage summaries, guide you through the claims
          submission process, retrieve your documents, and connect you to the
          right human agent instantly.
        </p>
        <p className="p4-sla-prose">
          <strong>When you will always speak to a human agent:</strong> Any claim
          involving injury, bereavement, or dispute; any situation where you
          request a human agent; any coverage decision that affects your policy
          terms; and any complaint.
        </p>
        <p className="p4-sla-prose">
          <strong>AI accuracy commitment:</strong> Our AI assistant is trained on
          verified InsureCo policy documentation and is reviewed quarterly for
          accuracy. If you receive information from our AI assistant that you
          believe is incorrect, please notify us immediately. We will investigate,
          correct the record, and ensure the error does not affect your policy or
          claim outcome.
        </p>
      </section>

      <section className="p4-sla-section" aria-labelledby="p4-sla-s4">
        <h4 id="p4-sla-s4" className="p4-sla-section-title">
          4. Complaint Handling
        </h4>
        <p className="p4-sla-prose">
          If you are dissatisfied with any aspect of our service, you have the
          right to raise a formal complaint. We treat every complaint seriously
          and commit to the following:
        </p>
        <div className="table-scroll">
          <table className="data-table p4-sla-table">
            <thead>
              <tr>
                <th scope="col">Stage</th>
                <th scope="col">Commitment</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Complaint acknowledged</td>
                <td>Within 1 business day of receipt</td>
              </tr>
              <tr>
                <td>Complaint investigator assigned</td>
                <td>Within 2 business days</td>
              </tr>
              <tr>
                <td>Substantive response provided</td>
                <td>Within 8 business days</td>
              </tr>
              <tr>
                <td>Final resolution communicated</td>
                <td>Within 28 calendar days</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="p4-sla-prose">
          If we are unable to resolve your complaint within 28 days, we will
          write to you explaining the reason for the delay and the expected
          resolution date. You retain the right to refer your complaint to the
          relevant insurance ombudsman or regulatory authority at any time.
        </p>
      </section>

      <section className="p4-sla-section" aria-labelledby="p4-sla-s5">
        <h4 id="p4-sla-s5" className="p4-sla-section-title">
          5. Service Credits and Remedies
        </h4>
        <p className="p4-sla-prose">
          If InsureCo fails to meet the commitments set out in this SLA, the
          following remedies apply automatically. You do not need to request
          these — we will apply them proactively.
        </p>
        <div className="table-scroll">
          <table className="data-table p4-sla-table">
            <thead>
              <tr>
                <th scope="col">Breach</th>
                <th scope="col">Remedy</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  Digital platform availability below 99.9% in a calendar month
                </td>
                <td>
                  Goodwill credit of 1 month&apos;s premium applied at next
                  renewal
                </td>
              </tr>
              <tr>
                <td>Emergency claims line not answered within 60 seconds</td>
                <td>
                  Priority case handling and written apology within 2 business
                  days
                </td>
              </tr>
              <tr>
                <td>
                  Standard claim initial decision not communicated within 3
                  business days
                </td>
                <td>
                  Dedicated senior claims handler assigned and written
                  explanation provided
                </td>
              </tr>
              <tr>
                <td>Complaint not resolved within 28 calendar days</td>
                <td>
                  Written escalation to InsureCo&apos;s Head of Customer Service
                  and regulatory notification where required
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="p4-sla-section" aria-labelledby="p4-sla-s6">
        <h4 id="p4-sla-s6" className="p4-sla-section-title">
          6. Data Privacy and Security
        </h4>
        <p className="p4-sla-prose">
          InsureCo&apos;s cloud platform is hosted on enterprise-grade
          infrastructure with the following protections in place for your
          personal and financial data:
        </p>
        <ul className="p4-sla-bullet-list">
          <li>
            All data is encrypted in transit and at rest using industry-standard
            AES-256 encryption.
          </li>
          <li>
            Your data is stored within the jurisdiction specified in your policy
            documentation and is never transferred outside of it without your
            explicit consent.
          </li>
          <li>
            In the event of a data breach affecting your personal information,
            InsureCo will notify you within{' '}
            <strong>72 hours</strong> of becoming aware of the breach, in
            accordance with applicable data protection regulations.
          </li>
          <li>
            You have the right to request a copy of all personal data InsureCo
            holds about you at any time, free of charge, with a response provided
            within 30 calendar days.
          </li>
        </ul>
      </section>

      <section className="p4-sla-section" aria-labelledby="p4-sla-s7">
        <h4 id="p4-sla-s7" className="p4-sla-section-title">
          7. Planned Maintenance
        </h4>
        <p className="p4-sla-prose">
          Planned system maintenance will be scheduled outside of peak business
          hours (between 00:00 and 05:00 local time) and will be communicated to
          policyholders via the InsureCo customer portal and email at least{' '}
          <strong>72 hours in advance</strong>. Emergency claims services will
          remain fully operational during all planned maintenance windows.
        </p>
      </section>

      <section className="p4-sla-section p4-sla-section-last" aria-labelledby="p4-sla-s8">
        <h4 id="p4-sla-s8" className="p4-sla-section-title">
          8. How to Contact Us
        </h4>
        <div className="table-scroll">
          <table className="data-table p4-sla-table">
            <thead>
              <tr>
                <th scope="col">Channel</th>
                <th scope="col">Details</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>AI Chat Assistant</td>
                <td>Available 24 / 7 via the InsureCo app or website</td>
              </tr>
              <tr>
                <td>Customer Service Phone</td>
                <td>
                  Available during business hours (08:00 – 20:00, Monday to
                  Saturday)
                </td>
              </tr>
              <tr>
                <td>Emergency Claims Line</td>
                <td>Available 24 / 7 / 365</td>
              </tr>
              <tr>
                <td>Email / Online Form</td>
                <td>Via the InsureCo customer portal</td>
              </tr>
              <tr>
                <td>Complaints</td>
                <td>
                  complaints@insureco.com or in writing to InsureCo Customer
                  Relations
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="p4-sla-prose p4-sla-prose-foot">
          InsureCo is authorised and regulated by the relevant insurance
          regulatory authority. This SLA does not limit or replace any statutory
          rights you hold as a policyholder under applicable insurance and
          consumer protection legislation.
        </p>
      </section>
    </div>
  )
}

/* ─────────────────────────────────────────────
   PANEL 4 – Governance & SLA
───────────────────────────────────────────── */
function Panel4Governance() {
  return (
    <main className="migration-panel" id="panel4-governance">
      <header className="panel-header panel-header-context">
        <p className="migration-eyebrow">Cloud management · Section 4</p>
        <p className="panel-title-context">Governance &amp; SLA Terms</p>
        <p className="panel-subtitle">
          Decision structures, committee cadences, and uptime commitments
          governing the cloud deployment programme.
        </p>
      </header>

      {/* Decision structure — single Mermaid governance chart */}
      <section className="panel-card" aria-labelledby="p4-committee-heading">
        <h2 id="p4-committee-heading" className="card-heading">
          Decision Structure
        </h2>
        <Panel4DecisionStructureMermaid />
        <div
          className="p4-colour-legend"
          role="region"
          aria-labelledby="p4-colour-legend-heading"
        >
          <h3 id="p4-colour-legend-heading" className="p4-colour-legend-title">
            Colour legend
          </h3>
          <p className="p4-colour-legend-lead">
            Node fills in the chart above map to governance families below.
          </p>
          <div className="table-scroll">
            <table className="p4-colour-legend-table">
              <thead>
                <tr>
                  <th scope="col">Colour</th>
                  <th scope="col">Family</th>
                  <th scope="col">Roles</th>
                </tr>
              </thead>
              <tbody>
                {PANEL4_DECISION_COLOUR_LEGEND.map((row) => (
                  <tr key={row.colourName}>
                    <td>
                      <span className="p4-legend-colour-cell">
                        <span
                          className="p4-legend-swatch"
                          style={{ background: row.swatch }}
                          aria-hidden
                        />
                        <span className="p4-legend-colour-name">
                          {row.colourName}
                        </span>
                      </span>
                    </td>
                    <td className="p4-legend-family">{row.family}</td>
                    <td className="p4-legend-roles">{row.roles}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* SLA — InsureCo Customer Service Commitment */}
      <section className="panel-card" aria-labelledby="p4-sla-heading">
        <h2 id="p4-sla-heading" className="card-heading">
          SLA Terms
        </h2>
        <p className="card-lead p4-sla-card-lead">
          Policyholder-facing service standards, response times, remedies, and
          contact channels — aligned with the cloud and AI programme.
        </p>
        <Panel4CustomerServiceSla />
      </section>
    </main>
  )
}

const PANEL5_PROGRAMME_TOTAL_MONTHS = 24

const PANEL5_IMPLEMENTATION_ROADMAP_PHASES = [
  {
    id: 'p0',
    title: 'Phase 0 — Foundation & CI/CD Pipeline Setup',
    horizon: 'Months 1–3',
    startMonth: 1,
    endMonth: 3,
  },
  {
    id: 'p1',
    title: 'Phase 1 — Non-Critical Workload Migration',
    horizon: 'Months 3–9',
    startMonth: 3,
    endMonth: 9,
  },
  {
    id: 'p2',
    title: 'Phase 2 — Core Insurance Systems Migration',
    horizon: 'Months 9–18',
    startMonth: 9,
    endMonth: 18,
  },
  {
    id: 'p3',
    title:
      'Phase 3 — AI Customer Service Platform Build & Deployment',
    horizon: 'Months 6–18 (parallel)',
    startMonth: 6,
    endMonth: 18,
    parallel: true,
  },
  {
    id: 'p4',
    title:
      'Phase 4 — Optimisation & Continuous Improvement',
    horizon: 'Months 18–24',
    startMonth: 18,
    endMonth: 24,
  },
]

function panel5GanttPct(startMonth, endMonth) {
  const denom = PANEL5_PROGRAMME_TOTAL_MONTHS
  const leftPct = ((startMonth - 1) / denom) * 100
  const widthPct = ((endMonth - startMonth + 1) / denom) * 100
  return { leftPct, widthPct }
}

function Panel5ImplementationRoadmap() {
  return (
    <section className="panel-card" aria-labelledby="p5-roadmap-heading">
      <h2 id="p5-roadmap-heading" className="card-heading">
        Implementation Roadmap
      </h2>
      <p className="card-lead p5-roadmap-lead">
        High-level sequencing over a{' '}
        <strong>{PANEL5_PROGRAMME_TOTAL_MONTHS}-month</strong> programme
        horizon. Phase 3 runs <strong>in parallel</strong> with overlapping
        migration waves.
      </p>

      <div
        className="p5-roadmap-chart"
        role="group"
        aria-label="Gantt-style programme timeline"
      >
        <div className="p5-gantt-header-row">
          <div aria-hidden="true" className="p5-gantt-corner" />
          <div className="p5-gantt-month-axis">
            <div className="p5-gantt-axis-inner" aria-hidden="true">
              <span className="p5-gantt-axis-zero">Month 1</span>
              {[6, 12, 18].map((month) => (
                <span
                  key={month}
                  className="p5-gantt-axis-tick"
                  style={{
                    left: `${((month - 1) / PANEL5_PROGRAMME_TOTAL_MONTHS) * 100}%`,
                  }}
                >
                  M{month}
                </span>
              ))}
              <span className="p5-gantt-axis-end">Month 24</span>
            </div>
          </div>
        </div>

        {PANEL5_IMPLEMENTATION_ROADMAP_PHASES.map((phase) => {
          const { leftPct, widthPct } = panel5GanttPct(
            phase.startMonth,
            phase.endMonth,
          )
          const monthsDur = phase.endMonth - phase.startMonth + 1
          return (
            <div className="p5-gantt-row" key={phase.id}>
              <div className="p5-gantt-row-label">
                <span className="p5-gantt-phase-title">{phase.title}</span>
                <span className="p5-gantt-phase-horizon">
                  {phase.horizon}
                  {phase.parallel ? (
                    <>
                      {' '}
                      <span className="p5-gantt-badge-parallel">Parallel</span>
                    </>
                  ) : null}
                </span>
              </div>
              <div
                className="p5-gantt-track-wrap"
                title={`Spans months ${phase.startMonth}–${phase.endMonth} (${monthsDur} months)`}
              >
                <div className="p5-gantt-track">
                  <div
                    className={`p5-gantt-bar p5-gantt-bar--${phase.id}`}
                    style={{
                      left: `${leftPct}%`,
                      width: `${widthPct}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <table className="sr-only">
        <caption>Implementation roadmap phases and month ranges</caption>
        <thead>
          <tr>
            <th scope="col">Phase</th>
            <th scope="col">Months (inclusive)</th>
          </tr>
        </thead>
        <tbody>
          {PANEL5_IMPLEMENTATION_ROADMAP_PHASES.map((ph) => (
            <tr key={ph.id}>
              <td>{ph.title}</td>
              <td>
                {ph.startMonth}–{ph.endMonth}
                {ph.parallel ? ' · parallel stream' : ''}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

/**
 * Lead time (days): team_baseline(n) × auto_factor × PANEL5_LEAD_TIME_VALUE_MULTIPLIER.
 * Piecewise exponentials with joint at n = 10 (inflection / regime change):
 *   n ∈ [2, 10]: 10 × exp(−k₁ × (n − 2)), k₁ = ln(5) / 8 so L(2) = 10 and L(10) = 2.
 *   n ∈ [10, 30]: 2 × exp(−k₂ × (n − 10)), k₂ = ln(2) / 20 so L(10) = 2 and L(30) = 1.
 * auto_factor = 1 − 0.65 × ln(1 + automation%) / ln(101).
 */
const PANEL5_LEAD_TIME_TEAM_SLIDER_MIN = 2
const PANEL5_LEAD_TIME_TEAM_SLIDER_MAX = 30
/** Joint between the two exponential segments (inflection region). */
const PANEL5_LEAD_TIME_JOIN_TEAM = 10
const PANEL5_LEAD_TIME_K_DECAY_EARLY = Math.log(5) / 8
const PANEL5_LEAD_TIME_K_DECAY_LATE = Math.log(2) / 20
/** Applied to baseline × automation (currently 2×). */
const PANEL5_LEAD_TIME_VALUE_MULTIPLIER = 2
/** UI band: spectrum and displayed days are clamped to 0–10 days. */
const PANEL5_LEAD_TIME_DAYS_CAP = 10

/** Expected days from team size alone at 0% automation (anchor 10 / 2 / 1 days). */
function panel5LeadTimeTeamDaysBaseline(teamSize) {
  const n = Math.min(
    PANEL5_LEAD_TIME_TEAM_SLIDER_MAX,
    Math.max(PANEL5_LEAD_TIME_TEAM_SLIDER_MIN, teamSize),
  )
  const n0 = PANEL5_LEAD_TIME_JOIN_TEAM
  if (n <= n0) {
    return 10 * Math.exp(-PANEL5_LEAD_TIME_K_DECAY_EARLY * (n - 2))
  }
  return 2 * Math.exp(-PANEL5_LEAD_TIME_K_DECAY_LATE * (n - n0))
}

function panel5LeadTimeDaysRaw(teamSize, automationPct) {
  const base = panel5LeadTimeTeamDaysBaseline(teamSize)
  const autoFactor =
    1 - (0.65 * Math.log(1 + automationPct)) / Math.log(101)
  return base * autoFactor * PANEL5_LEAD_TIME_VALUE_MULTIPLIER
}

function panel5LeadTimeDaysClamped(teamSize, automationPct) {
  return Math.min(
    PANEL5_LEAD_TIME_DAYS_CAP,
    Math.max(0, panel5LeadTimeDaysRaw(teamSize, automationPct)),
  )
}

function Panel5LeadTimeSurface({ teamSize, automationPct }) {
  const rawDays = panel5LeadTimeDaysRaw(teamSize, automationPct)
  const days = panel5LeadTimeDaysClamped(teamSize, automationPct)
  const teamBaseline = panel5LeadTimeTeamDaysBaseline(teamSize)
  const teamScaled =
    teamBaseline * PANEL5_LEAD_TIME_VALUE_MULTIPLIER
  const autoFactor =
    1 - (0.65 * Math.log(1 + automationPct)) / Math.log(101)
  const towardBadFromLeftPct = Math.min(
    100,
    Math.max(0, (days / PANEL5_LEAD_TIME_DAYS_CAP) * 100),
  )
  /** Bar: bad (red) left, good (green) right — mirror so low days sit on the right. */
  const onSpectrumFromLeftPct = 100 - towardBadFromLeftPct

  return (
    <section className="panel-card" aria-labelledby="p5-leadtime-heading">
      <h2 id="p5-leadtime-heading" className="card-heading">
        Lead Time for Changes (Days)
      </h2>

      <p className="p5-metric-value p5-leadtime-outcome" aria-live="polite">
        <strong>{days.toFixed(1)}</strong> days
        {rawDays > PANEL5_LEAD_TIME_DAYS_CAP ? (
          <span className="p5-leadtime-cap-note">
            {' '}
            (capped from {rawDays.toFixed(1)} at{' '}
            {PANEL5_LEAD_TIME_DAYS_CAP} days max for display)
          </span>
        ) : null}
      </p>

      <p className="p5-leadtime-check" aria-label="Model check">
        Check: {teamScaled.toFixed(2)} ({PANEL5_LEAD_TIME_VALUE_MULTIPLIER} × team
        baseline at 0% automation: 10·e
        <sup>−{PANEL5_LEAD_TIME_K_DECAY_EARLY.toFixed(3)}(n−2)</sup> for n ≤ 10,
        else 2·e
        <sup>−{PANEL5_LEAD_TIME_K_DECAY_LATE.toFixed(3)}(n−10)</sup>) ×{' '}
        {autoFactor.toFixed(3)} (auto_factor) ≈{' '}
        <strong>{rawDays.toFixed(1)}</strong> days before capping.
      </p>

      <div className="p5-leadtime-1d-legend">
        <p className="p5-leadtime-1d-title">Lead time scale (0–{PANEL5_LEAD_TIME_DAYS_CAP} days)</p>
        <div
          className="p5-leadtime-1d-track"
          role="img"
          aria-label={`Gradient from red on the left (long lead time, bad) to green on the right (short lead time, good). Marker about ${towardBadFromLeftPct.toFixed(0)} percent from the left (bad) end.`}
        >
          <span
            className="p5-leadtime-1d-marker"
            style={{ left: `${onSpectrumFromLeftPct}%` }}
          />
        </div>
        <div className="p5-leadtime-1d-axis">
          <span>{PANEL5_LEAD_TIME_DAYS_CAP} days — bad (red)</span>
          <span>0 days — good (green)</span>
        </div>
      </div>

      <p className="p5-leadtime-sweet-spot">
        Team baseline (0% automation), then ×{PANEL5_LEAD_TIME_VALUE_MULTIPLIER}: ~<strong>20</strong>{' '}
        days at 2 engineers, ~<strong>4</strong> at 10, ~<strong>2</strong> at 30 — piecewise
        exponentials joined at <strong>n = 10</strong>. Higher automation multiplies by
        auto_factor &lt; 1. Lead time scale: <strong>0–10</strong> days (values above 10 are
        capped for display).
      </p>
    </section>
  )
}

/**
 * Deploys/month: team_baseline(n) × auto_factor. Joint at n = 10 (inflection).
 * At 100% automation (auto_factor = 1): n=2 → ~4, n=10 → ~10, n=30 → ~15.
 *   n ∈ [2, 10]: 4 × exp(k₁ × (n − 2)), k₁ = ln(2.5) / 8.
 *   n ∈ [10, 30]: 10 × exp(k₂ × (n − 10)), k₂ = ln(1.5) / 20.
 * auto_factor = ln(1 + automation% × 1.5) / ln(151) (0 at 0% automation, 1 at 100%).
 */
const PANEL5_DEPFREQ_TEAM_SLIDER_MIN = 2
const PANEL5_DEPFREQ_TEAM_SLIDER_MAX = 30
const PANEL5_DEPFREQ_JOIN_TEAM = 10
const PANEL5_DEPFREQ_K_EARLY = Math.log(2.5) / 8
const PANEL5_DEPFREQ_K_LATE = Math.log(1.5) / 20
/** Colour bar maps deploys to 1–20 / month (marker uses this span). */
const PANEL5_DEPFREQ_SPECTRUM_MIN = 1
const PANEL5_DEPFREQ_SPECTRUM_MAX = 20

function panel5DeployFreqTeamBaseline(teamSize) {
  const n = Math.min(
    PANEL5_DEPFREQ_TEAM_SLIDER_MAX,
    Math.max(PANEL5_DEPFREQ_TEAM_SLIDER_MIN, teamSize),
  )
  const n0 = PANEL5_DEPFREQ_JOIN_TEAM
  if (n <= n0) {
    return 4 * Math.exp(PANEL5_DEPFREQ_K_EARLY * (n - 2))
  }
  return 10 * Math.exp(PANEL5_DEPFREQ_K_LATE * (n - n0))
}

function panel5DeployFreqPerMonthRaw(teamSize, automationPct) {
  const base = panel5DeployFreqTeamBaseline(teamSize)
  const autoFactor =
    Math.log(1 + automationPct * 1.5) / Math.log(151)
  return base * autoFactor
}

function panel5DeployFreqPerMonthClamped(teamSize, automationPct) {
  return Math.min(
    PANEL5_DEPFREQ_SPECTRUM_MAX,
    Math.max(0, panel5DeployFreqPerMonthRaw(teamSize, automationPct)),
  )
}

function Panel5DeployFrequencySurface({ teamSize, automationPct }) {
  const rawDeploys = panel5DeployFreqPerMonthRaw(teamSize, automationPct)
  const deploys = panel5DeployFreqPerMonthClamped(teamSize, automationPct)
  const teamBaseline = panel5DeployFreqTeamBaseline(teamSize)
  const autoFactor =
    Math.log(1 + automationPct * 1.5) / Math.log(151)
  const autoFactorAt70 =
    Math.log(1 + 70 * 1.5) / Math.log(151)
  const spectrumSpan =
    PANEL5_DEPFREQ_SPECTRUM_MAX - PANEL5_DEPFREQ_SPECTRUM_MIN
  const onSpectrum = Math.min(
    100,
    Math.max(
      0,
      ((deploys - PANEL5_DEPFREQ_SPECTRUM_MIN) / spectrumSpan) * 100,
    ),
  )

  return (
    <section className="panel-card" aria-labelledby="p5-deployfreq-heading">
      <h2 id="p5-deployfreq-heading" className="card-heading">
        Deployment Frequency (Deployments per Month)
      </h2>

      <p className="p5-metric-value p5-deployfreq-outcome" aria-live="polite">
        <strong>{deploys.toFixed(1)}</strong> deploys / month
        {rawDeploys > PANEL5_DEPFREQ_SPECTRUM_MAX ? (
          <span className="p5-deployfreq-cap-note">
            {' '}
            (capped from {rawDeploys.toFixed(1)} at{' '}
            {PANEL5_DEPFREQ_SPECTRUM_MAX} deploys/mo for display)
          </span>
        ) : null}
      </p>

      <p className="p5-deployfreq-check" aria-label="Model check">
        Check: {teamBaseline.toFixed(2)} (team baseline at 100% automation: 4·e
        <sup>{PANEL5_DEPFREQ_K_EARLY.toFixed(3)}(n−2)</sup> for n ≤ 10, else 10·e
        <sup>{PANEL5_DEPFREQ_K_LATE.toFixed(3)}(n−10)</sup>) ×{' '}
        {autoFactor.toFixed(4)} (auto_factor) ≈{' '}
        <strong>{rawDeploys.toFixed(1)}</strong> deploys/month before capping. At
        70% automation, auto_factor ≈ {autoFactorAt70.toFixed(3)} (
        {(autoFactorAt70 * 100).toFixed(0)}% of the 100% value).
      </p>

      <div className="p5-deployfreq-1d-legend">
        <p className="p5-deployfreq-1d-title">
          Colour bar: deployment frequency ({PANEL5_DEPFREQ_SPECTRUM_MIN}–
          {PANEL5_DEPFREQ_SPECTRUM_MAX} deploys/month)
        </p>
        <div
          className="p5-deployfreq-1d-track"
          role="img"
          aria-label={`Gradient from dark blue (low frequency, bad) to bright yellow (high frequency, good). Marker about ${onSpectrum.toFixed(0)} percent along the scale.`}
        >
          <span
            className="p5-deployfreq-1d-marker"
            style={{ left: `${onSpectrum}%` }}
          />
        </div>
        <div className="p5-deployfreq-1d-axis">
          <span>{PANEL5_DEPFREQ_SPECTRUM_MIN} — low (dark blue)</span>
          <span>
            {PANEL5_DEPFREQ_SPECTRUM_MAX} — high (bright yellow)
          </span>
        </div>
      </div>

      <p className="p5-deployfreq-sweet-spot">
        Team baseline at <strong>100%</strong> automation: ~<strong>4</strong> deploys/mo
        at 2 engineers, ~<strong>10</strong> at 10, ~<strong>15</strong> at 30 — piecewise
        exponentials joined at <strong>n = 10</strong>. Lower automation scales by
        auto_factor (0 at 0% automation). Sweet spot: automation{' '}
        <strong>65–85%</strong> (same band as the full surface view).
      </p>
    </section>
  )
}

/**
 * Restore time (hours): team_baseline(n) × auto_factor. Joint at n = 10 (inflection).
 * At 0% automation (auto_factor = 1): n=2 → ~6 h, n=10 → ~0.5 h, n=30 → ~0.3 h.
 *   n ∈ [2, 10]: 6 × exp(−k₁ × (n − 2)), k₁ = ln(12) / 8 so T(10) = 0.5.
 *   n ∈ [10, 30]: 0.5 × exp(−k₂ × (n − 10)), k₂ = ln(5/3) / 20 so T(30) = 0.3.
 * auto_factor = 1 − 0.70 × ln(1 + automation%) / ln(101).
 */
const PANEL5_RESTORE_TEAM_SLIDER_MIN = 2
const PANEL5_RESTORE_TEAM_SLIDER_MAX = 30
const PANEL5_RESTORE_JOIN_TEAM = 10
const PANEL5_RESTORE_K_DECAY_EARLY = Math.log(12) / 8
const PANEL5_RESTORE_K_DECAY_LATE = Math.log(5 / 3) / 20
/** Colour bar / clamp span (0–3 h; shorter restore = better, toward green). */
const PANEL5_RESTORE_SPECTRUM_MAX = 3

function panel5RestoreTimeTeamHoursBaseline(teamSize) {
  const n = Math.min(
    PANEL5_RESTORE_TEAM_SLIDER_MAX,
    Math.max(PANEL5_RESTORE_TEAM_SLIDER_MIN, teamSize),
  )
  const n0 = PANEL5_RESTORE_JOIN_TEAM
  if (n <= n0) {
    return 6 * Math.exp(-PANEL5_RESTORE_K_DECAY_EARLY * (n - 2))
  }
  return 0.5 * Math.exp(-PANEL5_RESTORE_K_DECAY_LATE * (n - n0))
}

function panel5RestoreTimeHoursRaw(teamSize, automationPct) {
  const base = panel5RestoreTimeTeamHoursBaseline(teamSize)
  const autoFactor =
    1 - (0.7 * Math.log(1 + automationPct)) / Math.log(101)
  return base * autoFactor
}

function panel5RestoreTimeHoursClamped(teamSize, automationPct) {
  return Math.min(
    PANEL5_RESTORE_SPECTRUM_MAX,
    Math.max(0, panel5RestoreTimeHoursRaw(teamSize, automationPct)),
  )
}

function Panel5RestoreTimeSurface({ teamSize, automationPct }) {
  const rawHours = panel5RestoreTimeHoursRaw(teamSize, automationPct)
  const hours = panel5RestoreTimeHoursClamped(teamSize, automationPct)
  const teamBaseline = panel5RestoreTimeTeamHoursBaseline(teamSize)
  const autoFactor =
    1 - (0.7 * Math.log(1 + automationPct)) / Math.log(101)
  const autoFactorAt70 =
    1 - (0.7 * Math.log(1 + 70)) / Math.log(101)
  const onSpectrumGoodEnd = Math.min(
    100,
    Math.max(0, (1 - hours / PANEL5_RESTORE_SPECTRUM_MAX) * 100),
  )

  return (
    <section className="panel-card" aria-labelledby="p5-restore-heading">
      <h2 id="p5-restore-heading" className="card-heading">
        Time to Restore Service (Hours)
      </h2>

      <p className="p5-metric-value p5-restore-outcome" aria-live="polite">
        <strong>{hours.toFixed(1)}</strong> hours
        {rawHours > PANEL5_RESTORE_SPECTRUM_MAX ? (
          <span className="p5-restore-cap-note">
            {' '}
            (capped from {rawHours.toFixed(1)} at {PANEL5_RESTORE_SPECTRUM_MAX}{' '}
            hours for display)
          </span>
        ) : null}
      </p>

      <p className="p5-restore-check" aria-label="Model check">
        Check: {teamBaseline.toFixed(3)} (team baseline at 0% automation: 6·e
        <sup>−{PANEL5_RESTORE_K_DECAY_EARLY.toFixed(3)}(n−2)</sup> for n ≤ 10, else
        0.5·e
        <sup>−{PANEL5_RESTORE_K_DECAY_LATE.toFixed(3)}(n−10)</sup>) ×{' '}
        {autoFactor.toFixed(4)} (auto_factor) ≈{' '}
        <strong>{rawHours.toFixed(2)}</strong> hours before capping. At 70%
        automation, auto_factor ≈ {autoFactorAt70.toFixed(3)}; at 100%,{' '}
        {(1 - 0.7).toFixed(2)}.
      </p>

      <div className="p5-restore-1d-legend">
        <p className="p5-restore-1d-title">
          Colour bar: restore time (0–{PANEL5_RESTORE_SPECTRUM_MAX} hours)
        </p>
        <div
          className="p5-restore-1d-track"
          role="img"
          aria-label={`Gradient from deep red on the left (long restore, bad) to light green on the right (short restore, good). Marker about ${onSpectrumGoodEnd.toFixed(0)} percent toward the good end.`}
        >
          <span
            className="p5-restore-1d-marker"
            style={{ left: `${onSpectrumGoodEnd}%` }}
          />
        </div>
        <div className="p5-restore-1d-axis">
          <span>
            {PANEL5_RESTORE_SPECTRUM_MAX} h — bad (deep red)
          </span>
          <span>0 h — good (light green)</span>
        </div>
      </div>

      <p className="p5-restore-sweet-spot">
        Team baseline at <strong>0%</strong> automation: ~<strong>6</strong> h at 2
        engineers, ~<strong>0.5</strong> h at 10, ~<strong>0.3</strong> h at 30 — piecewise
        exponentials joined at <strong>n = 10</strong>. Higher automation multiplies by
        auto_factor &lt; 1. Restore time scale: <strong>0–3</strong> h (values above 3 are
        capped for display). Sweet spot: automation <strong>70–90%</strong> (same band as the
        full surface view).
      </p>
    </section>
  )
}

/**
 * Change failure rate (%): team_baseline(n) × auto_factor × PANEL5_CFR_VALUE_MULTIPLIER.
 * Joint at team size n = 10. Core baseline at 0% automation: n=2 → ~20%, n=10 → ~5%, n=30 → ~2%
 * (then ×2 for displayed model).
 *   n ∈ [2, 10]: 20 × exp(−k₁ × (n − 2)), k₁ = ln(4) / 8.
 *   n ∈ [10, 30]: 5 × exp(−k₂ × (n − 10)), k₂ = ln(2.5) / 20.
 * auto_factor = 1 − 0.75 × √(automation% / 100) (1 at 0%, 0.25 at 100%).
 */
const PANEL5_CFR_TEAM_SLIDER_MIN = 2
const PANEL5_CFR_TEAM_SLIDER_MAX = 30
const PANEL5_CFR_JOIN_TEAM = 10
const PANEL5_CFR_K_DECAY_EARLY = Math.log(4) / 8
const PANEL5_CFR_K_DECAY_LATE = Math.log(2.5) / 20
/** Colour bar / clamp span (0–20%). */
const PANEL5_CFR_SPECTRUM_MAX = 20
/** Applied after baseline × automation (currently 2×). */
const PANEL5_CFR_VALUE_MULTIPLIER = 2

function panel5ChangeFailureAutoFactor(automationPct) {
  const p = Math.max(0, Math.min(100, automationPct)) / 100
  return 1 - 0.75 * Math.sqrt(p)
}

function panel5ChangeFailureTeamPctBaseline(teamSize) {
  const n = Math.min(
    PANEL5_CFR_TEAM_SLIDER_MAX,
    Math.max(PANEL5_CFR_TEAM_SLIDER_MIN, teamSize),
  )
  const n0 = PANEL5_CFR_JOIN_TEAM
  if (n <= n0) {
    return 20 * Math.exp(-PANEL5_CFR_K_DECAY_EARLY * (n - 2))
  }
  return 5 * Math.exp(-PANEL5_CFR_K_DECAY_LATE * (n - n0))
}

function panel5ChangeFailurePctRaw(teamSize, automationPct) {
  const base = panel5ChangeFailureTeamPctBaseline(teamSize)
  const autoFactor = panel5ChangeFailureAutoFactor(automationPct)
  return base * autoFactor * PANEL5_CFR_VALUE_MULTIPLIER
}

function panel5ChangeFailurePctClamped(teamSize, automationPct) {
  return Math.min(
    PANEL5_CFR_SPECTRUM_MAX,
    Math.max(0, panel5ChangeFailurePctRaw(teamSize, automationPct)),
  )
}

function Panel5ChangeFailureSurface({ teamSize, automationPct }) {
  const rawPct = panel5ChangeFailurePctRaw(teamSize, automationPct)
  const pct = panel5ChangeFailurePctClamped(teamSize, automationPct)
  const teamBaseline = panel5ChangeFailureTeamPctBaseline(teamSize)
  const teamScaled =
    teamBaseline * PANEL5_CFR_VALUE_MULTIPLIER
  const autoFactor = panel5ChangeFailureAutoFactor(automationPct)
  const autoFactorAt70 = panel5ChangeFailureAutoFactor(70)
  const onSpectrumGoodEnd = Math.min(
    100,
    Math.max(0, (1 - pct / PANEL5_CFR_SPECTRUM_MAX) * 100),
  )

  return (
    <section className="panel-card" aria-labelledby="p5-cfr-heading">
      <h2 id="p5-cfr-heading" className="card-heading">
        Change Failure Rate (%)
      </h2>

      <p className="p5-metric-value p5-cfr-outcome" aria-live="polite">
        <strong>{pct.toFixed(1)}</strong>%
        {rawPct > PANEL5_CFR_SPECTRUM_MAX ? (
          <span className="p5-cfr-cap-note">
            {' '}
            (capped from {rawPct.toFixed(1)}% at {PANEL5_CFR_SPECTRUM_MAX}% for
            display)
          </span>
        ) : null}
      </p>

      <p className="p5-cfr-check" aria-label="Model check">
        Check: {teamScaled.toFixed(2)} ({PANEL5_CFR_VALUE_MULTIPLIER} × team baseline at
        0% automation: 20·e
        <sup>−{PANEL5_CFR_K_DECAY_EARLY.toFixed(3)}(n−2)</sup> for n ≤ 10, else 5·e
        <sup>−{PANEL5_CFR_K_DECAY_LATE.toFixed(3)}(n−10)</sup>) ×{' '}
        {autoFactor.toFixed(4)} (auto_factor) ≈{' '}
        <strong>{rawPct.toFixed(2)}</strong>% before capping. At 70% automation,
        auto_factor ≈ {autoFactorAt70.toFixed(3)}; at 100%,{' '}
        {panel5ChangeFailureAutoFactor(100).toFixed(2)}.
      </p>

      <div className="p5-cfr-1d-legend">
        <p className="p5-cfr-1d-title">
          Colour bar: failure rate (0–{PANEL5_CFR_SPECTRUM_MAX}%)
        </p>
        <div
          className="p5-cfr-1d-track"
          role="img"
          aria-label={`Gradient from bright red on the left (high failure rate, bad) to dark green on the right (low failure rate, good). Marker about ${onSpectrumGoodEnd.toFixed(0)} percent toward the good end.`}
        >
          <span
            className="p5-cfr-1d-marker"
            style={{ left: `${onSpectrumGoodEnd}%` }}
          />
        </div>
        <div className="p5-cfr-1d-axis">
          <span>
            {PANEL5_CFR_SPECTRUM_MAX}% — bad (bright red)
          </span>
          <span>0% — good (dark green)</span>
        </div>
      </div>

      <p className="p5-cfr-sweet-spot">
        After ×{PANEL5_CFR_VALUE_MULTIPLIER}, team curve at <strong>0%</strong> automation:
        ~<strong>40</strong>% at 2 engineers, ~<strong>10</strong>% at 10, ~<strong>4</strong>% at
        30 — piecewise exponentials joined at <strong>n = 10</strong>. Higher automation
        multiplies by auto_factor &lt; 1. Display spectrum stays <strong>0–20</strong>% (raw
        values above 20% show a cap note). Sweet spot: automation <strong>65–85%</strong>{' '}
        (same band as the full surface view).
      </p>
    </section>
  )
}

/* ─────────────────────────────────────────────
   PANEL 5 – CI/CD Pipeline Efficiency (cloud migration simulator)
───────────────────────────────────────────── */
function Panel5CiCd({ automationPct, setAutomationPct, teamSize, setTeamSize }) {
  return (
    <main className="migration-panel" id="panel5-cicd-pipeline-efficiency">
      <header className="panel-header panel-header-context">
        <p className="migration-eyebrow">Cloud migration simulator · Panel 5</p>
        <p className="panel-title-context">CI/CD pipeline efficiency</p>
        <p className="panel-subtitle">
          Adjust automation coverage and team size to see how deployment
          frequency and failure rate change. Automation above 70 % unlocks
          a step-change improvement.
        </p>
      </header>

      <Panel5ImplementationRoadmap />

      <section className="panel-card" aria-labelledby="p5-controls-heading">
        <h2 id="p5-controls-heading" className="card-heading">Controls</h2>
        <div className="p5-sliders">
          <div className="p5-slider-row">
            <label className="p5-slider-label" htmlFor="p5-automation">
              Automation coverage: <strong>{automationPct}%</strong>
            </label>
            <input
              id="p5-automation"
              type="range"
              min="0"
              max="100"
              value={automationPct}
              onChange={(e) => setAutomationPct(Number(e.target.value))}
              className="p5-range"
              aria-label="Automation percentage"
            />
            <div className="p5-range-labels">
              <span>0%</span><span>50%</span><span>100%</span>
            </div>
          </div>
          <div className="p5-slider-row">
            <label className="p5-slider-label" htmlFor="p5-teamsize">
              Team size: <strong>{teamSize} engineers</strong>
            </label>
            <input
              id="p5-teamsize"
              type="range"
              min="2"
              max="30"
              value={teamSize}
              onChange={(e) => setTeamSize(Number(e.target.value))}
              className="p5-range"
              aria-label="Team size"
            />
            <div className="p5-range-labels">
              <span>2</span><span>16</span><span>30</span>
            </div>
          </div>
        </div>
      </section>

      <div className="p5-dora-metrics-grid">
        <Panel5LeadTimeSurface
          teamSize={teamSize}
          automationPct={automationPct}
        />

        <Panel5DeployFrequencySurface
          teamSize={teamSize}
          automationPct={automationPct}
        />

        <Panel5RestoreTimeSurface
          teamSize={teamSize}
          automationPct={automationPct}
        />

        <Panel5ChangeFailureSurface
          teamSize={teamSize}
          automationPct={automationPct}
        />
      </div>
    </main>
  )
}

/* ─────────────────────────────────────────────
   PANEL 6 – Performance & Resilience (Uptime vs Cost)
───────────────────────────────────────────── */
function Panel6Uptime({ redundancy, setRedundancy, multiRegion, setMultiRegion }) {
  // Non-linear uptime model (each level of redundancy gives diminishing gains)
  const uptimeBase = [95.0, 99.0, 99.5, 99.95, 99.99, 99.999]
  const uptimeSingle = uptimeBase[redundancy - 1]
  const uptimeMulti  = Math.min(99.999, uptimeSingle + [0, 0.5, 0.3, 0.04, 0.009, 0.0009][redundancy - 1])
  const uptime = multiRegion ? uptimeMulti : uptimeSingle

  // Monthly cost model (non-linear — redundancy compounds)
  const baseCost = 5000
  const regionMult = multiRegion ? 1.85 : 1
  const monthlyCost = Math.round(baseCost * Math.pow(redundancy, 1.7) * regionMult)

  // Hours of downtime per year from uptime %
  const downtimeHrs = Math.round(((100 - uptime) / 100) * 8760 * 10) / 10

  const isOptimal = redundancy === 4
  const levels = [1, 2, 3, 4, 5]

  // Build curve data for all levels at current region setting
  const curvePoints = levels.map((lvl) => {
    const ut = multiRegion
      ? Math.min(99.999, uptimeBase[lvl - 1] + [0, 0.5, 0.3, 0.04, 0.009, 0.0009][lvl - 1])
      : uptimeBase[lvl - 1]
    const cost = Math.round(baseCost * Math.pow(lvl, 1.7) * regionMult)
    return { lvl, ut, cost }
  })

  // Simple SVG scatter/line chart
  const svgW = 560
  const svgH = 280
  const padL = 64
  const padR = 24
  const padT = 28
  const padB = 52
  const innerW = svgW - padL - padR
  const innerH = svgH - padT - padB
  const minCost = curvePoints[0].cost * 0.8
  const maxCost = curvePoints[4].cost * 1.1
  const minUt = 94
  const maxUt = 100

  function xAt(cost) {
    return padL + ((cost - minCost) / (maxCost - minCost)) * innerW
  }
  function yAt(ut) {
    return padT + innerH * (1 - (ut - minUt) / (maxUt - minUt))
  }

  const polyPoints = curvePoints
    .map((p) => `${xAt(p.cost)},${yAt(p.ut)}`)
    .join(' ')

  return (
    <main className="migration-panel" id="panel6-performance-resilience">
      <header className="panel-header panel-header-context">
        <p className="migration-eyebrow">Cloud migration simulator · Panel 6</p>
        <p className="panel-title-context">Performance &amp; resilience</p>
        <p className="panel-subtitle">
          Adjust redundancy level and region mode to see real-time uptime
          and monthly cost trade-offs. Non-linear cost curve — optimal
          trade-off is typically at redundancy level 4.
        </p>
      </header>

      <section className="panel-card" aria-labelledby="p6-controls-heading">
        <h2 id="p6-controls-heading" className="card-heading">Controls</h2>
        <div className="p6-controls">
          <div className="p6-slider-row">
            <label className="p5-slider-label" htmlFor="p6-redundancy">
              Redundancy level: <strong>{redundancy}</strong>
              {isOptimal && <span className="p6-optimal-badge"> ★ Optimal</span>}
            </label>
            <input
              id="p6-redundancy"
              type="range"
              min="1"
              max="5"
              value={redundancy}
              onChange={(e) => setRedundancy(Number(e.target.value))}
              className="p5-range"
              aria-label="Redundancy level"
            />
            <div className="p5-range-labels">
              <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
            </div>
          </div>
          <div className="p6-toggle-row">
            <span className="p5-slider-label">Region mode:</span>
            <button
              type="button"
              role="switch"
              aria-checked={multiRegion}
              className={`p6-toggle${multiRegion ? ' p6-toggle-on' : ''}`}
              onClick={() => setMultiRegion((v) => !v)}
            >
              <span className="p6-toggle-knob" />
            </button>
            <span className="p6-toggle-label">
              {multiRegion ? 'Multi-Region' : 'Single Region'}
            </span>
          </div>
        </div>
      </section>

      <section className="panel-card" aria-labelledby="p6-results-heading">
        <h2 id="p6-results-heading" className="card-heading">Trade-off Results</h2>
        <div className="p5-results-grid">
          <div className={`p5-result-tile ${isOptimal ? 'p5-health-green' : 'p5-neutral'}`}>
            <span className="p5-result-label">Monthly Cost</span>
            <span className="p5-result-value">
              ${monthlyCost.toLocaleString()}
            </span>
            <span className="p5-result-sub">
              {multiRegion ? 'Multi-Region' : 'Single Region'} · Level {redundancy}
            </span>
          </div>
          <div className={`p5-result-tile ${isOptimal ? 'p5-health-green' : 'p5-neutral'}`}>
            <span className="p5-result-label">Uptime</span>
            <span className="p5-result-value">{uptime.toFixed(3)}<span className="p5-result-unit">%</span></span>
            <span className="p5-result-sub">{downtimeHrs} hrs downtime/yr</span>
          </div>
          <div className={`p5-result-tile ${isOptimal ? 'p5-health-green' : 'p5-neutral'}`}>
            <span className="p5-result-label">Recommendation</span>
            <span className="p5-result-value p5-health-value" style={{ fontSize: '1rem' }}>
              {isOptimal ? 'Optimal' : redundancy < 4 ? 'Under-invested' : 'Diminishing returns'}
            </span>
            <span className="p5-result-sub">
              {isOptimal
                ? 'Level 4 delivers 99.95% uptime at the best cost/uptime ratio'
                : redundancy < 4
                ? 'Increase redundancy to improve reliability'
                : 'Marginal uptime gains cost significantly more'}
            </span>
          </div>
        </div>
      </section>

      {/* Uptime vs Cost curve */}
      <section className="panel-card" aria-labelledby="p6-chart-heading">
        <h2 id="p6-chart-heading" className="card-heading">Cost vs Uptime Curve</h2>
        <p className="card-lead">
          Non-linear cost curve across all five redundancy levels
          ({multiRegion ? 'Multi-Region' : 'Single Region'} mode).
          The selected level is highlighted.
        </p>
        <svg
          className="p6-chart"
          viewBox={`0 0 ${svgW} ${svgH}`}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="Cost vs uptime trade-off chart"
        >
          <title>Monthly cost vs uptime percentage across redundancy levels</title>
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((f) => {
            const ut = minUt + f * (maxUt - minUt)
            const y = yAt(ut)
            return (
              <g key={f}>
                <line x1={padL} y1={y} x2={padL + innerW} y2={y} className="chart-grid-line" />
                <text x={padL - 6} y={y + 4} textAnchor="end" className="chart-axis-label">
                  {ut.toFixed(1)}%
                </text>
              </g>
            )
          })}
          {/* Axis labels */}
          <text x={padL + innerW / 2} y={svgH - 6} textAnchor="middle" className="chart-axis-label">
            Monthly cost ($)
          </text>
          <text x={14} y={padT + innerH / 2} textAnchor="middle" className="chart-axis-label" transform={`rotate(-90 14 ${padT + innerH / 2})`}>
            Uptime %
          </text>
          {/* Curve */}
          <polyline
            points={polyPoints}
            fill="none"
            stroke="var(--dash-accent)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Dots */}
          {curvePoints.map((p) => {
            const isSelected = p.lvl === redundancy
            return (
              <g key={p.lvl}>
                <circle
                  cx={xAt(p.cost)}
                  cy={yAt(p.ut)}
                  r={isSelected ? 8 : 5}
                  fill={isSelected ? 'var(--dash-accent)' : 'white'}
                  stroke="var(--dash-accent)"
                  strokeWidth="2"
                />
                <text
                  x={xAt(p.cost)}
                  y={yAt(p.ut) - 13}
                  textAnchor="middle"
                  className="chart-axis-label"
                  fontWeight={isSelected ? '700' : '400'}
                >
                  L{p.lvl}
                </text>
              </g>
            )
          })}
          {/* Optimal callout */}
          {(() => {
            const opt = curvePoints[3]
            return (
              <text
                x={xAt(opt.cost) + 12}
                y={yAt(opt.ut)}
                className="chart-axis-label"
                fill="var(--dash-accent)"
                fontWeight="700"
              >
                ★ Optimal
              </text>
            )
          })()}
        </svg>
      </section>

      {isOptimal && (
        <div className="p5-insight-banner" role="status">
          <strong>Level 4 selected:</strong> 99.95% uptime at ~${monthlyCost.toLocaleString()}/month
          {multiRegion ? ' (Multi-Region)' : ' (Single Region)'}. This is the recommended
          balance between reliability and cost — Level 5 adds &lt;0.05% more uptime at
          significantly higher spend.
        </div>
      )}
    </main>
  )
}

/* ─────────────────────────────────────────────
   PANEL 7 – ROI Sensitivity Explorer
───────────────────────────────────────────── */
function Panel7RoiSensitivity({ cumulativeRoiTable }) {
  /** Panel 7-only sandbox controls (not wired to other panels or curves yet). */
  const [controlAiInvestmentUsd, setControlAiInvestmentUsd] = useState(
    PANEL7_AI_INVESTMENT_BASELINE_USD,
  )
  const [controlDataQualityPct, setControlDataQualityPct] = useState(80)
  const [panel7RoiTableVisible, setPanel7RoiTableVisible] = useState(false)

  const panel7CumulativeRoiTable = useMemo(
    () =>
      applyPanel7RoiSensitivity(
        cumulativeRoiTable,
        controlAiInvestmentUsd,
        controlDataQualityPct,
      ),
    [cumulativeRoiTable, controlAiInvestmentUsd, controlDataQualityPct],
  )

  return (
    <main className="migration-panel" id="panel7-roi-sensitivity">
      <header className="panel-header panel-header-context">
        <p className="migration-eyebrow">Cloud migration simulator · Section 7</p>
        <p className="panel-title-context">Panel 7: ROI Sensitivity Explorer</p>
        <p className="panel-subtitle">
          Cumulative ROI chart and table start from Panel&nbsp;2.{' '}
          <strong>AI Investment</strong> (baseline $1M): CAPEX Y1/Y2 +$60k/+$40k
          per $100k above baseline (reversed below); Total Returns tilt compounds
          at 1.5% per step below $1M AI, tapering toward 0.1% per step by $2M
          above baseline; that AI tilt on <strong>H. Total Returns</strong> is
          scaled by <strong>Data quality %</strong> (÷100). For Data Quality
          ≥80%, each 5% above 80% adds $30k CAPEX Y1 and $20k Y2; below 80% adds
          no DQ CAPEX. Dependent rows are recomputed.
        </p>
      </header>

      <div className="p7s-roi-control-stack">
        <div className="p7s-roi-control-layout">
          <div className="p7s-roi-control-main">
            <CumulativeRoiChartCard
              cumulativeRoiTable={panel7CumulativeRoiTable}
              idPrefix="panel7"
              cumulativeRoiTableVisible={panel7RoiTableVisible}
              setCumulativeRoiTableVisible={setPanel7RoiTableVisible}
              sectionClassName="panel-card p7s-roi-chart-card"
            />
          </div>
          <aside className="p7s-roi-control-aside" aria-label="Panel 7 controls">
            <section
              className="panel-card p7s-roi-control-card"
              aria-labelledby="p7s-control-heading"
            >
              <h2 id="p7s-control-heading" className="card-heading">
                Control
              </h2>
              <div className="p5-sliders p7s-roi-control-sliders">
                <div className="p5-slider-row">
                  <label
                    className="p5-slider-label"
                    htmlFor="p7s-control-ai-investment"
                  >
                    AI Investment:{' '}
                    <strong>{formatCurrency(controlAiInvestmentUsd)}</strong>
                  </label>
                  <input
                    id="p7s-control-ai-investment"
                    type="range"
                    min="0"
                    max="2000000"
                    step="100000"
                    value={controlAiInvestmentUsd}
                    onChange={(e) =>
                      setControlAiInvestmentUsd(Number(e.target.value))
                    }
                    className="p5-range"
                    aria-label="AI investment in dollars, zero to two million"
                  />
                  <div className="p5-range-labels">
                    <span>$0</span>
                    <span>$1000K</span>
                    <span>$2000K</span>
                  </div>
                </div>
                <div className="p5-slider-row">
                  <label
                    className="p5-slider-label"
                    htmlFor="p7s-control-data-quality"
                  >
                    Data Quality: <strong>{controlDataQualityPct}%</strong>
                  </label>
                  <input
                    id="p7s-control-data-quality"
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={controlDataQualityPct}
                    onChange={(e) =>
                      setControlDataQualityPct(Number(e.target.value))
                    }
                    className="p5-range"
                    aria-label="Data quality percent"
                  />
                  <div className="p5-range-labels">
                    <span>0%</span>
                    <span>50%</span>
                    <span>100%</span>
                  </div>
                </div>
              </div>
            </section>
          </aside>
        </div>
        {panel7RoiTableVisible ? (
          <CumulativeRoiTableCard
            cumulativeRoiTable={panel7CumulativeRoiTable}
            idPrefix="panel7"
            sectionClassName="panel-card p7s-roi-cumulative-table-span"
          />
        ) : null}
      </div>

    </main>
  )
}

/* ─────────────────────────────────────────────
   PANEL 8 – Adoption Curve
───────────────────────────────────────────── */
function AdoptionLineChart({ points }) {
  const w = 640
  const h = 320
  const padL = 56
  const padR = 28
  const padT = 28
  const padB = 54
  const innerW = w - padL - padR
  const innerH = h - padT - padB

  function xAt(month) {
    return padL + ((month - 1) / 11) * innerW
  }
  function yAt(rate) {
    const clamped = Math.min(1, Math.max(0, rate))
    return padT + innerH * (1 - clamped)
  }

  const polyline = points.map((p) => `${xAt(p.month)},${yAt(p.rate)}`).join(' ')
  const resistancePolyline = points
    .map((p) => `${xAt(p.month)},${yAt(p.resistance)}`)
    .join(' ')

  return (
    <svg
      className="adoption-chart"
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Monthly adoption rate and resistance index over the 12-month rollout"
    >
      <title>Monthly adoption rate and resistance index over 12-month rollout</title>
      {/* Horizontal gridlines + Y axis labels */}
      {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
        const y = padT + innerH * (1 - frac)
        return (
          <g key={`hg-${frac}`}>
            <line
              x1={padL}
              y1={y}
              x2={padL + innerW}
              y2={y}
              className="chart-grid-line"
            />
            <text
              x={padL - 8}
              y={y + 4}
              textAnchor="end"
              className="chart-axis-label"
            >
              {Math.round(frac * 100)}%
            </text>
          </g>
        )
      })}
      {/* X axis ticks 1..12 */}
      {points.map((p) => {
        const xv = xAt(p.month)
        return (
          <g key={`xt-${p.month}`}>
            <line
              x1={xv}
              y1={padT + innerH}
              x2={xv}
              y2={padT + innerH + 6}
              className="chart-axis-tick-line"
            />
            <text
              x={xv}
              y={h - padB + 30}
              textAnchor="middle"
              className="chart-axis-label chart-axis-year"
            >
              {p.month}
            </text>
          </g>
        )
      })}
      {/* Axis titles */}
      <text
        x={padL + innerW / 2}
        y={18}
        textAnchor="middle"
        className="chart-title"
      >
        Rate (%)
      </text>
      <text
        x={padL + innerW / 2}
        y={h - 8}
        textAnchor="middle"
        className="chart-axis-label"
      >
        Month
      </text>
      {/* Resistance index polyline (drawn first so adoption stays visually on top) */}
      <polyline
        className="resistance-line"
        points={resistancePolyline}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {points.map((p) => (
        <circle
          key={`rdot-${p.month}`}
          cx={xAt(p.month)}
          cy={yAt(p.resistance)}
          r={3.25}
          className="resistance-dot"
        />
      ))}
      {/* Adoption rate polyline */}
      <polyline
        className="adoption-line"
        points={polyline}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {points.map((p) => (
        <circle
          key={`dot-${p.month}`}
          cx={xAt(p.month)}
          cy={yAt(p.rate)}
          r={4}
          className="adoption-dot"
        />
      ))}
    </svg>
  )
}

function Panel8Adoption({
  trainingHours,
  setTrainingHours,
  leadershipEngagement,
  setLeadershipEngagement,
}) {
  const { points, maxAdoption, k } = buildAdoptionCurve(
    trainingHours,
    leadershipEngagement,
  )
  const lastPoint = points[points.length - 1] ?? { rate: 0, resistance: 0 }
  const month12Rate = lastPoint.rate
  const month12Resistance = lastPoint.resistance

  let insightTone = 'low'
  let insightText =
    'Low adoption risk detected. Significant investment in training and leadership is recommended.'
  if (month12Rate > 0.8) {
    insightTone = 'strong'
    insightText =
      'Strong adoption projected. Leadership and training levels are sufficient.'
  } else if (month12Rate >= 0.5) {
    insightTone = 'moderate'
    insightText =
      'Moderate adoption expected. Consider increasing training hours or leadership involvement.'
  }

  return (
    <main className="migration-panel" id="panel8-adoption">
      <header className="panel-header panel-header-context">
        <p className="migration-eyebrow">Cloud migration simulator · Section 8</p>
        <p className="panel-title-context">Panel 8: Adoption Curve</p>
        <p className="panel-subtitle">
          Simulate how training investment and leadership engagement drive
          employee adoption of the new cloud-based claims system over a
          12-month rollout period.
        </p>
      </header>

      <section className="panel-card" aria-labelledby="p8-controls-heading">
        <h2 id="p8-controls-heading" className="card-heading">Controls</h2>
        <p className="card-lead">
          Move the sliders to model how investment in workforce enablement and
          executive sponsorship reshape the adoption S-curve.
        </p>
        <div className="p5-sliders">
          <div className="p5-slider-row">
            <label className="p5-slider-label" htmlFor="p8-training">
              Training Hours per Employee (h):{' '}
              <strong>{trainingHours} h</strong>
            </label>
            <input
              id="p8-training"
              type="range"
              min="0"
              max="40"
              step="1"
              value={trainingHours}
              onChange={(e) => setTrainingHours(Number(e.target.value))}
              className="p5-range"
              aria-label="Training hours per employee"
            />
            <div className="p5-range-labels">
              <span>0 h</span><span>20 h</span><span>40 h</span>
            </div>
          </div>
          <div className="p5-slider-row">
            <label className="p5-slider-label" htmlFor="p8-leadership">
              Leadership Engagement (%):{' '}
              <strong>{leadershipEngagement}%</strong>
            </label>
            <input
              id="p8-leadership"
              type="range"
              min="0"
              max="100"
              step="1"
              value={leadershipEngagement}
              onChange={(e) =>
                setLeadershipEngagement(Number(e.target.value))
              }
              className="p5-range"
              aria-label="Leadership engagement percentage"
            />
            <div className="p5-range-labels">
              <span>0%</span><span>50%</span><span>100%</span>
            </div>
          </div>
        </div>
      </section>

      <section className="summary-strip" aria-label="Adoption simulation summary">
        <div className="summary-tile">
          <span className="summary-label">Adoption ceiling</span>
          <span className="summary-value">
            {(maxAdoption * 100).toFixed(1)}%
          </span>
        </div>
        <div className="summary-tile">
          <span className="summary-label">Growth rate (k)</span>
          <span className="summary-value">{k.toFixed(3)}</span>
        </div>
        <div className="summary-tile summary-tile-positive">
          <span className="summary-label">Month-12 adoption</span>
          <span className="summary-value">
            {(month12Rate * 100).toFixed(1)}%
          </span>
        </div>
        <div className="summary-tile">
          <span className="summary-label">Month-12 resistance</span>
          <span className="summary-value">
            {(month12Resistance * 100).toFixed(1)}%
          </span>
        </div>
      </section>

      <section className="panel-card" aria-labelledby="p8-chart-heading">
        <h2 id="p8-chart-heading" className="card-heading">Adoption rate by month</h2>
        <p className="card-lead">
          Logistic-style saturation curve over the 12-month rollout. More
          training and leadership engagement raise the adoption ceiling and
          accelerate the decay of resistance.
        </p>
        <div className="chart-legend">
          <span className="legend-item">
            <span className="legend-line legend-line-adoption" /> Adoption Rate
          </span>
          <span className="legend-item">
            <span className="legend-line legend-line-resistance" /> Resistance Index
          </span>
        </div>
        <AdoptionLineChart points={points} />
        <div
          className={`p8-insight p8-insight-${insightTone}`}
          role="status"
          aria-live="polite"
        >
          {insightText}
        </div>
      </section>
    </main>
  )
}

/* ─────────────────────────────────────────────
   PANEL 9 – Bass Diffusion Simulator
───────────────────────────────────────────── */
function DiffusionLineChart({ points }) {
  const w = 640
  const h = 320
  const padL = 56
  const padR = 64
  const padT = 28
  const padB = 54
  const innerW = w - padL - padR
  const innerH = h - padT - padB

  function xAt(month) {
    return padL + ((month - 1) / 23) * innerW
  }
  function yAt(value) {
    const clamped = Math.min(1, Math.max(0, value))
    return padT + innerH * (1 - clamped)
  }

  // Auto-scale right axis for new-adopters velocity. Values are 0–1 (fraction of market).
  // Convert to percent for snap selection, then back to fraction for projection.
  const peakNewPct =
    points.reduce((m, p) => (p.newAdopters > m ? p.newAdopters : m), 0) * 100
  const NICE_STEPS = [5, 10, 15, 20, 25, 30, 40, 50, 60, 75, 100]
  const rightMaxPct =
    NICE_STEPS.find((s) => s >= Math.max(peakNewPct, 1e-9)) ??
    NICE_STEPS[NICE_STEPS.length - 1]
  const rightMaxFrac = rightMaxPct / 100

  function yVelocity(value) {
    const clamped = Math.min(rightMaxFrac, Math.max(0, value))
    return padT + innerH * (1 - clamped / rightMaxFrac)
  }

  const polyline = points
    .map((p) => `${xAt(p.month)},${yAt(p.cumulative)}`)
    .join(' ')
  const velocityPolyline = points
    .map((p) => `${xAt(p.month)},${yVelocity(p.newAdopters)}`)
    .join(' ')

  const rightAxisX = padL + innerW
  const rightLabelX = rightAxisX + 8

  return (
    <svg
      className="diffusion-chart"
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Cumulative customer adoption and per-month new adopters over the 24-month diffusion horizon"
    >
      <title>Cumulative customer adoption and per-month new adopters over the 24-month diffusion horizon</title>
      {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
        const y = padT + innerH * (1 - frac)
        return (
          <g key={`hg-${frac}`}>
            <line
              x1={padL}
              y1={y}
              x2={padL + innerW}
              y2={y}
              className="chart-grid-line"
            />
            <text
              x={padL - 8}
              y={y + 4}
              textAnchor="end"
              className="chart-axis-label"
            >
              {Math.round(frac * 100)}%
            </text>
          </g>
        )
      })}
      {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
        const y = padT + innerH * (1 - frac)
        const value = frac * rightMaxPct
        const label =
          rightMaxPct >= 10
            ? `${Math.round(value)}%`
            : `${value.toFixed(value % 1 === 0 ? 0 : 1)}%`
        return (
          <text
            key={`rg-${frac}`}
            x={rightLabelX}
            y={y + 4}
            textAnchor="start"
            className="chart-axis-label"
          >
            {label}
          </text>
        )
      })}
      {points.map((p) => {
        const xv = xAt(p.month)
        const labelable = p.month === 1 || p.month % 2 === 0
        return (
          <g key={`xt-${p.month}`}>
            <line
              x1={xv}
              y1={padT + innerH}
              x2={xv}
              y2={padT + innerH + (labelable ? 6 : 3)}
              className="chart-axis-tick-line"
            />
            {labelable ? (
              <text
                x={xv}
                y={h - padB + 30}
                textAnchor="middle"
                className="chart-axis-label chart-axis-year"
              >
                {p.month}
              </text>
            ) : null}
          </g>
        )
      })}
      <text
        x={padL + innerW / 2}
        y={18}
        textAnchor="middle"
        className="chart-title"
      >
        Cumulative Adoption (%) &amp; New Adopters (%)
      </text>
      <text
        x={padL + innerW / 2}
        y={h - 8}
        textAnchor="middle"
        className="chart-axis-label"
      >
        Month
      </text>
      <text
        x={rightAxisX + 48}
        y={padT + innerH / 2}
        textAnchor="middle"
        className="chart-axis-label"
        transform={`rotate(-90 ${rightAxisX + 48} ${padT + innerH / 2})`}
      >
        New Adopters (% of market)
      </text>
      <polyline
        className="diffusion-velocity-line"
        points={velocityPolyline}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polyline
        className="diffusion-line"
        points={polyline}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {points.map((p) => (
        <circle
          key={`vdot-${p.month}`}
          cx={xAt(p.month)}
          cy={yVelocity(p.newAdopters)}
          r={3}
          className="diffusion-velocity-dot"
        />
      ))}
      {points.map((p) => (
        <circle
          key={`ddot-${p.month}`}
          cx={xAt(p.month)}
          cy={yAt(p.cumulative)}
          r={3.75}
          className="diffusion-dot"
        />
      ))}
    </svg>
  )
}

const MARKET_TYPE_NOTES = {
  B2C: 'Consumer market: faster adoption driven by social influence and broad marketing reach.',
  B2B: 'Enterprise market: slower adoption due to procurement cycles, stakeholder approval, and integration complexity.',
}

function Panel9Diffusion({
  marketingSpend,
  setMarketingSpend,
  networkEffect,
  setNetworkEffect,
  marketType,
  setMarketType,
}) {
  const { points, p: pCoeff, q: qCoeff } = buildBassDiffusionCurve(
    marketingSpend,
    networkEffect,
    marketType,
  )
  const month12 = points[11]?.cumulative ?? 0
  const month24 = points[points.length - 1]?.cumulative ?? 0

  let peakIndex = 0
  for (let i = 1; i < points.length; i++) {
    if (points[i].newAdopters > points[peakIndex].newAdopters) peakIndex = i
  }
  const peakMonth =
    points[peakIndex] && points[peakIndex].newAdopters > 0
      ? points[peakIndex].month
      : null

  const marketContextNote =
    MARKET_TYPE_NOTES[marketType] ?? MARKET_TYPE_NOTES.B2C

  return (
    <main className="migration-panel" id="panel9-diffusion">
      <header className="panel-header panel-header-context">
        <p className="migration-eyebrow">Cloud migration simulator · Section 9</p>
        <p className="panel-title-context">Panel 9: Diffusion Simulator</p>
        <p className="panel-subtitle">
          Simulate how marketing investment and word-of-mouth network effects
          drive customer adoption of the new platform over a 24-month period,
          modeled on the Bass Diffusion framework.
        </p>
      </header>

      <section className="panel-card" aria-labelledby="p9-market-heading">
        <h2 id="p9-market-heading" className="card-heading">Market Type</h2>
        <p className="card-lead">
          Choose the market segment to scale the innovation (p) and imitation
          (q) coefficients before they reach the Bass curve.
        </p>
        <div className="p9-market-type">
          <label htmlFor="p9-market-type-select" className="p9-market-label">
            Market Type
          </label>
          <select
            id="p9-market-type-select"
            className="p9-market-select"
            value={marketType}
            onChange={(e) => setMarketType(e.target.value)}
          >
            <option value="B2C">B2C — Consumer (1.0× p, 1.0× q)</option>
            <option value="B2B">B2B — Enterprise (0.5× p, 0.4× q)</option>
          </select>
        </div>
        <p className="p9-market-note">{marketContextNote}</p>
      </section>

      <section className="panel-card" aria-labelledby="p9-controls-heading">
        <h2 id="p9-controls-heading" className="card-heading">Controls</h2>
        <p className="card-lead">
          Move the sliders to reshape the diffusion S-curve. Marketing spend
          drives external (innovation) pressure; network effect drives internal
          (imitation) word-of-mouth. Both are then scaled by the selected
          market type.
        </p>
        <div className="p5-sliders">
          <div className="p5-slider-row">
            <label className="p5-slider-label" htmlFor="p9-marketing">
              Marketing Spend (% of budget):{' '}
              <strong>{marketingSpend}%</strong>
            </label>
            <input
              id="p9-marketing"
              type="range"
              min="0"
              max="20"
              step="0.5"
              value={marketingSpend}
              onChange={(e) => setMarketingSpend(Number(e.target.value))}
              className="p5-range"
              aria-label="Marketing spend as percentage of budget"
            />
            <div className="p5-range-labels">
              <span>0%</span><span>10%</span><span>20%</span>
            </div>
            <p className="p7-slider-impact">
              Innovation coefficient <strong>p = marketingSpend / 200</strong>.
            </p>
          </div>
          <div className="p5-slider-row">
            <label className="p5-slider-label" htmlFor="p9-network">
              Network Effect Strength (0 = none, 1 = maximum):{' '}
              <strong>{networkEffect.toFixed(2)}</strong>
            </label>
            <input
              id="p9-network"
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={networkEffect}
              onChange={(e) => setNetworkEffect(Number(e.target.value))}
              className="p5-range"
              aria-label="Network effect strength"
            />
            <div className="p5-range-labels">
              <span>0.00</span><span>0.50</span><span>1.00</span>
            </div>
            <p className="p7-slider-impact">
              Imitation coefficient <strong>q = networkEffect × 0.5</strong>.
            </p>
          </div>
        </div>
      </section>

      <section className="summary-strip" aria-label="Bass diffusion summary">
        <div className="summary-tile">
          <span className="summary-label">Innovation coeff. p</span>
          <span className="summary-value">{pCoeff.toFixed(4)}</span>
        </div>
        <div className="summary-tile">
          <span className="summary-label">Imitation coeff. q</span>
          <span className="summary-value">{qCoeff.toFixed(4)}</span>
        </div>
        <div className="summary-tile summary-tile-positive">
          <span className="summary-label">Month-12 cumulative adoption</span>
          <span className="summary-value">{(month12 * 100).toFixed(1)}%</span>
        </div>
        <div className="summary-tile summary-tile-positive">
          <span className="summary-label">Month-24 cumulative adoption</span>
          <span className="summary-value">{(month24 * 100).toFixed(1)}%</span>
        </div>
      </section>

      <section className="panel-card" aria-labelledby="p9-chart-heading">
        <h2 id="p9-chart-heading" className="card-heading">Cumulative adoption by month</h2>
        <p className="card-lead">
          Classic Bass S-curve: slow start while innovators trickle in,
          acceleration as imitators are pulled along by word-of-mouth, then a
          plateau as the addressable market saturates.
        </p>
        <div className="chart-legend">
          <span className="legend-item">
            <span className="legend-line legend-line-diffusion" /> Cumulative Adoption (%)
          </span>
          <span className="legend-item">
            <span className="legend-line legend-line-velocity" /> New Adopters per Month (%)
          </span>
        </div>
        <DiffusionLineChart points={points} />
      </section>

      <section className="panel-card p9-stat-card" aria-labelledby="p9-stats-heading">
        <h2 id="p9-stats-heading" className="card-heading">Diffusion summary</h2>
        <p className="card-lead">
          Live readouts derived from the current curve, market type, and slider
          settings.
        </p>
        <div className="p9-stat-grid">
          <div className="p9-stat-box">
            <span className="p9-stat-label">Peak Adoption Month</span>
            <span className="p9-stat-value">{peakMonth ?? '—'}</span>
            <span className="p9-stat-sub">
              {peakMonth != null
                ? 'Inflection of the S-curve (max new adopters / month)'
                : 'No measurable adoption velocity at this setting'}
            </span>
          </div>
          <div className="p9-stat-box">
            <span className="p9-stat-label">Projected 12-Month Adoption</span>
            <span className="p9-stat-value">{(month12 * 100).toFixed(1)}%</span>
            <span className="p9-stat-sub">F(12) cumulative</span>
          </div>
          <div className="p9-stat-box">
            <span className="p9-stat-label">Projected 24-Month Adoption</span>
            <span className="p9-stat-value">{(month24 * 100).toFixed(1)}%</span>
            <span className="p9-stat-sub">F(24) cumulative</span>
          </div>
        </div>
      </section>
    </main>
  )
}

/** Table 4 — Tangible Returns (v2 Corrected). `y` = year amount; `null` = — */
const PANEL2_TABLE4_TANGIBLE_ROWS = [
  { t: 'g', label: 'Productivity Gains' },
  {
    t: 'l',
    line: 'Faster Software Deployment — DevOps Velocity (2× release cadence)',
    stabilized: 300_000,
    y1: 60_000,
    y2: 165_000,
    y3: 300_000,
    y4: 324_000,
    y5: 336_000,
    fiveYr: 1_185_000,
  },
  {
    t: 'l',
    line: 'Reduced Downtime Value (6.57 fewer hrs/yr × $5,600/min × 60 min)',
    stabilized: 2_207_520,
    y1: 441_504,
    y2: 1_214_136,
    y3: 2_207_520,
    y4: 2_384_122,
    y5: 2_472_422,
    fiveYr: 8_719_704,
  },
  { t: 'g', label: 'Revenue Enablement' },
  {
    t: 'l',
    line: 'Faster Claims Processing — Customer Retention Value',
    stabilized: 1_000_000,
    y1: 100_000,
    y2: 400_000,
    y3: 1_000_000,
    y4: 1_100_000,
    y5: 1_200_000,
    fiveYr: 3_800_000,
  },
  {
    t: 'total',
    line: 'TOTAL TANGIBLE RETURNS',
    y1: 601_504,
    y2: 1_779_136,
    y3: 3_507_520,
    y4: 3_808_122,
    y5: 4_008_422,
    fiveYr: 13_704_704,
  },
]

/** Table 5 — Intangible Returns (v2 Corrected). */
const PANEL2_TABLE5_INTANGIBLE_ROWS = [
  { t: 'g', label: 'Regulatory Trust' },
  {
    t: 'l',
    line: 'External Audit Fee Reduction (30% × $400K annual audit cost)',
    method: 'Cost Avoidance',
    y1: 60_000,
    y2: 120_000,
    y3: 120_000,
    y4: 120_000,
    y5: 120_000,
    fiveYr: 540_000,
  },
  {
    t: 'l',
    line: 'Reduced Enforcement Action Probability (15% → 5% × $3M avg penalty)',
    method: 'Cost Avoidance',
    y1: 140_000,
    y2: 280_000,
    y3: 300_000,
    y4: 380_000,
    y5: 480_000,
    fiveYr: 1_580_000,
  },
  { t: 'g', label: 'Innovation Velocity' },
  {
    t: 'l',
    line: '20% More Features Shipped → Competitive Retention Value',
    method: 'Incremental Earnings',
    y1: null,
    y2: null,
    y3: 500_000,
    y4: 600_000,
    y5: 700_000,
    fiveYr: 1_800_000,
  },
  { t: 'g', label: 'Business Resilience' },
  {
    t: 'l',
    line: 'Ransomware Resilience (3% probability × $4M recovery cost avoided)',
    method: 'Cost Avoidance',
    y1: null,
    y2: null,
    y3: 120_000,
    y4: 120_000,
    y5: 120_000,
    fiveYr: 360_000,
  },
  {
    t: 'l',
    line: 'DR Test Cost Reduction — Automated Failover vs Manual Runbook',
    method: 'Cost Avoidance',
    y1: null,
    y2: null,
    y3: 182_480,
    y4: 182_480,
    y5: 182_480,
    fiveYr: 547_440,
  },
  { t: 'g', label: 'Customer Experience' },
  {
    t: 'l',
    line: 'Churn Reduction Proxy (1% churn reduction × 350K customers × $500 avg premium × 0.7%)',
    method: 'Proxy Method',
    y1: null,
    y2: 400_000,
    y3: 1_225_000,
    y4: 1_500_000,
    y5: 1_700_000,
    fiveYr: 4_825_000,
  },
  {
    t: 'l',
    line: '24/7 Availability — New Customer Acquisition (28K reachable × $500 × 10% conversion)',
    method: 'Proxy Method',
    y1: 200_000,
    y2: 400_000,
    y3: 1_400_000,
    y4: 1_500_000,
    y5: 1_500_000,
    fiveYr: 5_000_000,
  },
  { t: 'g', label: 'ESG & Sustainability' },
  {
    t: 'l',
    line: 'ESG Premium Pricing Power (3% of $50M commercial lines × 20% confidence)',
    method: 'Surveys & Baseline',
    y1: null,
    y2: 100_000,
    y3: 300_000,
    y4: 400_000,
    y5: 500_000,
    fiveYr: 1_300_000,
  },
  {
    t: 'total',
    line: 'TOTAL INTANGIBLE RETURNS',
    y1: 400_000,
    y2: 1_300_000,
    y3: 4_147_480,
    y4: 4_802_480,
    y5: 5_302_480,
    fiveYr: 15_952_440,
  },
]

/** Table 6 excerpt — tangible + intangible only; totals sum the two rows. */
const PANEL2_TABLE6_TI_SUMMARY_ROWS = [
  {
    t: 'd',
    detailKey: 'tangible',
    line: 'Tangible Returns (Revenue & Productivity)',
    y1: 601_504,
    y2: 1_779_136,
    y3: 3_507_520,
    y4: 3_808_122,
    y5: 4_008_422,
    fiveYr: 13_704_704,
  },
  {
    t: 'd',
    detailKey: 'intangible',
    line: 'Intangible Returns (Quantified)',
    y1: 400_000,
    y2: 1_300_000,
    y3: 4_147_480,
    y4: 4_802_480,
    y5: 5_302_480,
    fiveYr: 15_952_440,
  },
  {
    t: 'total',
    line: 'Total returns',
    y1: 1_001_504,
    y2: 3_079_136,
    y3: 7_655_000,
    y4: 8_610_602,
    y5: 9_310_902,
    fiveYr: 29_657_144,
  },
]

function formatRoiReturnsCell(v) {
  if (v == null || v === '') return '—'
  return formatCurrency(v)
}

/** Yearly totals from Panel 2 Tables 4 & 5 (TOTAL … RETURNS rows). */
function panel2TangibleReturnsByYear() {
  const row = PANEL2_TABLE4_TANGIBLE_ROWS.find((r) => r.t === 'total')
  return row
    ? [row.y1, row.y2, row.y3, row.y4, row.y5].map((v) => Math.round(v ?? 0))
    : YEARS.map(() => 0)
}

function panel2IntangibleReturnsByYear() {
  const row = PANEL2_TABLE5_INTANGIBLE_ROWS.find((r) => r.t === 'total')
  return row
    ? [row.y1, row.y2, row.y3, row.y4, row.y5].map((v) =>
        Math.round(v ?? 0),
      )
    : YEARS.map(() => 0)
}

/** Reference row for the cumulative ROI table only (not used in Total Returns / net math). */
const PANEL2_CUMULATIVE_ROI_TABLE_ONPREM_BASELINE_Y1_USD = 20_264_400
const PANEL2_CUMULATIVE_ROI_TABLE_ONPREM_BASELINE_GROWTH = 0.03

function panel2CumulativeRoiTableBaselineOnPremOpexDisplay() {
  let v = PANEL2_CUMULATIVE_ROI_TABLE_ONPREM_BASELINE_Y1_USD
  return YEARS.map((_, i) => {
    if (i > 0) {
      v = Math.round(v * (1 + PANEL2_CUMULATIVE_ROI_TABLE_ONPREM_BASELINE_GROWTH))
    }
    return v
  })
}

/**
 * Total returns = baseline − (on-prem + cloud OPEX) + tangible + intangible;
 * net = total returns − CAPEX. Table C/D = Panel 1 OPEX; E = C + D − baseline B row;
 * F = max(0, E) per year (5yr-Total = sum of F’s yearly values);
 * G row = A + F per year (5yr-Total = sum of those yearly values);
 * Cumul. Inv = running sum of G by year (5yr-Total = value at Year 5);
 * H = tangible + intangible yearly totals (Tables 4–5); modeled total = baseline − (on-prem+cloud) + H;
 * display I = H − E − A (table letters). Cumul. Net Cash Flow = running sum of I.
 * Cumulative ROI % = Cumul. Net Cash Flow ÷ Cumul. Inv each year (and 5yr-Total).
 */
function buildPanel2CumulativeRoiSeries(
  capexByYear,
  baselineOnPremByYear,
  onPremiseOpexByYear,
  cloudAiOpexByYear,
  tangibleReturnsByYear,
  intangibleReturnsByYear,
) {
  const onPremiseOpex = YEARS.map((_, i) =>
    Math.round(onPremiseOpexByYear[i] ?? 0),
  )
  const cloudAiOpex = YEARS.map((_, i) =>
    Math.round(cloudAiOpexByYear[i] ?? 0),
  )
  const A = YEARS.map((_, i) => Math.round(capexByYear[i] ?? 0))
  const B = YEARS.map((_, i) => {
    const base = baselineOnPremByYear[i] ?? 0
    const onPrem = onPremiseOpexByYear[i] ?? 0
    const cloud = cloudAiOpexByYear[i] ?? 0
    const tang = tangibleReturnsByYear[i] ?? 0
    const intang = intangibleReturnsByYear[i] ?? 0
    return Math.round(base - (onPrem + cloud) + tang + intang)
  })
  const net = YEARS.map((_, i) => B[i] - A[i])
  const cumulCapex = []
  const cumulNet = []
  let runCapex = 0
  let runNet = 0
  YEARS.forEach((_, i) => {
    runCapex += A[i]
    cumulCapex.push(runCapex)
    runNet += net[i]
    cumulNet.push(runNet)
  })
  const totalCapex = A.reduce((s, v) => s + v, 0)
  const totalB = B.reduce((s, v) => s + v, 0)
  const totalNet = net.reduce((s, v) => s + v, 0)
  const finalCumulCapex = cumulCapex[YEARS.length - 1] ?? 0
  const finalCumulNet = cumulNet[YEARS.length - 1] ?? 0

  const baselineOnPremOpexDisplay = panel2CumulativeRoiTableBaselineOnPremOpexDisplay()
  const totalBaselineOnPremOpexDisplay = baselineOnPremOpexDisplay.reduce(
    (s, v) => s + v,
    0,
  )
  const totalOnPremiseOpex = onPremiseOpex.reduce((s, v) => s + v, 0)
  const totalCloudAiOpex = cloudAiOpex.reduce((s, v) => s + v, 0)
  const opexNetSavings = YEARS.map((_, i) =>
    Math.round(
      onPremiseOpex[i] + cloudAiOpex[i] - baselineOnPremOpexDisplay[i],
    ),
  )
  const totalOpexNetSavings = opexNetSavings.reduce((s, v) => s + v, 0)
  const positiveE = opexNetSavings.map((v) => (v > 0 ? v : 0))
  const totalPositiveE = positiveE.reduce((s, v) => s + v, 0)
  const invAPlusF = YEARS.map((_, i) => A[i] + positiveE[i])
  const totalInvAPlusF = invAPlusF.reduce((s, v) => s + v, 0)
  const cumulInv = []
  let runInv = 0
  YEARS.forEach((_, i) => {
    runInv += invAPlusF[i]
    cumulInv.push(runInv)
  })
  const finalCumulInv = cumulInv[YEARS.length - 1] ?? 0

  const tangIntangReturns = YEARS.map((_, i) =>
    Math.round(
      (tangibleReturnsByYear[i] ?? 0) + (intangibleReturnsByYear[i] ?? 0),
    ),
  )
  const totalTangIntangReturns = tangIntangReturns.reduce((s, v) => s + v, 0)
  const netCashFlowHMinusEMinusA = YEARS.map((_, i) =>
    Math.round(tangIntangReturns[i] - opexNetSavings[i] - A[i]),
  )
  const totalNetCashFlowHMinusEMinusA = netCashFlowHMinusEMinusA.reduce(
    (s, v) => s + v,
    0,
  )
  const cumulNetCashFlowI = []
  let runCumulNetI = 0
  YEARS.forEach((_, i) => {
    runCumulNetI += netCashFlowHMinusEMinusA[i]
    cumulNetCashFlowI.push(runCumulNetI)
  })
  const finalCumulNetCashFlowI = cumulNetCashFlowI[YEARS.length - 1] ?? 0

  const cumulativeRoiFraction = YEARS.map((_, i) => {
    const denom = cumulInv[i] ?? 0
    const num = cumulNetCashFlowI[i] ?? 0
    return denom !== 0 && Number.isFinite(num / denom) ? num / denom : null
  })
  const fiveYrRoiFrac =
    finalCumulInv !== 0 &&
    Number.isFinite(finalCumulNetCashFlowI / finalCumulInv)
      ? finalCumulNetCashFlowI / finalCumulInv
      : null

  return {
    capex: A,
    cumulCapex,
    baselineOnPremOpexDisplay,
    onPremiseOpex,
    cloudAiOpex,
    opexNetSavings,
    positiveE,
    invAPlusF,
    cumulInv,
    tangIntangReturns,
    netCashFlowHMinusEMinusA,
    cumulNetCashFlowI,
    totalReturns: B,
    netCashFlow: net,
    cumulNet,
    cumulativeRoiFraction,
    totals: {
      capex: totalCapex,
      cumulCapex: finalCumulCapex,
      baselineOnPremOpexDisplay: totalBaselineOnPremOpexDisplay,
      onPremiseOpex: totalOnPremiseOpex,
      cloudAiOpex: totalCloudAiOpex,
      opexNetSavings: totalOpexNetSavings,
      positiveE: totalPositiveE,
      invAPlusF: totalInvAPlusF,
      cumulInv: finalCumulInv,
      tangIntangReturns: totalTangIntangReturns,
      netCashFlowHMinusEMinusA: totalNetCashFlowHMinusEMinusA,
      cumulNetCashFlowI: finalCumulNetCashFlowI,
      totalReturns: totalB,
      netCashFlow: totalNet,
      cumulNet: finalCumulNet,
      cumulativeRoiFraction: fiveYrRoiFrac,
    },
  }
}

/** Panel 7 AI slider baseline (delta vs this drives sensitivity). */
const PANEL7_AI_INVESTMENT_BASELINE_USD = 1_000_000
const PANEL7_AI_INVESTMENT_STEP_USD = 100_000
const PANEL7_AI_CAPEX_Y1_PER_100K = 100_000 * 0.6
const PANEL7_AI_CAPEX_Y2_PER_100K = 100_000 * 0.4
/** Data Quality ≥ this: each 5% above adds CAPEX Y1/Y2; below → no DQ CAPEX. */
const PANEL7_DQ_CAPEX_THRESHOLD_PCT = 80
const PANEL7_DQ_CAPEX_STEP_PCT = 5
const PANEL7_DQ_CAPEX_PER_STEP_Y1 = 1_000_000 * 0.05 * 0.6
const PANEL7_DQ_CAPEX_PER_STEP_Y2 = 1_000_000 * 0.05 * 0.4
/** Fractional return bump per $100k step when at or near baseline; tapers to `…_AT_MAX` only above $1M. */
const PANEL7_AI_RETURNS_RATE_NEAR_BASE = 0.015
const PANEL7_AI_RETURNS_RATE_AT_MAX_DIST = 0.001
/** When AI ≥ baseline: taper over this much *excess* above $1M (slider max $2M → $1M span). */
const PANEL7_AI_RETURNS_TAPER_DISTANCE_USD = 1_000_000

/**
 * Multiplier applied to each year’s H (Total Returns) vs Panel 2. Below the
 * $1M baseline, each $100k step uses 1.5% only (no taper). At or above baseline,
 * the per-$100k rate is 1.5% at $1M and falls linearly to 0.1% by $2M. For n steps
 * from baseline, scale by (1+r)^n upward or ÷(1+r)^|n| downward.
 */
function panel7TotalReturnsScaleFromBaseline(
  aiInvestmentUsd,
  baselineAiUsd,
) {
  const nSteps = Math.round(
    (aiInvestmentUsd - baselineAiUsd) / PANEL7_AI_INVESTMENT_STEP_USD,
  )
  if (nSteps === 0) return 1
  let rate
  if (aiInvestmentUsd < baselineAiUsd) {
    rate = PANEL7_AI_RETURNS_RATE_NEAR_BASE
  } else {
    const dAbove = aiInvestmentUsd - baselineAiUsd
    const t = Math.min(1, dAbove / PANEL7_AI_RETURNS_TAPER_DISTANCE_USD)
    rate =
      PANEL7_AI_RETURNS_RATE_NEAR_BASE +
      (PANEL7_AI_RETURNS_RATE_AT_MAX_DIST - PANEL7_AI_RETURNS_RATE_NEAR_BASE) * t
  }
  const perStepMult = 1 + rate
  const k = Math.abs(nSteps)
  return nSteps > 0 ? perStepMult ** k : 1 / perStepMult ** k
}

/**
 * Rebuild cumulative ROI series for Panel 7: AI vs $1M baseline adjusts CAPEX
 * Y1/Y2. For Data Quality ≥80%, each 5% above 80% adds $30k Y1 and $20k Y2
 * CAPEX; below 80% adds no DQ CAPEX. AI’s H (Total Returns) delta is scaled by
 * (data quality % ÷ 100).
 */
function applyPanel7RoiSensitivity(
  baseTable,
  aiInvestmentUsd,
  dataQualityPct,
  baselineAiUsd = PANEL7_AI_INVESTMENT_BASELINE_USD,
) {
  const n =
    (aiInvestmentUsd - baselineAiUsd) / PANEL7_AI_INVESTMENT_STEP_USD
  const returnsMult = panel7TotalReturnsScaleFromBaseline(
    aiInvestmentUsd,
    baselineAiUsd,
  )
  const dqFactor = (Number(dataQualityPct) || 0) / 100
  const dCapexAiY1 = n * PANEL7_AI_CAPEX_Y1_PER_100K
  const dCapexAiY2 = n * PANEL7_AI_CAPEX_Y2_PER_100K
  const dq = Number(dataQualityPct) || 0
  const dqStepsAboveThreshold =
    dq >= PANEL7_DQ_CAPEX_THRESHOLD_PCT
      ? Math.round((dq - PANEL7_DQ_CAPEX_THRESHOLD_PCT) / PANEL7_DQ_CAPEX_STEP_PCT)
      : 0
  const dCapexDqY1 = dqStepsAboveThreshold * PANEL7_DQ_CAPEX_PER_STEP_Y1
  const dCapexDqY2 = dqStepsAboveThreshold * PANEL7_DQ_CAPEX_PER_STEP_Y2

  const capexByYear = YEARS.map((_, i) => {
    const base = baseTable.capex[i] ?? 0
    if (i === 0) return Math.round(base + dCapexAiY1 + dCapexDqY1)
    if (i === 1) return Math.round(base + dCapexAiY2 + dCapexDqY2)
    return base
  })

  const tangibleByYear = YEARS.map((_, i) => {
    const baseH = baseTable.tangIntangReturns[i] ?? 0
    const hFromAi = baseH * returnsMult
    return Math.round(baseH + (hFromAi - baseH) * dqFactor)
  })
  const intangibleByYear = YEARS.map(() => 0)

  const baselineOnPremByYear = YEARS.map((_, i) =>
    Math.round(
      (baseTable.totalReturns[i] ?? 0) +
        (baseTable.onPremiseOpex[i] ?? 0) +
        (baseTable.cloudAiOpex[i] ?? 0) -
        (baseTable.tangIntangReturns[i] ?? 0),
    ),
  )

  return buildPanel2CumulativeRoiSeries(
    capexByYear,
    baselineOnPremByYear,
    baseTable.onPremiseOpex,
    baseTable.cloudAiOpex,
    tangibleByYear,
    intangibleByYear,
  )
}

function formatPanel2CumulativeRoiRatio(fraction) {
  if (fraction == null || !Number.isFinite(fraction)) return '—'
  return `${(fraction * 100).toFixed(1)}%`
}

/** Panel 2 — dual axis: cumulative ROI % (left) vs cumul. net cash flow (I) bars (right scale = $ million). */
function Panel2RoiDualAxisChart({
  cumulativeRoiTable,
  /** Unique prefix for SVG gradient ids when multiple charts mount (e.g. Panel 2 + Panel 7). */
  svgGradientIdPrefix = 'panel2-dual-roi',
}) {
  const gradPos = `${svgGradientIdPrefix}-cash-pos`
  const gradNeg = `${svgGradientIdPrefix}-cash-neg`
  const w = 700
  const h = 372
  const padL = 88
  const padR = 92
  const padT = 52
  const padB = 56
  const innerW = w - padL - padR
  const innerH = h - padT - padB

  const roiPctSeries = YEARS.map((_, i) => {
    const f = cumulativeRoiTable.cumulativeRoiFraction[i]
    return f != null && Number.isFinite(f) ? f * 100 : null
  })
  const cumulNetM = YEARS.map(
    (_, i) => (cumulativeRoiTable.cumulNetCashFlowI[i] ?? 0) / 1_000_000,
  )

  const roiFinite = roiPctSeries.filter((v) => v != null && Number.isFinite(v))
  let leftMin =
    roiFinite.length > 0 ? Math.min(0, ...roiFinite) : -20
  let leftMax = roiFinite.length > 0 ? Math.max(...roiFinite, 0) : 100
  if (leftMin === leftMax) {
    leftMin -= 1
    leftMax += 1
  }
  const leftPadAmt = Math.max(Math.abs(leftMax - leftMin) * 0.08, 0.5)
  leftMin -= leftPadAmt
  leftMax += leftPadAmt

  const minM = Math.min(0, ...cumulNetM)
  const maxM = Math.max(...cumulNetM, 0)
  const mSpan = Math.max(
    maxM - minM,
    Math.abs(minM || maxM) * 0.05,
    1e-3,
  )
  let rightMin = minM - mSpan * 0.08
  let rightMax = maxM + mSpan * 0.08
  if (rightMin === rightMax) {
    rightMin -= 0.5
    rightMax += 0.5
  }

  function formatPctTick(pct) {
    const a = Math.abs(pct)
    return `${(a >= 100 || a === 0 ? pct.toFixed(0) : pct.toFixed(1))}%`
  }

  function xCenter(i) {
    return padL + ((i + 0.5) / YEARS.length) * innerW
  }
  function yLeft(pct) {
    return padT + innerH * (1 - (pct - leftMin) / (leftMax - leftMin))
  }
  function yRight(mMillions) {
    return padT + innerH * (1 - (mMillions - rightMin) / (rightMax - rightMin))
  }

  const slotW = innerW / YEARS.length
  const barW = Math.max(14, Math.min(slotW * 0.42, 48))
  const yZeroBar = Math.min(padT + innerH, Math.max(padT, yRight(0)))

  const lineCoords = YEARS.flatMap((year, i) => {
    const pct = roiPctSeries[i]
    if (pct == null || !Number.isFinite(pct)) return []
    return [{ year, x: xCenter(i), y: yLeft(pct) }]
  })

  const linePointsStr = lineCoords.map((p) => `${p.x},${p.y}`).join(' ')
  const gridFrac = [0, 0.25, 0.5, 0.75, 1]
  const tickLabelOffsetL = 14
  const tickLabelOffsetR = 14

  return (
    <svg
      className="cost-chart panel2-roi-dual-chart"
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="ROI chart: cumulative ROI percent and cumulative net cash flow by year"
    >
      <title>Cumulative ROI and cumulative net cash flow</title>
      <defs>
        <linearGradient id={gradPos} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4ade80" />
          <stop offset="100%" stopColor="#15803d" />
        </linearGradient>
        <linearGradient id={gradNeg} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fca5a5" />
          <stop offset="100%" stopColor="#b91c1c" />
        </linearGradient>
      </defs>
      <text
        x={padL + innerW / 2}
        y={20}
        textAnchor="middle"
        className="chart-title"
      >
        Metrics by fiscal year-end
      </text>
      <text
        x={12}
        y={40}
        textAnchor="start"
        className="chart-axis-unit chart-axis-unit-left"
      >
        % (left axis)
      </text>
      <text
        x={w - 12}
        y={40}
        textAnchor="end"
        className="chart-axis-unit chart-axis-unit-right"
      >
        Million USD (right axis)
      </text>
      {gridFrac.map((t) => {
        const y = padT + innerH * (1 - t)
        const pctTick = leftMin + t * (leftMax - leftMin)
        const mTick = rightMin + t * (rightMax - rightMin)
        return (
          <g key={t}>
            <line
              x1={padL}
              y1={y}
              x2={padL + innerW}
              y2={y}
              className="chart-grid-line"
            />
            <text
              x={padL - tickLabelOffsetL}
              y={y + 4}
              textAnchor="end"
              className="chart-axis-label chart-axis-label-dual chart-axis-tick-left"
            >
              {formatPctTick(pctTick)}
            </text>
            <text
              x={padL + innerW + tickLabelOffsetR}
              y={y + 4}
              textAnchor="start"
              className="chart-axis-label chart-axis-label-dual chart-axis-tick-right"
            >
              {mTick >= 10 || mTick <= -10
                ? `${mTick.toFixed(1)}`
                : mTick.toFixed(2)}{' '}
              M
            </text>
          </g>
        )
      })}
      {YEARS.map((year, i) => (
        <g key={year}>
          <line
            x1={xCenter(i)}
            y1={padT + innerH}
            x2={xCenter(i)}
            y2={padT + innerH + 6}
            className="chart-axis-tick-line"
          />
          <text
            x={xCenter(i)}
            y={padT + innerH + 36}
            textAnchor="middle"
            className="chart-axis-label chart-axis-year"
          >
            Year {year}
          </text>
        </g>
      ))}
      <line
        x1={padL}
        y1={yZeroBar}
        x2={padL + innerW}
        y2={yZeroBar}
        className="panel2-roi-chart-zero-line"
      />
      {YEARS.map((year, i) => {
        const m = cumulNetM[i]
        const yTop = yRight(m)
        const barTop = Math.min(yZeroBar, yTop)
        const barH = Math.max(2, Math.abs(yZeroBar - yTop))
        const barPos = m >= 0
        return (
          <rect
            key={`bar-${year}`}
            x={xCenter(i) - barW / 2}
            y={barTop}
            width={barW}
            height={barH}
            rx={4}
            fill={barPos ? `url(#${gradPos})` : `url(#${gradNeg})`}
            className={`chart-bar panel2-roi-chart-bar${barPos ? ' panel2-roi-chart-bar-pos' : ' panel2-roi-chart-bar-neg'}`}
          />
        )
      })}
      {lineCoords.length >= 2 ? (
        <polyline
          className="roi-line panel2-roi-chart-line"
          points={linePointsStr}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}
      {lineCoords.map((p) => (
        <circle
          key={`pt-${p.year}`}
          cx={p.x}
          cy={p.y}
          r={5}
          className="panel2-roi-chart-line-marker"
        />
      ))}
    </svg>
  )
}

function CumulativeRoiChartCard({
  cumulativeRoiTable,
  idPrefix,
  cumulativeRoiTableVisible,
  setCumulativeRoiTableVisible,
  sectionClassName = 'panel-card',
}) {
  const chartHeadingId = `${idPrefix}-roi-chart-heading`
  const svgGradientIdPrefix = `${idPrefix}-dual-roi`

  return (
    <section
      className={sectionClassName}
      aria-labelledby={chartHeadingId}
    >
      <div className="panel2-roi-chart-header-row">
        <h2
          id={chartHeadingId}
          className="card-heading panel2-roi-chart-heading"
        >
          ROI chart
        </h2>
        <div className="panel2-roi-chart-toggle-wrap">
          <button
            type="button"
            role="switch"
            aria-checked={cumulativeRoiTableVisible}
            aria-label={
              cumulativeRoiTableVisible
                ? 'Hide cumulative ROI table'
                : 'Show cumulative ROI table'
            }
            className={`p6-toggle${cumulativeRoiTableVisible ? ' p6-toggle-on' : ''}`}
            onClick={() =>
              setCumulativeRoiTableVisible((v) => !v)
            }
          >
            <span className="p6-toggle-knob" />
          </button>
        </div>
      </div>
      <p className="card-lead">
        Same numbers as <strong>Cumulative ROI table</strong>
        {' '}(use the toggle to show it){' '}:
        cumulative ROI (<strong>%</strong>, left scale, line) versus{' '}
        <strong>Cumul. Net Cash Flow</strong> (<strong>million USD</strong>, right
        scale, bars).
      </p>
      <div className="chart-legend panel2-roi-chart-legend">
        <span className="legend-item">
          <span className="legend-line panel2-roi-chart-legend-line" />{' '}
          Cumulative ROI
        </span>
        <span className="legend-item">
          <span className="legend-swatch panel2-roi-chart-legend-swatch" />{' '}
          Cumul. Net Cash Flow
        </span>
      </div>
      <Panel2RoiDualAxisChart
        cumulativeRoiTable={cumulativeRoiTable}
        svgGradientIdPrefix={svgGradientIdPrefix}
      />
    </section>
  )
}

function CumulativeRoiTableCard({
  cumulativeRoiTable,
  idPrefix,
  sectionClassName = 'panel-card',
}) {
  const tableHeadingId = `${idPrefix}-cumulative-roi-heading`

  return (
    <section
      className={sectionClassName}
      aria-labelledby={tableHeadingId}
    >
      <h2 id={tableHeadingId} className="card-heading">
        Cumulative ROI table
      </h2>
      <p className="card-lead">
        <strong>A</strong> is modeled CAPEX (Panel&nbsp;1 Table&nbsp;1).{' '}
        <strong>B. On-Prem OPEX(Baseline)</strong> is a fixed reference track
        only: $20,264,400 in Year&nbsp;1, then each later year is the prior
        year &times;103% (rounded); it is not used in the Total Returns or net
        cash flow math. <strong>C. On-Premise OPEX</strong> and{' '}
        <strong>D. Cloud + AI OPEX</strong> match Panel&nbsp;1{' '}
        <strong>OPEX (On-Premise)</strong> and <strong>OPEX (Cloud + AI)</strong>{' '}
        by year. <strong>E. OPEX Net losts (C+D-B)</strong> =
        <strong>C</strong> + <strong>D</strong> − <strong>B</strong> (table
        letters) each year. <strong>F. Positive E</strong> is <strong>E</strong>{' '}
        when <strong>E</strong> &gt; 0, otherwise $0; the 5yr-Total column is the
        sum of this row’s yearly values. <strong>G. Total Inv (A+F)</strong> =
        <strong>A</strong> + <strong>F</strong> (table letters) each year; the
        5yr-Total column is the sum of this row’s yearly values.{' '}
        <strong>Cumul. Inv</strong> is the running sum of <strong>G</strong>{' '}
        through each year (5yr-Total = cumulative value at Year&nbsp;5).{' '}
        <strong>H. Total Returns</strong> is the sum of the Tangible and intangible
        returns block yearly totals — Table&nbsp;4 “Tangible Returns (Revenue &amp;
        Productivity)” plus Table&nbsp;5 “Intangible Returns (Quantified)”; the
        5yr-Total column is the sum of this row’s yearly values.{' '}
        <strong>I. Net Cash Flow (H-E-A)</strong> =
        <strong>H</strong> − <strong>E</strong> − <strong>A</strong> (table
        letters) each year; the 5yr-Total column is the sum of this row’s yearly
        values. <strong>Cumul. Net Cash Flow</strong> is the running sum of{' '}
        <strong>I</strong> through each year (5yr-Total = cumulative value at
        Year&nbsp;5). For the model, <strong>Baseline On-Prem OPEX</strong> is
        100% of Table&nbsp;2 annual baseline total in Year&nbsp;1, then compounds
        by the Cash flow <strong>Annual OpEx change (%)</strong> each year. Dollar
        rows are USD. <strong>Cumulative ROI</strong> (this row and the chart) is
        <strong>Cumul. Net Cash Flow</strong> ÷ <strong>Cumul. Inv</strong>{' '}
        (&times;100%) each year; the 5yr-Total column uses the Year&nbsp;5 values
        of those two rows.
      </p>
      <div className="table-scroll">
        <table className="data-table data-table-panel2-cumulative-roi">
          <thead>
            <tr>
              <th scope="col">Indicator (USD)</th>
              {YEARS.map((y) => (
                <th key={y} scope="col" className="num">
                  Year {y}
                </th>
              ))}
              <th scope="col" className="num">
                5yr-Total
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">A. CAPEX</th>
              {cumulativeRoiTable.capex.map((v, yi) => (
                <td key={yi} className="num">
                  {formatCurrency(v)}
                </td>
              ))}
              <td className="num">
                {formatCurrency(cumulativeRoiTable.totals.capex)}
              </td>
            </tr>
            <tr>
              <th scope="row">B. On-Prem OPEX(Baseline)</th>
              {cumulativeRoiTable.baselineOnPremOpexDisplay.map((v, yi) => (
                <td key={yi} className="num">
                  {formatCurrency(v)}
                </td>
              ))}
              <td className="num">
                {formatCurrency(
                  cumulativeRoiTable.totals.baselineOnPremOpexDisplay,
                )}
              </td>
            </tr>
            <tr>
              <th scope="row">C. On-Premise OPEX</th>
              {cumulativeRoiTable.onPremiseOpex.map((v, yi) => (
                <td key={yi} className="num">
                  {formatCurrency(v)}
                </td>
              ))}
              <td className="num">
                {formatCurrency(cumulativeRoiTable.totals.onPremiseOpex)}
              </td>
            </tr>
            <tr>
              <th scope="row">D. Cloud + AI OPEX</th>
              {cumulativeRoiTable.cloudAiOpex.map((v, yi) => (
                <td key={yi} className="num">
                  {formatCurrency(v)}
                </td>
              ))}
              <td className="num">
                {formatCurrency(cumulativeRoiTable.totals.cloudAiOpex)}
              </td>
            </tr>
            <tr>
              <th scope="row">E. OPEX Net losts (C+D-B)</th>
              {cumulativeRoiTable.opexNetSavings.map((v, yi) => (
                <td key={yi} className="num">
                  {formatCurrency(v)}
                </td>
              ))}
              <td className="num">
                {formatCurrency(cumulativeRoiTable.totals.opexNetSavings)}
              </td>
            </tr>
            <tr>
              <th scope="row">F. Positive E</th>
              {cumulativeRoiTable.positiveE.map((v, yi) => (
                <td key={yi} className="num">
                  {formatCurrency(v)}
                </td>
              ))}
              <td className="num">
                {formatCurrency(cumulativeRoiTable.totals.positiveE)}
              </td>
            </tr>
            <tr>
              <th scope="row">G. Total Inv (A+F)</th>
              {cumulativeRoiTable.invAPlusF.map((v, yi) => (
                <td key={yi} className="num">
                  {formatCurrency(v)}
                </td>
              ))}
              <td className="num">
                {formatCurrency(cumulativeRoiTable.totals.invAPlusF)}
              </td>
            </tr>
            <tr>
              <th scope="row">Cumul. Inv</th>
              {cumulativeRoiTable.cumulInv.map((v, yi) => (
                <td key={yi} className="num">
                  {formatCurrency(v)}
                </td>
              ))}
              <td className="num">
                {formatCurrency(cumulativeRoiTable.totals.cumulInv)}
              </td>
            </tr>
            <tr>
              <th scope="row">H. Total Returns</th>
              {cumulativeRoiTable.tangIntangReturns.map((v, yi) => (
                <td key={yi} className="num">
                  {formatCurrency(v)}
                </td>
              ))}
              <td className="num">
                {formatCurrency(cumulativeRoiTable.totals.tangIntangReturns)}
              </td>
            </tr>
            <tr>
              <th scope="row">I. Net Cash Flow (H-E-A)</th>
              {cumulativeRoiTable.netCashFlowHMinusEMinusA.map((v, yi) => (
                <td key={yi} className="num">
                  {formatCurrency(v)}
                </td>
              ))}
              <td className="num">
                {formatCurrency(
                  cumulativeRoiTable.totals.netCashFlowHMinusEMinusA,
                )}
              </td>
            </tr>
            <tr>
              <th scope="row">Cumul. Net Cash Flow</th>
              {cumulativeRoiTable.cumulNetCashFlowI.map((v, yi) => (
                <td key={yi} className="num">
                  {formatCurrency(v)}
                </td>
              ))}
              <td className="num">
                {formatCurrency(cumulativeRoiTable.totals.cumulNetCashFlowI)}
              </td>
            </tr>
            <tr className="data-table-total-row">
              <th scope="row">
                <strong>Cumulative ROI</strong>
              </th>
              {cumulativeRoiTable.cumulativeRoiFraction.map((frac, yi) => (
                <td key={yi} className="num num-strong">
                  {formatPanel2CumulativeRoiRatio(frac)}
                </td>
              ))}
              <td className="num num-strong">
                {formatPanel2CumulativeRoiRatio(
                  cumulativeRoiTable.totals.cumulativeRoiFraction,
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  )
}

/** Shared Panel 2 ROI dual-axis chart + cumulative ROI table (used on ROI route and Panel 7). */
function CumulativeRoiChartAndTableSection({ cumulativeRoiTable, idPrefix }) {
  const [cumulativeRoiTableVisible, setCumulativeRoiTableVisible] =
    useState(false)

  return (
    <>
      <CumulativeRoiChartCard
        cumulativeRoiTable={cumulativeRoiTable}
        idPrefix={idPrefix}
        cumulativeRoiTableVisible={cumulativeRoiTableVisible}
        setCumulativeRoiTableVisible={setCumulativeRoiTableVisible}
      />
      {cumulativeRoiTableVisible ? (
        <CumulativeRoiTableCard
          cumulativeRoiTable={cumulativeRoiTable}
          idPrefix={idPrefix}
        />
      ) : null}
    </>
  )
}

function Panel2IntangibleMethodTipProxy() {
  return (
    <div className="roi-method-tip-inner">
      <p className="roi-method-tip-heading">The Proxy Method</p>
      <p>
        You cannot directly measure the value of something, so you find a
        related metric that is known to correlate with money, and use it as a
        stand-in. For example, you cannot price &quot;better customer
        experience&quot; directly, but you know that a 1% reduction in churn
        retains 3,500 customers each worth $500 in annual premium — so that
        retention figure becomes your proxy for experience value. The key
        discipline is applying a confidence weight, because the correlation
        between the proxy and true value is never perfect.
      </p>
    </div>
  )
}

function Panel2IntangibleMethodTipIncremental() {
  return (
    <div className="roi-method-tip-inner">
      <p className="roi-method-tip-heading">Incremental Earnings</p>
      <p>
        This method counts only the new revenue or profit that would not exist
        without the transformation. It asks:{' '}
        <em>What new money comes in purely because of this project?</em> For
        example, AI-powered underwriting improves your loss ratio by 1.5
        points on a $250M premium base, generating $3.75M in additional annual
        profit. Or a new digital self-service portal captures customers who
        previously went to a competitor. The key discipline is being strict
        about what is truly incremental — revenue that would have grown
        organically anyway must be excluded.
      </p>
    </div>
  )
}

function Panel2IntangibleMethodTipCostAvoidance() {
  return (
    <div className="roi-method-tip-inner">
      <p className="roi-method-tip-heading">Cost Avoidance / Reduction</p>
      <p>
        This is the most auditable method.{' '}
        <strong>Cost reduction</strong> means you spend less on something you
        already pay for — for example, your cyber insurance premium drops by
        $350K because your cloud security posture is demonstrably stronger.{' '}
        <strong>Cost avoidance</strong> means preventing a future cost that
        has not yet appeared — for example, reducing your data breach
        probability from 18% to 4% avoids an expected annual loss of $921K,
        even though no breach has occurred. Both are real financial returns,
        grounded in documented baselines rather than revenue assumptions.
      </p>
    </div>
  )
}

function Panel2IntangibleMethodTipSurveys() {
  return (
    <div className="roi-method-tip-inner">
      <p className="roi-method-tip-heading">Surveys and Baseline</p>
      <p>
        You ask a structured sample of customers, employees, or investors how
        much they value a specific attribute, then measure the financial
        equivalent of their responses. For example, if 20% of commercial clients
        say they would pay a 3% premium to insure with a verified net-zero
        carrier, that stated preference translates to a quantified return. The{' '}
        &quot;baseline&quot; means you measure before and after the
        transformation, and the difference is your return.{' '}
        <strong>This method carries the highest uncertainty of the four, so it
        should always use conservative confidence weights.</strong>
      </p>
    </div>
  )
}

const PANEL2_INTANGIBLE_METHOD_TIP = {
  'Proxy Method': Panel2IntangibleMethodTipProxy,
  'Incremental Earnings': Panel2IntangibleMethodTipIncremental,
  'Cost Avoidance': Panel2IntangibleMethodTipCostAvoidance,
  'Surveys & Baseline': Panel2IntangibleMethodTipSurveys,
}

function Panel2IntangibleMethodHelp({ method, tipId }) {
  const TipBody = PANEL2_INTANGIBLE_METHOD_TIP[method]
  if (!TipBody) {
    return <em>{method}</em>
  }
  return (
    <span className="roi-method-with-help">
      <em>{method}</em>{' '}
      <span className="roi-method-tip-anchor">
        <button
          type="button"
          className="roi-method-tip-icon"
          aria-describedby={tipId}
          aria-label={`Explain how ${method} estimates are derived`}
        >
          ?
        </button>
        <span id={tipId} className="roi-method-tip-flyout" role="tooltip">
          <TipBody />
        </span>
      </span>
    </span>
  )
}

function RoiValuePanel({ cumulativeRoiTable }) {
  const [panel2TangibleDetailOpen, setPanel2TangibleDetailOpen] =
    useState(false)
  const [panel2IntangibleDetailOpen, setPanel2IntangibleDetailOpen] =
    useState(false)

  return (
    <main className="migration-panel">
      <header className="panel-header panel-header-context">
        <p className="migration-eyebrow">Cloud migration simulator · Panel 2</p>
        <p className="panel-title-context">ROI analysis</p>
        <p className="panel-subtitle">
          Tangible and intangible return tables (Tables 4–5 — v2), cumulative ROI
          chart and summary table tied to Panel&nbsp;1 cost inputs.
        </p>
      </header>

      <section
        className="panel-card"
        aria-labelledby="panel2-ti-summary-heading"
      >
        <h2 id="panel2-ti-summary-heading" className="card-heading">
          Tangible and intangible returns
        </h2>
        <p className="card-lead">
          Master summary excerpt (Table&nbsp;6 — v2): the two benefit streams shown
          in Table&nbsp;6, plus combined total returns.
        </p>
        <div className="table-scroll">
          <table className="data-table data-table-panel2-table6-summary">
            <thead>
              <tr>
                <th scope="col">Line</th>
                <th scope="col" className="num">
                  Year 1
                </th>
                <th scope="col" className="num">
                  Year 2
                </th>
                <th scope="col" className="num">
                  Year 3
                </th>
                <th scope="col" className="num">
                  Year 4
                </th>
                <th scope="col" className="num">
                  Year 5
                </th>
                <th scope="col" className="num">
                  5-Yr total
                </th>
              </tr>
            </thead>
            <tbody>
              {PANEL2_TABLE6_TI_SUMMARY_ROWS.map((row) =>
                row.t === 'total' ? (
                  <tr key={row.line} className="data-table-total-row">
                    <td>
                      <strong>{row.line}</strong>
                    </td>
                    <td className="num num-strong">
                      {formatRoiReturnsCell(row.y1)}
                    </td>
                    <td className="num num-strong">
                      {formatRoiReturnsCell(row.y2)}
                    </td>
                    <td className="num num-strong">
                      {formatRoiReturnsCell(row.y3)}
                    </td>
                    <td className="num num-strong">
                      {formatRoiReturnsCell(row.y4)}
                    </td>
                    <td className="num num-strong">
                      {formatRoiReturnsCell(row.y5)}
                    </td>
                    <td className="num num-strong">
                      {formatRoiReturnsCell(row.fiveYr)}
                    </td>
                  </tr>
                ) : row.detailKey === 'tangible' ? (
                  <tr key={row.line}>
                    <td>
                      <span className="panel1-cashflow-capex-row-head">
                        <span className="panel1-cashflow-capex-row-label">
                          {row.line}
                        </span>
                        <button
                          type="button"
                          className="panel1-capex-expand-btn panel1-capex-expand-btn--table"
                          aria-expanded={panel2TangibleDetailOpen}
                          aria-controls="panel2-tangible-detail"
                          aria-label={
                            panel2TangibleDetailOpen
                              ? 'Hide Tangible returns detail table'
                              : 'Show Tangible returns detail table'
                          }
                          onClick={() =>
                            setPanel2TangibleDetailOpen((o) => !o)
                          }
                        >
                          {panel2TangibleDetailOpen ? '−' : '+'}
                        </button>
                      </span>
                    </td>
                    <td className="num">{formatRoiReturnsCell(row.y1)}</td>
                    <td className="num">{formatRoiReturnsCell(row.y2)}</td>
                    <td className="num">{formatRoiReturnsCell(row.y3)}</td>
                    <td className="num">{formatRoiReturnsCell(row.y4)}</td>
                    <td className="num">{formatRoiReturnsCell(row.y5)}</td>
                    <td className="num">{formatRoiReturnsCell(row.fiveYr)}</td>
                  </tr>
                ) : row.detailKey === 'intangible' ? (
                  <tr key={row.line}>
                    <td>
                      <span className="panel1-cashflow-capex-row-head">
                        <span className="panel1-cashflow-capex-row-label">
                          {row.line}
                        </span>
                        <button
                          type="button"
                          className="panel1-capex-expand-btn panel1-capex-expand-btn--table"
                          aria-expanded={panel2IntangibleDetailOpen}
                          aria-controls="panel2-intangible-detail"
                          aria-label={
                            panel2IntangibleDetailOpen
                              ? 'Hide Intangible returns detail table'
                              : 'Show Intangible returns detail table'
                          }
                          onClick={() =>
                            setPanel2IntangibleDetailOpen((o) => !o)
                          }
                        >
                          {panel2IntangibleDetailOpen ? '−' : '+'}
                        </button>
                      </span>
                    </td>
                    <td className="num">{formatRoiReturnsCell(row.y1)}</td>
                    <td className="num">{formatRoiReturnsCell(row.y2)}</td>
                    <td className="num">{formatRoiReturnsCell(row.y3)}</td>
                    <td className="num">{formatRoiReturnsCell(row.y4)}</td>
                    <td className="num">{formatRoiReturnsCell(row.y5)}</td>
                    <td className="num">{formatRoiReturnsCell(row.fiveYr)}</td>
                  </tr>
                ) : (
                  <tr key={row.line}>
                    <td>{row.line}</td>
                    <td className="num">{formatRoiReturnsCell(row.y1)}</td>
                    <td className="num">{formatRoiReturnsCell(row.y2)}</td>
                    <td className="num">{formatRoiReturnsCell(row.y3)}</td>
                    <td className="num">{formatRoiReturnsCell(row.y4)}</td>
                    <td className="num">{formatRoiReturnsCell(row.y5)}</td>
                    <td className="num">{formatRoiReturnsCell(row.fiveYr)}</td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      </section>

      {panel2TangibleDetailOpen ? (
      <section
        className="panel-card"
        id="panel2-tangible-detail"
        aria-labelledby="panel2-tangible-heading"
      >
        <h2 id="panel2-tangible-heading" className="card-heading">
          Tangible returns
        </h2>
        <p className="card-lead">
          Pure revenue &amp; productivity value (Table&nbsp;4 — v2). Does not double-count
          OPEX savings captured in Panel&nbsp;1 / Table&nbsp;3B.
        </p>
        <div className="table-scroll">
          <table className="data-table data-table-panel2-tangible">
            <thead>
              <tr>
                <th scope="col">Group</th>
                <th scope="col">Line item</th>
                <th scope="col" className="num">
                  Stabilized (Y3)
                </th>
                <th scope="col" className="num">
                  Year 1
                </th>
                <th scope="col" className="num">
                  Year 2
                </th>
                <th scope="col" className="num">
                  Year 3
                </th>
                <th scope="col" className="num">
                  Year 4
                </th>
                <th scope="col" className="num">
                  Year 5
                </th>
                <th scope="col" className="num">
                  5-Yr total
                </th>
              </tr>
            </thead>
            <tbody>
              {PANEL2_TABLE4_TANGIBLE_ROWS.map((row, idx) =>
                row.t === 'g' ? (
                  <tr
                    key={`t4-g-${idx}-${row.label}`}
                    className="panel1-table1-group-row"
                  >
                    <td colSpan={9}>
                      <strong>{row.label}</strong>
                    </td>
                  </tr>
                ) : row.t === 'total' ? (
                  <tr key="t4-total" className="data-table-total-row">
                    <td />
                    <td>
                      <strong>{row.line}</strong>
                    </td>
                    <td className="num">—</td>
                    <td className="num num-strong">{formatRoiReturnsCell(row.y1)}</td>
                    <td className="num num-strong">{formatRoiReturnsCell(row.y2)}</td>
                    <td className="num num-strong">{formatRoiReturnsCell(row.y3)}</td>
                    <td className="num num-strong">{formatRoiReturnsCell(row.y4)}</td>
                    <td className="num num-strong">{formatRoiReturnsCell(row.y5)}</td>
                    <td className="num num-strong">
                      {formatRoiReturnsCell(row.fiveYr)}
                    </td>
                  </tr>
                ) : (
                  <tr key={`t4-l-${idx}-${row.line.slice(0, 20)}`}>
                    <td />
                    <td>{row.line}</td>
                    <td className="num">{formatRoiReturnsCell(row.stabilized)}</td>
                    <td className="num">{formatRoiReturnsCell(row.y1)}</td>
                    <td className="num">{formatRoiReturnsCell(row.y2)}</td>
                    <td className="num">{formatRoiReturnsCell(row.y3)}</td>
                    <td className="num">{formatRoiReturnsCell(row.y4)}</td>
                    <td className="num">{formatRoiReturnsCell(row.y5)}</td>
                    <td className="num">{formatRoiReturnsCell(row.fiveYr)}</td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
        <div className="panel1-capex-detail-footer">
          <button
            type="button"
            className="btn-secondary panel1-capex-hide-btn"
            onClick={() => setPanel2TangibleDetailOpen(false)}
          >
            Hide
          </button>
        </div>
      </section>
      ) : null}

      {panel2IntangibleDetailOpen ? (
      <section
        className="panel-card"
        id="panel2-intangible-detail"
        aria-labelledby="panel2-intangible-heading"
      >
        <h2 id="panel2-intangible-heading" className="card-heading">
          Intangible returns
        </h2>
        <p className="card-lead">
          Quantified intangibles (Table&nbsp;5 — v2). Methods: IE = Incremental
          Earnings, CA = Cost Avoidance, PM = Proxy Method, SB = Surveys &amp;
          Baseline — hover the <strong>?</strong> next to a method name for a full
          description of how that estimate is grounded.
        </p>
        <div className="table-scroll">
          <table className="data-table data-table-panel2-intangible">
            <thead>
              <tr>
                <th scope="col">Group</th>
                <th scope="col">Line item</th>
                <th scope="col">Method</th>
                <th scope="col" className="num">
                  Year 1
                </th>
                <th scope="col" className="num">
                  Year 2
                </th>
                <th scope="col" className="num">
                  Year 3
                </th>
                <th scope="col" className="num">
                  Year 4
                </th>
                <th scope="col" className="num">
                  Year 5
                </th>
                <th scope="col" className="num">
                  5-Yr total
                </th>
              </tr>
            </thead>
            <tbody>
              {PANEL2_TABLE5_INTANGIBLE_ROWS.map((row, idx) =>
                row.t === 'g' ? (
                  <tr
                    key={`t5-g-${idx}-${row.label}`}
                    className="panel1-table1-group-row"
                  >
                    <td colSpan={9}>
                      <strong>{row.label}</strong>
                    </td>
                  </tr>
                ) : row.t === 'total' ? (
                  <tr key="t5-total" className="data-table-total-row">
                    <td />
                    <td>
                      <strong>{row.line}</strong>
                    </td>
                    <td />
                    <td className="num num-strong">{formatRoiReturnsCell(row.y1)}</td>
                    <td className="num num-strong">{formatRoiReturnsCell(row.y2)}</td>
                    <td className="num num-strong">{formatRoiReturnsCell(row.y3)}</td>
                    <td className="num num-strong">{formatRoiReturnsCell(row.y4)}</td>
                    <td className="num num-strong">{formatRoiReturnsCell(row.y5)}</td>
                    <td className="num num-strong">
                      {formatRoiReturnsCell(row.fiveYr)}
                    </td>
                  </tr>
                ) : (
                  <tr key={`t5-l-${idx}-${row.line.slice(0, 20)}`}>
                    <td />
                    <td>{row.line}</td>
                    <td className="roi-table-method-cell">
                      <Panel2IntangibleMethodHelp
                        method={row.method}
                        tipId={`panel2-intangible-method-tip-${idx}`}
                      />
                    </td>
                    <td className="num">{formatRoiReturnsCell(row.y1)}</td>
                    <td className="num">{formatRoiReturnsCell(row.y2)}</td>
                    <td className="num">{formatRoiReturnsCell(row.y3)}</td>
                    <td className="num">{formatRoiReturnsCell(row.y4)}</td>
                    <td className="num">{formatRoiReturnsCell(row.y5)}</td>
                    <td className="num">{formatRoiReturnsCell(row.fiveYr)}</td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
        <div className="panel1-capex-detail-footer">
          <button
            type="button"
            className="btn-secondary panel1-capex-hide-btn"
            onClick={() => setPanel2IntangibleDetailOpen(false)}
          >
            Hide
          </button>
        </div>
      </section>
      ) : null}

      <CumulativeRoiChartAndTableSection
        cumulativeRoiTable={cumulativeRoiTable}
        idPrefix="panel2"
      />
    </main>
  )
}

function App() {
  const [activeView, setActiveView] = useState('home')
  // Panel 5 & 6 state lifted to App for cross-panel data flow
  const [automationPct, setAutomationPct] = useState(50)
  const [teamSize, setTeamSize] = useState(10)
  const [redundancy, setRedundancy] = useState(4)
  const [multiRegion, setMultiRegion] = useState(false)
  const [trainingHours, setTrainingHours] = useState(20)
  const [leadershipEngagement, setLeadershipEngagement] = useState(50)
  const [marketingSpend, setMarketingSpend] = useState(5)
  const [networkEffect, setNetworkEffect] = useState(0.3)
  const [marketType, setMarketType] = useState('B2C')

  /**
   * When set, replaces table-derived combined OpEx for charts/ROI (Apply %, ROI
   * suggested OpEx). Cleared when Table 2 on-prem baselines are edited.
   */
  const [opexModelOverride, setOpexModelOverride] = useState(null)

  /** Annual growth applied to cloud OPEX Y4/Y5 (Table 3); also drives Cash flow phase labels. */
  const [panel1AnnualOpexGrowthPct, setPanel1AnnualOpexGrowthPct] =
    useState(3)

  /** Panel 1: Table 1 CAPEX detail — toggled from Cash flow card. */
  const [panel1CapexDetailOpen, setPanel1CapexDetailOpen] = useState(false)

  /** Panel 1: Table 2 on-prem OPEX — toggled from Cash flow card. */
  const [panel1OnpremDetailOpen, setPanel1OnpremDetailOpen] = useState(false)

  /** Panel 1: Table 3 cloud + AI OPEX — toggled from Cash flow card. */
  const [panel1CloudOpexDetailOpen, setPanel1CloudOpexDetailOpen] =
    useState(false)

  const [panel1Table1Rows, setPanel1Table1Rows] = useState(() =>
    PANEL1_TABLE1_CAPEX_ROWS.map((r) => ({ ...r })),
  )

  const [panel1Table2OnpremRows, setPanel1Table2OnpremRows] = useState(() =>
    PANEL1_TABLE2_ONPREM_OPEX_ROWS.map((r) => ({ ...r })),
  )

  const [panel1Table3CloudRows, setPanel1Table3CloudRows] = useState(() =>
    PANEL1_TABLE3_CLOUD_AI_OPEX_ROWS.map((r) => ({ ...r })),
  )

  const panel1CashflowYearPhases = useMemo(() => {
    const ft = formatPanel1OpexGrowthPctLabel(panel1AnnualOpexGrowthPct)
    return [
      { subtitle: 'Migration' },
      { subtitle: 'Transition' },
      { subtitle: 'Stabilized' },
      { subtitle: `(Y3+${ft}%)`, formula: true },
      { subtitle: `(Y4+${ft}%)`, formula: true },
    ]
  }, [panel1AnnualOpexGrowthPct])

  const panel1Table3CloudRowsDerived = useMemo(
    () =>
      panel1Table3CloudRows.map((row) =>
        row.t === 'l'
          ? {
              ...row,
              ...splitPanel3CloudStabilizedToYears(
                row.stabilized,
                panel1AnnualOpexGrowthPct,
              ),
            }
          : row,
      ),
    [panel1Table3CloudRows, panel1AnnualOpexGrowthPct],
  )

  const panel1Table1LineSums = useMemo(
    () => sumPanel1Table1LineBudgets(panel1Table1Rows),
    [panel1Table1Rows],
  )

  /** CAPEX cash series matches TOTAL CAPEX (Y1 / Y2 / zeros) in Table 1. */
  const panel1NumericCapexByYear = useMemo(
    () =>
      YEARS.map((_, i) =>
        i === 0
          ? panel1Table1LineSums.y1
          : i === 1
            ? panel1Table1LineSums.y2
            : 0,
      ),
    [panel1Table1LineSums],
  )

  const panel1Table2OnpremSums = useMemo(
    () => sumPanel2OnpremLineBudgets(panel1Table2OnpremRows),
    [panel1Table2OnpremRows],
  )

  const panel1Table3CloudSums = useMemo(
    () => sumPanel3CloudLineBudgets(panel1Table3CloudRowsDerived),
    [panel1Table3CloudRowsDerived],
  )

  /**
   * One object drives the Cash flow “OPEX (On-Premise)” row and the Table 2
   * TOTAL ON-PREM OPEX row so Y1, Y2, and 5-yr total stay identical.
   */
  const panel1OnpremTotalsAligned = useMemo(() => {
    const s = panel1Table2OnpremSums
    const { y1, y2, baseline } = s
    return {
      baseline,
      y1,
      y2,
      fiveYr: y1 + y2,
    }
  }, [panel1Table2OnpremSums])

  /**
   * Cost-by-year baseline bars: Year 1 = Table 2 TOTAL ON-PREM annual baseline;
   * Years 2–5 compound from that base at the Cash flow Annual OpEx change (%).
   */
  const panel1BaselineOnPremForChart = useMemo(() => {
    const B = panel1OnpremTotalsAligned.baseline
    const g = panel1AnnualOpexGrowthPct
    const mult = 1 + (Number.isFinite(g) ? g : 0) / 100
    return YEARS.map((_, i) => Math.round(B * mult ** i))
  }, [panel1OnpremTotalsAligned.baseline, panel1AnnualOpexGrowthPct])

  /** Combined operating OpEx: Table 2 on-prem wind-down + Table 3 cloud row. */
  const panel1CombinedOpexFromTables = useMemo(() => {
    const onP = panel1Table2OnpremSums
    const cl = panel1Table3CloudSums
    const onPremByYear = [onP.y1, onP.y2, 0, 0, 0]
    const cloudByYear = [cl.y1, cl.y2, cl.y3, cl.y4, cl.y5]
    return YEARS.map((_, yi) => onPremByYear[yi] + cloudByYear[yi])
  }, [panel1Table2OnpremSums, panel1Table3CloudSums])

  const numericOpexForModel = useMemo(
    () => opexModelOverride ?? panel1CombinedOpexFromTables,
    [opexModelOverride, panel1CombinedOpexFromTables],
  )

  const panel2CumulativeRoiTable = useMemo(() => {
    const onP = panel1Table2OnpremSums
    const onPremiseOpexByYear = [onP.y1, onP.y2, 0, 0, 0]
    const cl = panel1Table3CloudSums
    const cloudAiOpexByYear = [cl.y1, cl.y2, cl.y3, cl.y4, cl.y5]
    return buildPanel2CumulativeRoiSeries(
      panel1NumericCapexByYear,
      panel1BaselineOnPremForChart,
      onPremiseOpexByYear,
      cloudAiOpexByYear,
      panel2TangibleReturnsByYear(),
      panel2IntangibleReturnsByYear(),
    )
  }, [
    panel1NumericCapexByYear,
    panel1BaselineOnPremForChart,
    panel1Table2OnpremSums,
    panel1Table3CloudSums,
  ])

  const panel1CashflowRowsForUi = useMemo(() => {
    const capexYears = panel1NumericCapexByYear
    const op = panel1OnpremTotalsAligned
    const onPremYears = [op.y1, op.y2, 0, 0, 0]
    return [
      {
        ...PANEL1_CASHFLOW_DATA_ROWS[0],
        years: capexYears.map((v, yi) =>
          yi >= 2 && v === 0 ? null : v,
        ),
        fiveYrTotal: panel1Table1LineSums.total,
      },
      {
        ...PANEL1_CASHFLOW_DATA_ROWS[1],
        years: onPremYears.map((v, yi) =>
          yi >= 2 && v === 0 ? null : v,
        ),
        fiveYrTotal: op.fiveYr,
      },
      {
        ...PANEL1_CASHFLOW_DATA_ROWS[2],
        years: [
          panel1Table3CloudSums.y1,
          panel1Table3CloudSums.y2,
          panel1Table3CloudSums.y3,
          panel1Table3CloudSums.y4,
          panel1Table3CloudSums.y5,
        ].map((v, yi) => (yi >= 2 && v === 0 ? null : v)),
        fiveYrTotal: panel1Table3CloudSums.fiveYr,
      },
    ]
  }, [
    panel1NumericCapexByYear,
    panel1Table1LineSums.total,
    panel1OnpremTotalsAligned,
    panel1Table3CloudSums,
  ])

  const panel1CashflowCombined = useMemo(
    () => panel1SumCashflowTotals(panel1CashflowRowsForUi),
    [panel1CashflowRowsForUi],
  )

  const rows = useMemo(() => {
    const numericOpex = numericOpexForModel
    const numericCapex = panel1NumericCapexByYear
    const onP = panel1Table2OnpremSums
    const cl = panel1Table3CloudSums
    const opexOnPremByYear = [onP.y1, onP.y2, 0, 0, 0]
    const opexCloudAiByYear = [cl.y1, cl.y2, cl.y3, cl.y4, cl.y5]
    return YEARS.reduce(
      (acc, y, idx) => {
        const opex = numericOpex[idx]
        const capex = numericCapex[idx]
        const opexOnPrem = Math.round(opexOnPremByYear[idx] ?? 0)
        const opexCloudAi = Math.round(opexCloudAiByYear[idx] ?? 0)
        const totalCost = opex + capex
        const cumulativeCost = acc.cumulative + totalCost
        return {
          cumulative: cumulativeCost,
          rows: [
            ...acc.rows,
            {
              year: y,
              opex,
              opexOnPrem,
              opexCloudAi,
              capex,
              totalCost,
              cumulativeCost,
            },
          ],
        }
      },
      { cumulative: 0, rows: [] },
    ).rows
  }, [
    numericOpexForModel,
    panel1NumericCapexByYear,
    panel1Table2OnpremSums,
    panel1Table3CloudSums,
  ])

  function handlePanel1Table1LineBudgetChange(rowIndex, raw) {
    const parsed = splitPanel1Table1BudgetToYears(parseMoney(raw))
    setPanel1Table1Rows((prev) =>
      prev.map((row, i) =>
        i === rowIndex && row.t === 'l' ? { ...row, ...parsed } : row,
      ),
    )
  }

  function handlePanel2OnpremBaselineChange(rowIndex, raw) {
    const parsed = splitPanel2OnpremBaselineToYears(parseMoney(raw))
    setOpexModelOverride(null)
    setPanel1Table2OnpremRows((prev) =>
      prev.map((row, i) =>
        i === rowIndex && row.t === 'l' ? { ...row, ...parsed } : row,
      ),
    )
  }

  function handlePanel3CloudStabilizedChange(rowIndex, raw) {
    const parsed = splitPanel3CloudStabilizedToYears(
      parseMoney(raw),
      panel1AnnualOpexGrowthPct,
    )
    setOpexModelOverride(null)
    setPanel1Table3CloudRows((prev) =>
      prev.map((row, i) =>
        i === rowIndex && row.t === 'l' ? { ...row, ...parsed } : row,
      ),
    )
  }

  const isHome = activeView === 'home'
  const isBudget = activeView === 'budget'
  const isRoi = activeView === 'roi'
  const isPanel3Governance = activeView === 'panel3'
  const isSensitivity = activeView === 'sensitivity'
  const isPanels = activeView === 'panels'
  const isPanel5CiCd = activeView === 'panel5'
  const isPanel6Performance = activeView === 'panel6'
  const isAdoption = activeView === 'adoption'
  const isDiffusion = activeView === 'diffusion'
  const topHeaderTitle =
    activeView === 'home'
      ? 'Technology Benefit Simulator'
      : activeView === 'budget'
        ? 'Panel 1: Cost Estimation'
        : activeView === 'roi'
          ? 'Panel 2: ROI Analysis'
          : activeView === 'panel3'
            ? 'Panel 3: Governance & Compliance'
            : activeView === 'panels'
              ? 'Panel 4: Governance & SLA'
              : activeView === 'panel5'
                ? 'Panel 5: CI/CD Pipeline Efficiency'
                : activeView === 'panel6'
                  ? 'Panel 6: Performance & Resilience'
                  : activeView === 'sensitivity'
                    ? 'Panel 7: ROI Sensitivity Explorer'
                    : activeView === 'adoption'
                      ? 'Panel 8: Adoption Curve'
                      : activeView === 'diffusion'
                        ? 'Panel 9: Diffusion Simulator'
                        : 'Technology Benefit Simulator'

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Primary navigation">
        <div className="sidebar-stack">
          <div className="sidebar-brand-row">
            <button
              type="button"
              className="sidebar-brand-hit"
              onClick={() => setActiveView('home')}
              aria-label="Benefit Simulator home"
            >
              <span className="sidebar-logo-mark" aria-hidden />
              <span className="sidebar-brand-text">Benefit Simulator</span>
            </button>
          </div>

          <nav className="sidebar-nav" aria-label="Panels">
            <p className="sidebar-nav-caption">Workspace</p>
            <button
              type="button"
              className={`sidebar-nav-item${isHome ? ' sidebar-nav-item-active' : ''}`}
              onClick={() => setActiveView('home')}
            >
              <IconHome className="sidebar-nav-svg" />
              <span className="sidebar-nav-label">Overview</span>
            </button>
            <button
              type="button"
              className={`sidebar-nav-item${isBudget ? ' sidebar-nav-item-active' : ''}`}
              onClick={() => setActiveView('budget')}
            >
              <IconBudget className="sidebar-nav-svg" />
              <span className="sidebar-nav-label">Panel 1: Cost Estimation</span>
            </button>
            <button
              type="button"
              className={`sidebar-nav-item${isRoi ? ' sidebar-nav-item-active' : ''}`}
              onClick={() => setActiveView('roi')}
            >
              <IconRoiValue className="sidebar-nav-svg" />
              <span className="sidebar-nav-label">
                Panel 2: ROI Analysis
              </span>
            </button>
            <button
              type="button"
              className={`sidebar-nav-item${isPanel3Governance ? ' sidebar-nav-item-active' : ''}`}
              onClick={() => setActiveView('panel3')}
            >
              <IconGovernanceCompliance className="sidebar-nav-svg" />
              <span className="sidebar-nav-label">
                Panel 3: Governance &amp; Compliance
              </span>
            </button>
            <button
              type="button"
              className={`sidebar-nav-item${isPanels ? ' sidebar-nav-item-active' : ''}`}
              onClick={() => setActiveView('panels')}
            >
              <IconPanels className="sidebar-nav-svg" />
              <span className="sidebar-nav-label">
                Panel 4: Governance &amp; SLA
              </span>
            </button>
            <button
              type="button"
              className={`sidebar-nav-item${isPanel5CiCd ? ' sidebar-nav-item-active' : ''}`}
              onClick={() => setActiveView('panel5')}
            >
              <IconCiCdPipeline className="sidebar-nav-svg" />
              <span className="sidebar-nav-label">
                Panel 5: CI/CD Pipeline Efficiency
              </span>
            </button>
            <button
              type="button"
              className={`sidebar-nav-item${isPanel6Performance ? ' sidebar-nav-item-active' : ''}`}
              onClick={() => setActiveView('panel6')}
            >
              <IconPerformanceResilience className="sidebar-nav-svg" />
              <span className="sidebar-nav-label">
                Panel 6: Performance &amp; Resilience
              </span>
            </button>
            <button
              type="button"
              className={`sidebar-nav-item${isSensitivity ? ' sidebar-nav-item-active' : ''}`}
              onClick={() => setActiveView('sensitivity')}
            >
              <IconRoiSensitivity className="sidebar-nav-svg" />
              <span className="sidebar-nav-label">
                Panel 7: ROI Sensitivity Explorer
              </span>
            </button>
            <button
              type="button"
              className={`sidebar-nav-item${isAdoption ? ' sidebar-nav-item-active' : ''}`}
              onClick={() => setActiveView('adoption')}
            >
              <IconAdoption className="sidebar-nav-svg" />
              <span className="sidebar-nav-label">
                Panel 8: Adoption Curve
              </span>
            </button>
            <button
              type="button"
              className={`sidebar-nav-item${isDiffusion ? ' sidebar-nav-item-active' : ''}`}
              onClick={() => setActiveView('diffusion')}
            >
              <IconDiffusion className="sidebar-nav-svg" />
              <span className="sidebar-nav-label">
                Panel 9: Diffusion Simulator
              </span>
            </button>
          </nav>
        </div>

        <div className="sidebar-footer">
          <p className="sidebar-footer-caption">Support</p>
          <button type="button" className="sidebar-footer-link sidebar-footer-link-soft">
            <IconHelp />
            Help Center
          </button>
          <button type="button" className="sidebar-footer-link sidebar-footer-link-soft">
            Feedback
          </button>
          <div className="sidebar-profile">
            <div className="sidebar-profile-avatar" aria-hidden>
              CL
            </div>
            <div className="sidebar-profile-meta">
              <span className="sidebar-profile-name">Claims Lead</span>
              <span className="sidebar-profile-email">
                casualty.claims@yourorg.com
              </span>
            </div>
          </div>
        </div>
      </aside>

      <div className="app-stage">
        <AppTopHeader
          showBack={!isHome}
          title={topHeaderTitle}
          onBackToHome={() => setActiveView('home')}
        />
        <div className="app-scroll">
          <LandingHome visible={isHome} />

        <div
          className="budget-route"
          id="budget-route"
          hidden={!isBudget}
          aria-hidden={!isBudget}
          style={{ display: isBudget ? 'block' : 'none' }}
        >
    <main className="migration-panel" id="panel1-cost-estimation">
      <header className="panel-header panel-header-context">
        <p className="migration-eyebrow">Cloud migration simulator · Panel 1</p>
        <p className="panel-title-context">Cost Estimation</p>
        <p className="panel-subtitle">
          InsureCo cloud migration &amp; AI transformation (1,000 employees):
          cash-flow view combines Table&nbsp;6 one-time CAPEX with Table&nbsp;3B
          operating lines; Charts use operating OpEx plus modeled CapEx. USD.
        </p>
      </header>

      <section className="panel-card" aria-labelledby="cashflow-heading">
        <h2 id="cashflow-heading" className="card-heading">
          Cash flow
        </h2>
        <div className="panel1-cashflow-opex-slider">
          <label
            className="panel1-cashflow-opex-slider-label"
            htmlFor="panel1-annual-opex-pct"
          >
            Annual OpEx change (%)
            <span className="panel1-cashflow-opex-slider-value" aria-live="polite">
              {formatPanel1OpexGrowthPctLabel(panel1AnnualOpexGrowthPct)}%
            </span>
          </label>
          <input
            id="panel1-annual-opex-pct"
            type="range"
            min={0}
            max={10}
            step={0.5}
            value={panel1AnnualOpexGrowthPct}
            onChange={(e) => {
              setOpexModelOverride(null)
              setPanel1AnnualOpexGrowthPct(Number(e.target.value))
            }}
            aria-valuemin={0}
            aria-valuemax={10}
            aria-valuenow={panel1AnnualOpexGrowthPct}
            aria-label="Annual operating expense year-over-year growth for cloud OPEX years 4 and 5"
          />
        </div>
        <p className="card-lead">
          CAPEX (Table&nbsp;6) plus OPEX streams (Table&nbsp;3B — v2).{' '}
          <strong>Total Cost</strong> is the sum of the rows above it by period.
          The <strong>Cost by year</strong> chart uses modeled operating OpEx
          (on-prem + cloud) + CapEx. Use the slider for annual OpEx growth on
          cloud ramp (Years&nbsp;4–5 labels and Table&nbsp;3).
        </p>
        <div className="table-scroll">
          <table className="data-table data-table-panel1-3b">
            <thead>
              <tr>
                <th scope="col">Cost stream</th>
                {YEARS.map((y, yi) => {
                  const phase = panel1CashflowYearPhases[yi]
                  const sub = phase?.subtitle
                  return (
                    <th
                      key={y}
                      scope="col"
                      className="num"
                      aria-label={sub ? `Year ${y} (${sub})` : `Year ${y}`}
                    >
                      Year {y}
                      {sub ? (
                        <span
                          className={`data-table-year-phase${phase.formula ? ' data-table-year-phase-formula' : ''}`}
                        >
                          {sub}
                        </span>
                      ) : null}
                    </th>
                  )
                })}
                <th scope="col" className="num">
                  5-Yr Total
                </th>
              </tr>
            </thead>
            <tbody>
              {panel1CashflowRowsForUi.map((row) => (
                <tr key={row.label}>
                  <th scope="row">
                    {row.label === 'CAPEX (Cloud + AI)' ? (
                      <span className="panel1-cashflow-capex-row-head">
                        <span className="panel1-cashflow-capex-row-label">
                          {row.label}
                        </span>
                        <button
                          type="button"
                          className="panel1-capex-expand-btn panel1-capex-expand-btn--table"
                          aria-expanded={panel1CapexDetailOpen}
                          aria-controls="panel1-capex-detail"
                          aria-label={
                            panel1CapexDetailOpen
                              ? 'Hide CAPEX (Cloud + AI) line-item table'
                              : 'Show CAPEX (Cloud + AI) line-item table'
                          }
                          onClick={() => setPanel1CapexDetailOpen((o) => !o)}
                        >
                          {panel1CapexDetailOpen ? '−' : '+'}
                        </button>
                      </span>
                    ) : row.label === 'OPEX (On-Premise)' ? (
                      <span className="panel1-cashflow-capex-row-head">
                        <span className="panel1-cashflow-capex-row-label">
                          {row.label}
                        </span>
                        <button
                          type="button"
                          className="panel1-capex-expand-btn panel1-capex-expand-btn--table"
                          aria-expanded={panel1OnpremDetailOpen}
                          aria-controls="panel1-opex-onprem-detail"
                          aria-label={
                            panel1OnpremDetailOpen
                              ? 'Hide OPEX (On-Premise) detail table'
                              : 'Show OPEX (On-Premise) detail table'
                          }
                          onClick={() => setPanel1OnpremDetailOpen((o) => !o)}
                        >
                          {panel1OnpremDetailOpen ? '−' : '+'}
                        </button>
                      </span>
                    ) : row.label === 'OPEX (Cloud + AI)' ? (
                      <span className="panel1-cashflow-capex-row-head">
                        <span className="panel1-cashflow-capex-row-label">
                          {row.label}
                        </span>
                        <button
                          type="button"
                          className="panel1-capex-expand-btn panel1-capex-expand-btn--table"
                          aria-expanded={panel1CloudOpexDetailOpen}
                          aria-controls="panel1-cloud-opex-detail"
                          aria-label={
                            panel1CloudOpexDetailOpen
                              ? 'Hide OPEX (Cloud + AI) detail table'
                              : 'Show OPEX (Cloud + AI) detail table'
                          }
                          onClick={() =>
                            setPanel1CloudOpexDetailOpen((o) => !o)
                          }
                        >
                          {panel1CloudOpexDetailOpen ? '−' : '+'}
                        </button>
                      </span>
                    ) : (
                      row.label
                    )}
                  </th>
                  {row.years.map((v, yi) => (
                    <td key={yi} className="num">
                      {v == null ? '—' : formatCurrency(v)}
                    </td>
                  ))}
                  <td className="num">{formatCurrency(row.fiveYrTotal)}</td>
                </tr>
              ))}
              <tr className="data-table-total-row">
                <th scope="row">
                  <strong>Total Cost</strong>
                </th>
                {panel1CashflowCombined.yearly.map((v, yi) => (
                  <td key={yi} className="num num-strong">
                    {formatCurrency(v)}
                  </td>
                ))}
                <td className="num num-strong">
                  {formatCurrency(panel1CashflowCombined.fiveYr)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {panel1CapexDetailOpen ? (
      <section
        className="panel-card"
        id="panel1-capex-detail"
        aria-labelledby="panel1-table1-capex-heading"
      >
        <h2 id="panel1-table1-capex-heading" className="card-heading">
          CAPEX (Cloud + AI)
        </h2>
        <p className="card-lead">
          One-time capital from Table&nbsp;1 (v2): 60% in Year&nbsp;1, 40% in Year&nbsp;2;
          no recurring CAPEX in Years&nbsp;3–5. Contingency = 15% × base CAPEX ($6.18M).
          Total program CAPEX&nbsp;$7,107,000 (aligned with modeled CapEx ramp).
        </p>
        <div className="table-scroll">
          <table className="data-table data-table-panel1-capex-t1">
            <thead>
              <tr>
                <th scope="col">Group</th>
                <th scope="col">Line item</th>
                <th scope="col" className="num">
                  Total budget
                </th>
                <th scope="col" className="num">
                  Year 1 (60%)
                </th>
                <th scope="col" className="num">
                  Year 2 (40%)
                </th>
                <th scope="col" className="num">
                  Year 3
                </th>
                <th scope="col" className="num">
                  Year 4
                </th>
                <th scope="col" className="num">
                  Year 5
                </th>
              </tr>
            </thead>
            <tbody>
              {panel1Table1Rows.map((row, idx) =>
                row.t === 'g' ? (
                  <tr key={`g-${idx}`} className="panel1-table1-group-row">
                    <td colSpan={8}>
                      <strong>{row.label}</strong>
                    </td>
                  </tr>
                ) : row.t === 'total' ? (
                  <tr key="total-capex" className="data-table-total-row">
                    <td />
                    <td>
                      <strong>{row.line}</strong>
                    </td>
                    <td className="num num-strong">
                      {formatCurrency(panel1Table1LineSums.total)}
                    </td>
                    <td className="num num-strong">
                      {formatCurrency(panel1Table1LineSums.y1)}
                    </td>
                    <td className="num num-strong">
                      {formatCurrency(panel1Table1LineSums.y2)}
                    </td>
                    <td className="num">—</td>
                    <td className="num">—</td>
                    <td className="num">—</td>
                  </tr>
                ) : (
                  <tr key={`l-${idx}-${row.line.slice(0, 24)}`}>
                    <td />
                    <td>{row.line}</td>
                    <td className="num">
                      <input
                        type="text"
                        inputMode="decimal"
                        className="field field-money panel1-table1-total-input"
                        aria-label={`${row.line} total budget`}
                        value={
                          Number.isFinite(row.total) ? String(row.total) : ''
                        }
                        onChange={(e) =>
                          handlePanel1Table1LineBudgetChange(idx, e.target.value)
                        }
                      />
                    </td>
                    <td className="num">{formatCurrency(row.y1)}</td>
                    <td className="num">{formatCurrency(row.y2)}</td>
                    <td className="num">—</td>
                    <td className="num">—</td>
                    <td className="num">—</td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
        <div className="panel1-capex-detail-footer">
          <button
            type="button"
            className="btn-secondary panel1-capex-hide-btn"
            onClick={() => setPanel1CapexDetailOpen(false)}
          >
            Hide
          </button>
        </div>
      </section>
      ) : null}

      {panel1OnpremDetailOpen ? (
      <section
        className="panel-card"
        id="panel1-opex-onprem-detail"
        aria-labelledby="panel1-table2-onprem-heading"
      >
        <h2 id="panel1-table2-onprem-heading" className="card-heading">
          OPEX (On-Premise)
        </h2>
        <p className="card-lead">
          On-premise OPEX persists at 100% in Year&nbsp;1 and 40% in Year&nbsp;2
          (dual-running), then fully decommissioned from Year&nbsp;3.{' '}
          <strong>
            Annual baseline total:{' '}
            {formatCurrency(panel1OnpremTotalsAligned.baseline)}
          </strong>{' '}
          (Table&nbsp;2 — v2 Corrected).
        </p>
        <div className="table-scroll">
          <table className="data-table data-table-panel1-opex-t2">
            <thead>
              <tr>
                <th scope="col">Group</th>
                <th scope="col">Line item</th>
                <th scope="col" className="num">
                  Annual baseline
                </th>
                <th scope="col" className="num">
                  Year 1 (100%)
                </th>
                <th scope="col" className="num">
                  Year 2 (40%)
                </th>
                <th scope="col" className="num">
                  Year 3 (0%)
                </th>
                <th scope="col" className="num">
                  Year 4 (0%)
                </th>
                <th scope="col" className="num">
                  Year 5 (0%)
                </th>
                <th scope="col" className="num">
                  5-Yr total
                </th>
              </tr>
            </thead>
            <tbody>
              {panel1Table2OnpremRows.map((row, idx) =>
                row.t === 'g' ? (
                  <tr key={`t2-g-${idx}-${row.label}`} className="panel1-table1-group-row">
                    <td colSpan={9}>
                      <strong>{row.label}</strong>
                    </td>
                  </tr>
                ) : row.t === 'total' ? (
                  <tr key="t2-total" className="data-table-total-row">
                    <td />
                    <td>
                      <strong>{row.line}</strong>
                    </td>
                    <td className="num num-strong">
                      {formatCurrency(panel1OnpremTotalsAligned.baseline)}
                    </td>
                    <td className="num num-strong">
                      {formatCurrency(panel1OnpremTotalsAligned.y1)}
                    </td>
                    <td className="num num-strong">
                      {formatCurrency(panel1OnpremTotalsAligned.y2)}
                    </td>
                    <td className="num">—</td>
                    <td className="num">—</td>
                    <td className="num">—</td>
                    <td className="num num-strong">
                      {formatCurrency(panel1OnpremTotalsAligned.fiveYr)}
                    </td>
                  </tr>
                ) : (
                  <tr key={`t2-l-${idx}-${row.line.slice(0, 20)}`}>
                    <td />
                    <td>{row.line}</td>
                    <td className="num">
                      <input
                        type="text"
                        inputMode="decimal"
                        className="field field-money panel1-table1-total-input"
                        aria-label={`${row.line} annual baseline`}
                        value={
                          Number.isFinite(row.baseline)
                            ? String(row.baseline)
                            : ''
                        }
                        onChange={(e) =>
                          handlePanel2OnpremBaselineChange(idx, e.target.value)
                        }
                      />
                    </td>
                    <td className="num">{formatCurrency(row.y1)}</td>
                    <td className="num">{formatCurrency(row.y2)}</td>
                    <td className="num">—</td>
                    <td className="num">—</td>
                    <td className="num">—</td>
                    <td className="num">{formatCurrency(row.fiveYr)}</td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
        <div className="panel1-capex-detail-footer">
          <button
            type="button"
            className="btn-secondary panel1-capex-hide-btn"
            aria-label="Hide CAPEX (Cloud + AI) line-item table"
            onClick={() => setPanel1CapexDetailOpen(false)}
          >
            Hide
          </button>
        </div>
      </section>
      ) : null}

      {panel1CloudOpexDetailOpen ? (
      <section
        className="panel-card"
        id="panel1-cloud-opex-detail"
        aria-labelledby="panel1-table3-cloud-opex-heading"
      >
        <h2 id="panel1-table3-cloud-opex-heading" className="card-heading">
          OPEX (Cloud + AI)
        </h2>
        <p className="card-lead">
          Cloud OPEX ramps in as workloads migrate: 30% in Year&nbsp;1, 75% in
          Year&nbsp;2, 100% in Year&nbsp;3 (stabilized run rate). Years&nbsp;4–5
          use the annual OpEx change from the{' '}
          <strong>Cash flow</strong> slider (default 3%): Year&nbsp;4 = stabilized
          × (1 + rate), Year&nbsp;5 = Year&nbsp;4 × (1 + rate) (Table&nbsp;3 — v2).
        </p>
        <div className="table-scroll">
          <table className="data-table data-table-panel1-cloud-t3">
            <thead>
              <tr>
                <th scope="col">Group</th>
                <th scope="col">Line item</th>
                <th scope="col" className="num">
                  Stabilized (Y3)
                </th>
                <th scope="col" className="num">
                  Year 1 (30%)
                </th>
                <th scope="col" className="num">
                  Year 2 (75%)
                </th>
                <th scope="col" className="num">
                  Year 3 (100%)
                </th>
                <th scope="col" className="num">
                  Year 4 (Y3+
                  {formatPanel1OpexGrowthPctLabel(panel1AnnualOpexGrowthPct)}%)
                </th>
                <th scope="col" className="num">
                  <span className="data-table-th-wrap">
                    Year 5 (Y4+
                    {formatPanel1OpexGrowthPctLabel(panel1AnnualOpexGrowthPct)}%)
                  </span>
                </th>
                <th scope="col" className="num">
                  5-Yr total
                </th>
              </tr>
            </thead>
            <tbody>
              {panel1Table3CloudRowsDerived.map((row, idx) =>
                row.t === 'g' ? (
                  <tr
                    key={`t3-g-${idx}-${row.label}`}
                    className="panel1-table1-group-row"
                  >
                    <td colSpan={9}>
                      <strong>{row.label}</strong>
                    </td>
                  </tr>
                ) : row.t === 'total' ? (
                  <tr key="t3-total" className="data-table-total-row">
                    <td />
                    <td>
                      <strong>{row.line}</strong>
                    </td>
                    <td className="num num-strong">
                      {formatCurrency(panel1Table3CloudSums.stabilized)}
                    </td>
                    <td className="num num-strong">
                      {formatCurrency(panel1Table3CloudSums.y1)}
                    </td>
                    <td className="num num-strong">
                      {formatCurrency(panel1Table3CloudSums.y2)}
                    </td>
                    <td className="num num-strong">
                      {formatCurrency(panel1Table3CloudSums.y3)}
                    </td>
                    <td className="num num-strong">
                      {formatCurrency(panel1Table3CloudSums.y4)}
                    </td>
                    <td className="num num-strong">
                      {formatCurrency(panel1Table3CloudSums.y5)}
                    </td>
                    <td className="num num-strong">
                      {formatCurrency(panel1Table3CloudSums.fiveYr)}
                    </td>
                  </tr>
                ) : (
                  <tr key={`t3-l-${idx}-${row.line.slice(0, 20)}`}>
                    <td />
                    <td>{row.line}</td>
                    <td className="num">
                      <input
                        type="text"
                        inputMode="decimal"
                        className="field field-money panel1-table1-total-input"
                        aria-label={`${row.line} stabilized (Y3)`}
                        value={
                          Number.isFinite(row.stabilized)
                            ? String(row.stabilized)
                            : ''
                        }
                        onChange={(e) =>
                          handlePanel3CloudStabilizedChange(idx, e.target.value)
                        }
                      />
                    </td>
                    <td className="num">{formatCurrency(row.y1)}</td>
                    <td className="num">{formatCurrency(row.y2)}</td>
                    <td className="num">{formatCurrency(row.y3)}</td>
                    <td className="num">{formatCurrency(row.y4)}</td>
                    <td className="num">{formatCurrency(row.y5)}</td>
                    <td className="num">{formatCurrency(row.fiveYr)}</td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
        <div className="panel1-capex-detail-footer">
          <button
            type="button"
            className="btn-secondary panel1-capex-hide-btn"
            aria-label="Hide OPEX (Cloud + AI) detail table"
            onClick={() => setPanel1CloudOpexDetailOpen(false)}
          >
            Hide
          </button>
        </div>
      </section>
      ) : null}

      <section className="panel-card" aria-labelledby="chart-heading">
        <h2 id="chart-heading" className="card-heading">
          Cost by year
        </h2>
        <p className="card-lead">
          Each year compares <strong>baseline</strong> on-prem OPEX (Year&nbsp;1 =
          Table&nbsp;2 <strong>annual baseline</strong> total; Years&nbsp;2–5 grow
          at the Cash flow <strong>Annual OpEx change (%)</strong>) to the{' '}
          <strong>migration scenario</strong>: stacked <strong>CAPEX</strong>, then{' '}
          <strong>OPEX (on-prem)</strong> (Table&nbsp;2 wind-down), then{' '}
          <strong>OPEX (Cloud+AI)</strong> (Table&nbsp;3), matching the cash-flow model.
        </p>
        <div className="chart-legend">
          <span className="legend-item">
            <span className="legend-swatch legend-swatch-baseline-prem" />{' '}
            Baseline On-Prem OPEX
          </span>
          <span className="legend-item">
            <span className="legend-swatch legend-swatch-p1-capex" /> CAPEX
          </span>
          <span className="legend-item">
            <span className="legend-swatch legend-swatch-p1-opex-onprem" />{' '}
            OPEX (on-prem)
          </span>
          <span className="legend-item">
            <span className="legend-swatch legend-swatch-p1-opex-cloud" />{' '}
            OPEX (Cloud+AI)
          </span>
        </div>
        <Panel1CostByYearChart
          rows={rows}
          baselineOnPremByYear={panel1BaselineOnPremForChart}
        />
      </section>
    </main>
        </div>

        <div
          className="roi-route"
          id="roi-route"
          hidden={!isRoi}
          aria-hidden={!isRoi}
          style={{ display: isRoi ? 'block' : 'none' }}
        >
          <RoiValuePanel cumulativeRoiTable={panel2CumulativeRoiTable} />
        </div>

        <div
          className="panel3-route"
          id="panel3-route"
          hidden={!isPanel3Governance}
          aria-hidden={!isPanel3Governance}
          style={{
            display: isPanel3Governance ? 'block' : 'none',
          }}
        >
          <Panel3GovernanceCompliancePanel />
        </div>

        <div
          className="panel5-route"
          id="panel5-route"
          hidden={!isPanel5CiCd}
          aria-hidden={!isPanel5CiCd}
          style={{ display: isPanel5CiCd ? 'block' : 'none' }}
        >
          <Panel5CiCd
            automationPct={automationPct}
            setAutomationPct={setAutomationPct}
            teamSize={teamSize}
            setTeamSize={setTeamSize}
          />
        </div>

        <div
          className="panel6-route"
          id="panel6-route"
          hidden={!isPanel6Performance}
          aria-hidden={!isPanel6Performance}
          style={{ display: isPanel6Performance ? 'block' : 'none' }}
        >
          <Panel6Uptime
            redundancy={redundancy}
            setRedundancy={setRedundancy}
            multiRegion={multiRegion}
            setMultiRegion={setMultiRegion}
          />
        </div>

        <div
          className="sensitivity-route"
          id="sensitivity-route"
          hidden={!isSensitivity}
          aria-hidden={!isSensitivity}
          style={{ display: isSensitivity ? 'block' : 'none' }}
        >
          <Panel7RoiSensitivity
            cumulativeRoiTable={panel2CumulativeRoiTable}
          />
        </div>

        <div
          className="adoption-route"
          id="adoption-route"
          hidden={!isAdoption}
          aria-hidden={!isAdoption}
          style={{ display: isAdoption ? 'block' : 'none' }}
        >
          <Panel8Adoption
            trainingHours={trainingHours}
            setTrainingHours={setTrainingHours}
            leadershipEngagement={leadershipEngagement}
            setLeadershipEngagement={setLeadershipEngagement}
          />
        </div>

        <div
          className="diffusion-route"
          id="diffusion-route"
          hidden={!isDiffusion}
          aria-hidden={!isDiffusion}
          style={{ display: isDiffusion ? 'block' : 'none' }}
        >
          <Panel9Diffusion
            marketingSpend={marketingSpend}
            setMarketingSpend={setMarketingSpend}
            networkEffect={networkEffect}
            setNetworkEffect={setNetworkEffect}
            marketType={marketType}
            setMarketType={setMarketType}
          />
        </div>

        <div
          className="panels-route"
          id="panels-route"
          hidden={!isPanels}
          aria-hidden={!isPanels}
          style={{ display: isPanels ? 'block' : 'none' }}
        >
          <Panel4Governance />
        </div>
        </div>
      </div>
    </div>
  )
}

export default App
