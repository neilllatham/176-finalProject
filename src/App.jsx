import { useMemo, useState } from 'react'
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
    stabilized: 900_000,
    y1: 270_000,
    y2: 675_000,
    y3: 900_000,
    y4: 927_000,
    y5: 954_810,
    fiveYr: 3_726_810,
  },
  {
    t: 'l',
    line: 'Cloud Storage & Backup (S3/Blob + Backup)',
    stabilized: 240_000,
    y1: 72_000,
    y2: 180_000,
    y3: 240_000,
    y4: 247_200,
    y5: 254_616,
    fiveYr: 993_816,
  },
  {
    t: 'l',
    line: 'Cloud Database Services (RDS, Cosmos, Managed DB)',
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
    line: 'Cloud Networking & CDN (VPN, Load Balancer, CDN)',
    stabilized: 180_000,
    y1: 54_000,
    y2: 135_000,
    y3: 180_000,
    y4: 185_400,
    y5: 190_962,
    fiveYr: 745_362,
  },
  {
    t: 'l',
    line: 'Cloud Security Services (WAF, Shield, GuardDuty)',
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
    line: 'Cloud Monitoring & Observability (Datadog, CW)',
    stabilized: 120_000,
    y1: 36_000,
    y2: 90_000,
    y3: 120_000,
    y4: 123_600,
    y5: 127_308,
    fiveYr: 496_908,
  },
  { t: 'g', label: 'SaaS & Platform Licenses' },
  {
    t: 'l',
    line: 'Core Insurance Platform SaaS (Policy/Claims/Billing)',
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
    line: 'Collaboration Suite — M365 E3 ($30/user × 1,000)',
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
    line: 'CRM Platform SaaS (Salesforce/ServiceNow)',
    stabilized: 180_000,
    y1: 54_000,
    y2: 135_000,
    y3: 180_000,
    y4: 185_400,
    y5: 190_962,
    fiveYr: 745_362,
  },
  {
    t: 'l',
    line: 'DevOps & CI/CD Tools (GitHub, Jira)',
    stabilized: 80_000,
    y1: 24_000,
    y2: 60_000,
    y3: 80_000,
    y4: 82_400,
    y5: 84_872,
    fiveYr: 331_272,
  },
  {
    t: 'l',
    line: 'Security SaaS (CASB, SIEM-as-a-Service, EDR)',
    stabilized: 240_000,
    y1: 72_000,
    y2: 180_000,
    y3: 240_000,
    y4: 247_200,
    y5: 254_616,
    fiveYr: 993_816,
  },
  { t: 'g', label: 'AI Platform & Services' },
  {
    t: 'l',
    line: 'LLM API Consumption (GPT/Claude/Gemini)',
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
    line: 'AI Platform Annual Subscription',
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
    line: 'AI Model Maintenance & Fine-Tuning',
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
    line: 'AI Chatbot Hosting & Infrastructure',
    stabilized: 120_000,
    y1: 36_000,
    y2: 90_000,
    y3: 120_000,
    y4: 123_600,
    y5: 127_308,
    fiveYr: 496_908,
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
 * Panel 7 ROI Sensitivity Explorer helpers.
 * AI uplift uses a Gaussian CDF (S-curve) per category when that category has investment
 * greater than $0; Availability multiplies Fraud & Data Mining, Reliability multiplies CX.
 * No investment in a line → no uplift for that line regardless of DQ sliders.
 * Data quality OpEx is $0 at 0% per axis; above 0%, each axis bills at
 * DATA_QUALITY_OPEX_SCALAR × (20k·e^(3.5·dq/100)) — presently 10% of that curve (~$23k/axis near 85%).
 */
/** Scalar on the reference exponential curve ($0 when slider is 0%); 10× former 1% tier. */
const DATA_QUALITY_OPEX_SCALAR = 0.1
const AI_BUDGET_CAP = 500000
const AI_MAX_UPLIFTS = { fraud: 350000, cx: 280000, dataMining: 220000 }
const AI_MAINTENANCE_RATE = 0.08
const HORIZON_YEARS = 5

/**
 * Shade band for cumulative ROI chart: YoY ΔROI = roi(t)-roi(t-1), roi(0)=0.
 * Negative cumulative ROI → under-investment; else optimal if ΔROI accelerates vs prior year.
 */
function classifyP7RoiYearZone(points, year) {
  const i = year - 1
  const pt = points[i]
  if (!pt) return 'under'
  if (pt.roi < 0) return 'under'
  if (year === 1) return 'optimal'
  const deltaCurr = pt.roi - points[i - 1].roi
  // YoY vs prior YoY gain; year 2 compares to Δ from implicit roi(0)=0 (not points[-1]).
  const deltaPrev =
    i >= 2 ? points[i - 1].roi - points[i - 2].roi : points[0].roi - 0
  return deltaCurr > deltaPrev ? 'optimal' : 'diminishing'
}

/** erf approximation from the Panel 7 spec (Abramowitz polynomial form, valid for z >= 0). */
function erfApprox(z) {
  const sign = z < 0 ? -1 : 1
  const az = Math.abs(z)
  const denom =
    1 +
    0.278393 * az +
    0.230389 * az * az +
    0.000972 * az * az * az +
    0.078108 * az * az * az * az
  return sign * (1 - 1 / Math.pow(denom, 4))
}

function aiGaussianCdf(x, mu = 100000, sigma = 80000) {
  return 0.5 * (1 + erfApprox((x - mu) / (sigma * Math.SQRT2)))
}

/** Annual OpEx for a single Data Quality axis (Availability OR Reliability). */
function dataQualityAnnualOpex(dqPct) {
  const u = Math.min(100, Math.max(0, dqPct))
  if (u <= 0) return 0
  return DATA_QUALITY_OPEX_SCALAR * (20000 * Math.exp((3.5 * u) / 100))
}

/**
 * 5-year cumulative ROI curve (year 1..5).
 * Year 0 holds the AI CapEx; each subsequent year adds baseline OpEx+CapEx,
 * AI maintenance OpEx (8% of total AI CapEx), and Data Quality OpEx for both axes.
 * Cumulative return adds each year: Budget Planning annual benefit (downtime +
 * productivity + data center avoided) plus AI uplift (FD + CX + DM).
 * Cumulative ROI at year t: (cumulativeBenefit - cumulativeCost) / cumulativeBenefit × 100.
 */
function buildAiCumulativeRoiCurve({
  fraudInvestment,
  cxInvestment,
  dataMiningInvestment,
  dataAvailability,
  dataReliability,
  baselineRows,
  baselineAnnualBenefit = 0,
}) {
  const migrationAnnual = Math.max(0, baselineAnnualBenefit)
  const baselineTotalCapex = baselineRows.reduce(
    (s, row) => s + (row?.capex ?? 0),
    0,
  )
  const baselineTotalOpex = baselineRows.reduce(
    (s, row) => s + (row?.opex ?? 0),
    0,
  )

  const rawTotal = fraudInvestment + cxInvestment + dataMiningInvestment
  const overCap = rawTotal > AI_BUDGET_CAP
  const scale = overCap && rawTotal > 0 ? AI_BUDGET_CAP / rawTotal : 1
  const fI = fraudInvestment * scale
  const cI = cxInvestment * scale
  const dI = dataMiningInvestment * scale
  const aiCapex = fI + cI + dI
  const availMult = Math.min(1, Math.max(0, dataAvailability / 100))
  const relMult = Math.min(1, Math.max(0, dataReliability / 100))

  // Availability / Reliability are multipliers only: no funded AI line → no uplift for that line.
  const fraudBenefit =
    fI <= 0
      ? 0
      : AI_MAX_UPLIFTS.fraud * aiGaussianCdf(fI) * availMult
  const cxBenefit =
    cI <= 0 ? 0 : AI_MAX_UPLIFTS.cx * aiGaussianCdf(cI) * relMult
  const dmBenefit =
    dI <= 0
      ? 0
      : AI_MAX_UPLIFTS.dataMining * aiGaussianCdf(dI) * availMult
  const annualAiBenefit = fraudBenefit + cxBenefit + dmBenefit

  const dqOpexAnnual =
    dataQualityAnnualOpex(dataAvailability) +
    dataQualityAnnualOpex(dataReliability)
  const aiMaintenanceAnnual = aiCapex * AI_MAINTENANCE_RATE

  let cumulativeCost = aiCapex
  let cumulativeBenefit = 0
  const points = []

  for (let t = 1; t <= HORIZON_YEARS; t++) {
    const baseline = baselineRows[t - 1] ?? { opex: 0, capex: 0 }
    const annualCost =
      baseline.opex + baseline.capex + aiMaintenanceAnnual + dqOpexAnnual
    cumulativeCost += annualCost
    cumulativeBenefit += annualAiBenefit + migrationAnnual
    const roi =
      cumulativeBenefit > 1e-9
        ? ((cumulativeBenefit - cumulativeCost) / cumulativeBenefit) * 100
        : 0
    points.push({ year: t, cumulativeBenefit, cumulativeCost, roi })
  }

  const aiMaintenanceFiveYr = aiMaintenanceAnnual * HORIZON_YEARS
  const dqSpendFiveYr = dqOpexAnnual * HORIZON_YEARS
  /** 5 yr AI maintenance (8%) + 5 yr Data Quality OpEx (both sliders); shown as Total AI OpEx. */
  const totalAiOpex5 = aiMaintenanceFiveYr + dqSpendFiveYr
  const totalAiCostY5 = aiCapex + totalAiOpex5
  const totalCostY5 =
    points.length > 0 ? points[points.length - 1].cumulativeCost : aiCapex

  return {
    points,
    totals: {
      aiCapex,
      baselineTotalCapex,
      baselineTotalOpex,
      aiMaintenanceFiveYr,
      dqSpendFiveYr,
      totalAiOpex5,
      totalAiCostY5,
      totalCostY5,
      annualAiBenefit,
      fraudBenefit,
      cxBenefit,
      dmBenefit,
      dqOpexAnnual,
      aiMaintenanceAnnual,
      rawTotal,
      overCap,
      scale,
    },
  }
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
 * Panel 1 — Cost by year: per fiscal year, baseline on-prem bar + migration total
 * as a stacked bar (CAPEX bottom, combined OPEX top).
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
      aria-label="Cost by year: baseline on-prem OPEX versus migration CAPEX plus combined OPEX"
    >
      <title>Annual cost — baseline versus migration stacked total</title>
      <defs>
        <linearGradient id="panel1GradientBaselinePrem" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#1e40af" />
        </linearGradient>
        <linearGradient id="panel1GradientCapexBar" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fb923c" />
          <stop offset="100%" stopColor="#c2410c" />
        </linearGradient>
        <linearGradient id="panel1GradientOpexCombinedBar" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#93c5fd" />
          <stop offset="100%" stopColor="#60a5fa" />
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
        const hhOp = innerH * (row.opex / maxY)
        const yCapTop = yBaseline - hhCap
        const yOpTop = yCapTop - hhOp
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
              y={yOpTop}
              width={barW}
              height={Math.max(0, hhOp)}
              rx={3}
              className="chart-bar panel1-chart-bar-opex"
              fill="url(#panel1GradientOpexCombinedBar)"
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
    value: '99.2%',
    description: 'Current SLA (Target: 99.95% post-migration)',
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

/* ─────────────────────────────────────────────
   PANEL 4 – Governance & SLA
───────────────────────────────────────────── */
function Panel4Governance({ slaUptime }) {
  const slaRows = [
    { metric: 'Target uptime SLA', value: '99.9%', note: `≤ 8.76 hrs downtime/yr · Simulator: ${slaUptime.toFixed(3)}% achieved` },
    { metric: 'Incident response (P1)', value: '< 15 min', note: 'Paging + war-room within 15 min' },
    { metric: 'Incident response (P2)', value: '< 1 hr', note: 'Business-hours acknowledgement' },
    { metric: 'Planned maintenance window', value: 'Sun 02:00–04:00 UTC', note: 'Monthly, 4-week notice required' },
    { metric: 'Change-freeze periods', value: 'Last 5 business days of quarter', note: 'No prod deploys without CAB approval' },
  ]

  const committeeItems = [
    { cadence: 'Monthly', body: 'Cloud Steering Committee', agenda: 'Budget actuals vs forecast, roadmap review, SLA scorecard' },
    { cadence: 'Weekly', body: 'Engineering Leadership Sync', agenda: 'Pipeline health, incident retrospectives, upcoming deployments' },
    { cadence: 'Quarterly', body: 'Executive Business Review', agenda: 'Strategic alignment, vendor performance, risk posture' },
  ]

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

      {/* Decision structure */}
      <section className="panel-card" aria-labelledby="p4-committee-heading">
        <h2 id="p4-committee-heading" className="card-heading">Decision Structure</h2>
        <p className="card-lead">
          Three governance bodies provide oversight at different cadences.
          The Cloud Steering Committee meets monthly and holds final authority
          over budget deviations and architecture decisions.
        </p>
        <div className="p4-committee-grid">
          {committeeItems.map((c) => (
            <div key={c.body} className="p4-committee-card">
              <span className="p4-cadence-badge">{c.cadence}</span>
              <p className="p4-committee-name">{c.body}</p>
              <p className="p4-committee-agenda">{c.agenda}</p>
            </div>
          ))}
        </div>
      </section>

      {/* SLA table */}
      <section className="panel-card" aria-labelledby="p4-sla-heading">
        <h2 id="p4-sla-heading" className="card-heading">SLA Terms</h2>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Metric</th>
                <th scope="col">Commitment</th>
                <th scope="col">Notes</th>
              </tr>
            </thead>
            <tbody>
              {slaRows.map((r) => (
                <tr key={r.metric}>
                  <td>{r.metric}</td>
                  <td className="num-strong">{r.value}</td>
                  <td className="p4-sla-note">{r.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}

/* ─────────────────────────────────────────────
   PANEL 5 – CI/CD Pipeline Efficiency (cloud migration simulator)
───────────────────────────────────────────── */
function Panel5CiCd({ automationPct, setAutomationPct, teamSize, setTeamSize }) {
  // Model: baseline deploy frequency = 2/week per 5 devs
  // automation > 70% unlocks a step-change multiplier
  const baseFreq = (teamSize / 5) * 2
  const autoFactor = automationPct >= 70
    ? 1.5 + ((automationPct - 70) / 30) * 0.4
    : 0.6 + (automationPct / 70) * 0.4
  const deployFreq = Math.round(baseFreq * autoFactor * 10) / 10

  // Failure rate: baseline 25%, drops with automation
  const baseFailure = 25
  const failureReduction = automationPct >= 70
    ? 0.4 + ((automationPct - 70) / 30) * 0.2
    : (automationPct / 70) * 0.4
  const failureRate = Math.round(Math.max(3, baseFailure * (1 - failureReduction)) * 10) / 10

  let healthStatus
  let healthClass
  if (automationPct >= 70) {
    healthStatus = 'Healthy'
    healthClass = 'p5-health-green'
  } else if (automationPct >= 40) {
    healthStatus = 'Improving'
    healthClass = 'p5-health-amber'
  } else {
    healthStatus = 'At Risk'
    healthClass = 'p5-health-red'
  }

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
              max="50"
              value={teamSize}
              onChange={(e) => setTeamSize(Number(e.target.value))}
              className="p5-range"
              aria-label="Team size"
            />
            <div className="p5-range-labels">
              <span>2</span><span>26</span><span>50</span>
            </div>
          </div>
        </div>
      </section>

      <section className="panel-card" aria-labelledby="p5-results-heading">
        <h2 id="p5-results-heading" className="card-heading">Simulation Results</h2>
        <div className="p5-results-grid">
          <div className={`p5-result-tile ${healthClass}`}>
            <span className="p5-result-label">Deployment Health</span>
            <span className="p5-result-value p5-health-value">{healthStatus}</span>
            <span className="p5-result-sub">
              {automationPct >= 70
                ? `${automationPct}% automation → step-change unlocked`
                : `Raise automation above 70% to unlock step-change gains`}
            </span>
          </div>
          <div className="p5-result-tile p5-neutral">
            <span className="p5-result-label">Deploy Frequency</span>
            <span className="p5-result-value">{deployFreq}<span className="p5-result-unit">/wk</span></span>
            <span className="p5-result-sub">Across {teamSize}-person team</span>
          </div>
          <div className="p5-result-tile p5-neutral">
            <span className="p5-result-label">Failure Rate</span>
            <span className="p5-result-value">{failureRate}<span className="p5-result-unit">%</span></span>
            <span className="p5-result-sub">Change failure rate vs {baseFailure}% baseline</span>
          </div>
        </div>
      </section>

      {automationPct >= 70 && (
        <div className="p5-insight-banner" role="status">
          <strong>Key insight:</strong> With {automationPct}% automation, deploy frequency is roughly{' '}
          {Math.round(((deployFreq / (baseFreq * 0.6)) - 1) * 100)}% higher and failure rate is{' '}
          {Math.round((1 - failureRate / baseFailure) * 100)}% lower compared to a
          fully manual baseline.
        </div>
      )}
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
function P7sCumulativeRoiChart({ points }) {
  const w = 640
  const h = 320
  const padL = 64
  const padR = 28
  const padT = 28
  const padB = 54
  const innerW = w - padL - padR
  const innerH = h - padT - padB

  const roiValues = points.map((p) => p.roi)
  const rawMin = Math.min(0, ...roiValues)
  const rawMax = Math.max(0, ...roiValues)
  const span = Math.max(rawMax - rawMin, 1)
  const NICE = [10, 25, 50, 100, 200, 500, 1000]
  const step = NICE.find((s) => span / s <= 6) ?? 1000
  const yMin = Math.floor(rawMin / step) * step
  const yMax = Math.ceil(rawMax / step) * step
  const yRange = Math.max(yMax - yMin, 1)

  const yTicks = []
  for (let v = yMin; v <= yMax + 1e-9; v += step) yTicks.push(v)

  function xAt(year) {
    return padL + ((year - 1) / (HORIZON_YEARS - 1)) * innerW
  }
  function yAt(roi) {
    return padT + innerH * (1 - (roi - yMin) / yRange)
  }

  const polyline = points.map((p) => `${xAt(p.year)},${yAt(p.roi)}`).join(' ')
  const breakevenY = yAt(0)
  const horizonX = xAt(HORIZON_YEARS)

  const zoneBands = []
  const zoneClasses = {
    under: 'p7s-zone-under',
    optimal: 'p7s-zone-optimal',
    diminishing: 'p7s-zone-diminishing',
  }
  const zoneLabels = {
    under: 'Under-Investment',
    optimal: 'Optimal',
    diminishing: 'Diminishing',
  }
  for (let y = 1; y <= HORIZON_YEARS; y++) {
    const xl =
      y === 1 ? padL : (xAt(y - 1) + xAt(y)) / 2
    const xr =
      y === HORIZON_YEARS
        ? padL + innerW
        : (xAt(y) + xAt(y + 1)) / 2
    const zone = classifyP7RoiYearZone(points, y)
    zoneBands.push({ y, xl, xr, zone })
  }

  return (
    <svg
      className="p7s-chart"
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="ROI break-even: cumulative ROI vs. 0% reference, Budget Planning savings and AI uplift vs. cumulative cost"
    >
      <title>
        ROI break-even: cumulative return vs. cumulative cost (0% = break-even)
      </title>

      <g className="p7s-zone-layer" aria-hidden="true">
        {zoneBands.map(({ y, xl, xr, zone }) => (
          <g key={`z-${y}`}>
            <rect
              x={xl}
              y={padT}
              width={xr - xl}
              height={innerH}
              className={zoneClasses[zone]}
            />
            <text
              x={xl + (xr - xl) / 2}
              y={padT + 16}
              textAnchor="middle"
              className="p7s-zone-label"
            >
              {zoneLabels[zone]}
            </text>
            <title>
              Year {y}:{' '}
              {zone === 'under'
                ? 'Under-Investment (Negative ROI)'
                : zone === 'optimal'
                  ? 'Optimal Return Zone'
                  : 'Diminishing Returns'}
            </title>
          </g>
        ))}
      </g>

      {yTicks.map((v) => {
        const y = yAt(v)
        return (
          <g key={`yg-${v}`}>
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
              {`${v}%`}
            </text>
          </g>
        )
      })}

      {points.map((p) => {
        const xv = xAt(p.year)
        return (
          <g key={`xt-${p.year}`}>
            <line
              x1={xv}
              y1={padT + innerH}
              x2={xv}
              y2={padT + innerH + 6}
              className="chart-axis-tick-line"
            />
            <text
              x={xv}
              y={padT + innerH + 22}
              textAnchor="middle"
              className="chart-axis-label chart-axis-year"
            >
              {p.year}
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
        ROI vs. break-even (%)
      </text>
      <text
        x={padL + innerW / 2}
        y={h - 8}
        textAnchor="middle"
        className="chart-axis-label"
      >
        Year
      </text>

      <line
        x1={padL}
        y1={breakevenY}
        x2={padL + innerW}
        y2={breakevenY}
        className="p7s-breakeven-line"
      />
      <text
        x={padL + innerW - 6}
        y={breakevenY - 6}
        textAnchor="end"
        className="chart-axis-label p7s-breakeven-label"
      >
        Break-even (0%)
      </text>

      <line
        x1={horizonX}
        y1={padT}
        x2={horizonX}
        y2={padT + innerH}
        className="p7s-horizon-line"
      />
      <text
        x={horizonX - 6}
        y={padT + 12}
        textAnchor="end"
        className="chart-axis-label p7s-horizon-label"
      >
        Year 5 horizon
      </text>

      <polyline
        className="p7s-roi-line"
        points={polyline}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {points.map((p) => (
        <circle
          key={`pt-${p.year}`}
          cx={xAt(p.year)}
          cy={yAt(p.roi)}
          r={4}
          className="p7s-roi-dot"
        />
      ))}
    </svg>
  )
}

function Panel7RoiSensitivity({
  rows,
  /** Sum of downtime + productivity + data center avoided (Budget Planning annual benefit). */
  baselineAnnualBenefit,
  fraudInvestment,
  setFraudInvestment,
  cxInvestment,
  setCxInvestment,
  dataMiningInvestment,
  setDataMiningInvestment,
  dataAvailability,
  setDataAvailability,
  dataReliability,
  setDataReliability,
}) {
  const { points, totals } = useMemo(
    () =>
      buildAiCumulativeRoiCurve({
        fraudInvestment,
        cxInvestment,
        dataMiningInvestment,
        dataAvailability,
        dataReliability,
        baselineRows: rows,
        baselineAnnualBenefit,
      }),
    [
      fraudInvestment,
      cxInvestment,
      dataMiningInvestment,
      dataAvailability,
      dataReliability,
      rows,
      baselineAnnualBenefit,
    ],
  )

  const breakEvenYear = useMemo(() => {
    const hit = points.find((p) => p.roi > 0)
    return hit ? hit.year : null
  }, [points])
  const fiveYearRoi = points[points.length - 1]?.roi ?? 0
  const fiveYearPositive = fiveYearRoi >= 0

  const combinedAnnualBenefit =
    baselineAnnualBenefit + totals.annualAiBenefit

  const p7SummaryInsight = useMemo(() => {
    if (breakEvenYear == null) {
      return '⚠️ AI investment does not break even within 5 years. Consider increasing investment or improving data quality.'
    }
    if (breakEvenYear <= 2) {
      return '✅ Strong ROI trajectory. Investment breaks even early with high long-term returns.'
    }
    if (breakEvenYear <= 4) {
      return '📊 Moderate ROI. Investment recovers in mid-term. Monitor data quality to accelerate returns.'
    }
    return '⚠️ ROI barely breaks even by year 5. Reassess investment allocation across the three AI categories.'
  }, [breakEvenYear])

  return (
    <main className="migration-panel" id="panel7-roi-sensitivity">
      <header className="panel-header panel-header-context">
        <p className="migration-eyebrow">Cloud migration simulator · Section 7</p>
        <p className="panel-title-context">Panel 7: ROI Sensitivity Explorer</p>
        <p className="panel-subtitle">
          Simulate how AI investment across Fraud Detection, CX Enhancement,
          and Data Mining — combined with Data Quality improvements — affects
          5-year cumulative ROI on the cloud migration project.
        </p>
      </header>

      <section className="panel-card" aria-labelledby="p7s-ai-heading">
        <h2 id="p7s-ai-heading" className="card-heading">
          AI Investment (CapEx, Year 0)
        </h2>
        <p className="card-lead">
          Allocate up to $500,000 across the three custom AI initiatives.
          Marginal benefit per category peaks at $100,000 (Gaussian S-curve).
          A recurring 8% annual maintenance fee is applied as OpEx in years 1–5.
        </p>
        <div className="p5-sliders">
          <div className="p5-slider-row">
            <label className="p5-slider-label" htmlFor="p7s-ai-fraud">
              Fraud Detection: <strong>{formatCurrency(fraudInvestment)}</strong>
            </label>
            <input
              id="p7s-ai-fraud"
              type="range"
              min="0"
              max="500000"
              step="5000"
              value={fraudInvestment}
              onChange={(e) => setFraudInvestment(Number(e.target.value))}
              className="p5-range"
              aria-label="Fraud Detection investment in dollars"
            />
            <div className="p5-range-labels">
              <span>$0</span><span>$250K</span><span>$500K</span>
            </div>
          </div>
          <div className="p5-slider-row">
            <label className="p5-slider-label" htmlFor="p7s-ai-cx">
              CX Enhancement: <strong>{formatCurrency(cxInvestment)}</strong>
            </label>
            <input
              id="p7s-ai-cx"
              type="range"
              min="0"
              max="500000"
              step="5000"
              value={cxInvestment}
              onChange={(e) => setCxInvestment(Number(e.target.value))}
              className="p5-range"
              aria-label="CX Enhancement investment in dollars"
            />
            <div className="p5-range-labels">
              <span>$0</span><span>$250K</span><span>$500K</span>
            </div>
          </div>
          <div className="p5-slider-row">
            <label className="p5-slider-label" htmlFor="p7s-ai-dm">
              Data Mining:{' '}
              <strong>{formatCurrency(dataMiningInvestment)}</strong>
            </label>
            <input
              id="p7s-ai-dm"
              type="range"
              min="0"
              max="500000"
              step="5000"
              value={dataMiningInvestment}
              onChange={(e) => setDataMiningInvestment(Number(e.target.value))}
              className="p5-range"
              aria-label="Data Mining investment in dollars"
            />
            <div className="p5-range-labels">
              <span>$0</span><span>$250K</span><span>$500K</span>
            </div>
          </div>
        </div>
        <div
          className={`p7s-cap-meter${totals.overCap ? ' p7s-cap-meter-warning' : ''}`}
          role="status"
          aria-live="polite"
        >
          <span className="p7s-cap-meter-label">
            Total AI Investment:{' '}
            <strong>{formatCurrency(totals.rawTotal)}</strong> /{' '}
            {formatCurrency(AI_BUDGET_CAP)}
          </span>
          {totals.overCap ? (
            <p className="p7s-cap-meter-warning-text">
              Total AI investment cannot exceed $500,000. Please reduce one or
              more sliders.
            </p>
          ) : null}
        </div>
      </section>

      <section className="panel-card" aria-labelledby="p7s-dq-heading">
        <h2 id="p7s-dq-heading" className="card-heading">
          Data Quality (recurring OpEx)
        </h2>
        <p className="card-lead">
          Data Availability multiplies Fraud Detection and Data Mining uplift
          only when that category has AI investment above $0; Data Reliability
          multiplies CX uplift only when CX has investment above $0. Without that base
          investment, raising Availability or Reliability does not add annual AI
          benefit (OpEx for DQ may still apply). At 0% an axis adds no Data
          Quality OpEx; above 0%, cost rises exponentially toward the 85%
          inflection.
        </p>
        <div className="p5-sliders">
          <div className="p5-slider-row">
            <label className="p5-slider-label" htmlFor="p7s-dq-availability">
              Data Availability: <strong>{dataAvailability}%</strong>
            </label>
            <input
              id="p7s-dq-availability"
              type="range"
              min="0"
              max="100"
              step="1"
              value={dataAvailability}
              onChange={(e) => setDataAvailability(Number(e.target.value))}
              className="p5-range"
              aria-label="Data Availability percentage"
            />
            <div className="p5-range-labels">
              <span>0%</span><span>50%</span><span>100%</span>
            </div>
          </div>
          <div className="p5-slider-row">
            <label className="p5-slider-label" htmlFor="p7s-dq-reliability">
              Data Reliability: <strong>{dataReliability}%</strong>
            </label>
            <input
              id="p7s-dq-reliability"
              type="range"
              min="0"
              max="100"
              step="1"
              value={dataReliability}
              onChange={(e) => setDataReliability(Number(e.target.value))}
              className="p5-range"
              aria-label="Data Reliability percentage"
            />
            <div className="p5-range-labels">
              <span>0%</span><span>50%</span><span>100%</span>
            </div>
          </div>
        </div>
      </section>

      <section className="panel-card" aria-labelledby="p7s-chart-heading">
        <h2 id="p7s-chart-heading" className="card-heading">
          ROI break-even
        </h2>
        <p className="card-lead">
          Cumulative return each year adds Budget Planning annual benefits
          (downtime, productivity, and data center savings) plus the AI uplift
          (Fraud, CX, Data Mining). ROI is{' '}
          <strong>
            (cumulative return − cumulative cost) ÷ cumulative return
          </strong>
          ; the dashed line marks 0% (break-even). Values above 0% mean
          cumulative return exceeds cumulative cost at that year-end. Shaded
          bands classify each year&apos;s trajectory (negative ROI, accelerating
          vs. diminishing positive gains).
        </p>
        <div className="chart-legend">
          <span className="legend-item">
            <span className="legend-line legend-line-roi-curve" /> Cumulative
            ROI
          </span>
          <span className="legend-item">
            <span className="legend-line legend-line-roi-breakeven" /> Break-even (0%)
          </span>
        </div>
        <div className="chart-legend p7s-zone-legend" aria-label="ROI background zones">
          <span className="legend-item">
            <span className="legend-swatch legend-swatch-p7-zone-under" />
            Under-Investment (Negative ROI)
          </span>
          <span className="legend-item">
            <span className="legend-swatch legend-swatch-p7-zone-optimal" />
            Optimal Return Zone
          </span>
          <span className="legend-item">
            <span className="legend-swatch legend-swatch-p7-zone-diminishing" />
            Diminishing Returns
          </span>
        </div>
        <P7sCumulativeRoiChart points={points} />
      </section>

      <p className="p7s-summary-insight" role="status">
        {p7SummaryInsight}
      </p>

      <section className="panel-card p7s-stat-card" aria-labelledby="p7s-stats-heading">
        <h2 id="p7s-stats-heading" className="card-heading">
          Sensitivity summary
        </h2>
        <div className="p7s-stat-grid">
          <div className="p7s-stat-box">
            <span className="p7s-stat-label">Total AI CapEx</span>
            <span className="p7s-stat-value">
              {formatCurrency(totals.aiCapex)}
            </span>
            <span className="p7s-stat-sub">Year 0 one-time</span>
          </div>
          <div className="p7s-stat-box">
            <span className="p7s-stat-label">Total AI OpEx</span>
            <span className="p7s-stat-value">
              {formatCurrency(totals.totalAiOpex5)}
            </span>
            <span className="p7s-stat-sub">
              8% maintenance × 5 years (cumulative) + Cumulative 5 yrs
              (Availability + Reliability sliders)
            </span>
          </div>
          <div className="p7s-stat-box">
            <span className="p7s-stat-label">Total AI Cost</span>
            <span className="p7s-stat-value">
              {formatCurrency(totals.totalAiCostY5)}
            </span>
            <span className="p7s-stat-sub">
              AI CapEx (yr 0) + Total AI OpEx row (maint + DQ, 5 yrs)
            </span>
          </div>
          <div className="p7s-stat-box">
            <span className="p7s-stat-label">Annual AI Benefit</span>
            <span className="p7s-stat-value">
              {`${formatCurrency(totals.annualAiBenefit)}/yr`}
            </span>
            <span className="p7s-stat-sub">
              Funded FD / CX / DM only · DQ scales those uplifts
            </span>
          </div>
          <div className="p7s-stat-box">
            <span className="p7s-stat-label">Total Capex</span>
            <span className="p7s-stat-value">
              {formatCurrency(totals.baselineTotalCapex)}
            </span>
            <span className="p7s-stat-sub">
              5-year baseline (Budget Planning table)
            </span>
          </div>
          <div className="p7s-stat-box">
            <span className="p7s-stat-label">Total OpEx</span>
            <span className="p7s-stat-value">
              {formatCurrency(totals.baselineTotalOpex)}
            </span>
            <span className="p7s-stat-sub">
              5-year baseline (Budget Planning table)
            </span>
          </div>
          <div className="p7s-stat-box">
            <span className="p7s-stat-label">Total Cost</span>
            <span className="p7s-stat-value">
              {formatCurrency(totals.totalCostY5)}
            </span>
            <span className="p7s-stat-sub">
              Baseline{' '}
              {formatCurrency(
                totals.baselineTotalCapex + totals.baselineTotalOpex,
              )}{' '}
              + program{' '}
              {formatCurrency(totals.aiCapex + totals.totalAiOpex5)} — year 0 AI
              CapEx + 5-yr Total AI OpEx (maint + DQ)
            </span>
          </div>
          <div className="p7s-stat-box">
            <span className="p7s-stat-label">Annual Benefit</span>
            <span className="p7s-stat-value">
              {`${formatCurrency(combinedAnnualBenefit)}/yr`}
            </span>
            <span className="p7s-stat-sub">
              Budget Planning savings + Annual AI Benefit
            </span>
          </div>
          <div className="p7s-stat-box">
            <span className="p7s-stat-label">5-Year ROI</span>
            <span
              className={`p7s-stat-value ${fiveYearPositive ? 'p7s-stat-positive' : 'p7s-stat-negative'}`}
            >
              {`${fiveYearRoi >= 0 ? '+' : ''}${fiveYearRoi.toFixed(1)}%`}
            </span>
            <span className="p7s-stat-sub">
              At year 5: (cumulative return − cumulative cost) ÷ cumulative
              return
            </span>
          </div>
          <div className="p7s-stat-box">
            <span className="p7s-stat-label">Break-Even Year</span>
            <span className="p7s-stat-value">
              {breakEvenYear ?? 'Not reached in 5 years'}
            </span>
            <span className="p7s-stat-sub">
              First year cumulative return exceeds cumulative cost
            </span>
          </div>
          <div className="p7s-stat-placeholder" aria-hidden="true" />
          <div className="p7s-stat-placeholder" aria-hidden="true" />
        </div>
      </section>
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
    line: 'Workforce Productivity Value (12% efficiency gain × 30% captured, 1,000 FTE × $85K avg)',
    stabilized: 3_060_000,
    y1: 612_000,
    y2: 1_683_000,
    y3: 3_060_000,
    y4: 3_304_800,
    y5: 3_427_200,
    fiveYr: 12_087_000,
  },
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
    line: 'New Digital Channel Revenue (Digital-First Policies)',
    stabilized: 2_500_000,
    y1: 250_000,
    y2: 1_000_000,
    y3: 2_500_000,
    y4: 2_750_000,
    y5: 3_000_000,
    fiveYr: 9_500_000,
  },
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
    t: 'l',
    line: 'AI-Driven Cross-Sell & Upsell Revenue',
    stabilized: 750_000,
    y1: 75_000,
    y2: 300_000,
    y3: 750_000,
    y4: 825_000,
    y5: 900_000,
    fiveYr: 2_850_000,
  },
  {
    t: 'total',
    line: 'TOTAL TANGIBLE RETURNS',
    y1: 1_538_504,
    y2: 4_762_136,
    y3: 9_817_520,
    y4: 10_687_922,
    y5: 11_335_622,
    fiveYr: 38_141_704,
  },
]

/** Table 5 — Intangible Returns (v2 Corrected). */
const PANEL2_TABLE5_INTANGIBLE_ROWS = [
  { t: 'g', label: 'Brand & Reputation' },
  {
    t: 'l',
    line: 'NPS Improvement → Revenue Uplift (2% × $250M × 40% confidence weight)',
    method: 'Incremental Earnings',
    y1: 500_000,
    y2: 1_200_000,
    y3: 2_000_000,
    y4: 2_200_000,
    y5: 2_400_000,
    fiveYr: 8_300_000,
  },
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
    line: 'Faster Regulatory Approval → Earlier Product Revenue (2 products × $500K × 2 months)',
    method: 'Cost Avoidance',
    y1: null,
    y2: 400_000,
    y3: 2_000_000,
    y4: 2_000_000,
    y5: 2_000_000,
    fiveYr: 6_400_000,
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
  { t: 'g', label: 'Talent Attraction & Retention' },
  {
    t: 'l',
    line: 'IT Staff Turnover Reduction (18% → 10% × 80 FTE × 1.5× replacement cost)',
    method: 'Cost Avoidance',
    y1: 200_000,
    y2: 700_000,
    y3: 1_152_000,
    y4: 1_200_000,
    y5: 1_248_000,
    fiveYr: 4_500_000,
  },
  {
    t: 'l',
    line: 'Reduced Contractor & Agency Reliance',
    method: 'Cost Avoidance',
    y1: null,
    y2: null,
    y3: 398_000,
    y4: 400_000,
    y5: 402_000,
    fiveYr: 1_200_000,
  },
  { t: 'g', label: 'Innovation Velocity' },
  {
    t: 'l',
    line: 'Earlier Product Launch Revenue (3-month acceleration × 2 products/yr × $2M revenue)',
    method: 'Incremental Earnings',
    y1: null,
    y2: 300_000,
    y3: 1_000_000,
    y4: 1_200_000,
    y5: 1_400_000,
    fiveYr: 3_900_000,
  },
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
  { t: 'g', label: 'Data-Driven Decision Making' },
  {
    t: 'l',
    line: 'Loss Ratio Improvement via AI Underwriting (1.5 pts × $250M GWP)',
    method: 'Incremental Earnings',
    y1: null,
    y2: 375_000,
    y3: 3_750_000,
    y4: 3_900_000,
    y5: 4_062_500,
    fiveYr: 12_087_500,
  },
  {
    t: 'l',
    line: 'AI Fraud Detection — Claims Leakage Reduction (0.5% of claims base)',
    method: 'Incremental Earnings',
    y1: null,
    y2: 125_000,
    y3: 850_000,
    y4: 900_000,
    y5: 937_500,
    fiveYr: 2_812_500,
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
    y1: 1_100_000,
    y2: 4_400_000,
    y3: 15_297_480,
    y4: 16_602_480,
    y5: 17_752_480,
    fiveYr: 55_152_440,
  },
]

/** Table 6 excerpt — tangible + intangible only; totals sum the two rows. */
const PANEL2_TABLE6_TI_SUMMARY_ROWS = [
  {
    t: 'd',
    detailKey: 'tangible',
    line: 'Tangible Returns (Revenue & Productivity)',
    y1: 1_538_504,
    y2: 4_762_136,
    y3: 9_817_520,
    y4: 10_687_922,
    y5: 11_335_622,
    fiveYr: 38_141_704,
  },
  {
    t: 'd',
    detailKey: 'intangible',
    line: 'Intangible Returns (Quantified)',
    y1: 1_100_000,
    y2: 4_400_000,
    y3: 15_297_480,
    y4: 16_602_480,
    y5: 17_752_480,
    fiveYr: 55_152_440,
  },
  {
    t: 'total',
    line: 'Total returns',
    y1: 2_638_504,
    y2: 9_162_136,
    y3: 25_115_000,
    y4: 27_290_402,
    y5: 29_088_102,
    fiveYr: 93_294_144,
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

/** B = baseline − (on-prem + cloud OPEX) + tangible + intangible; C = B − CAPEX */
function buildPanel2CumulativeRoiSeries(
  capexByYear,
  baselineOnPremByYear,
  onPremiseOpexByYear,
  cloudAiOpexByYear,
  tangibleReturnsByYear,
  intangibleReturnsByYear,
) {
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
  const cumulativeRoiFraction = []
  let runCapex = 0
  let runNet = 0
  YEARS.forEach((_, i) => {
    runCapex += A[i]
    cumulCapex.push(runCapex)
    runNet += net[i]
    cumulNet.push(runNet)
    cumulativeRoiFraction.push(
      runCapex !== 0 && Number.isFinite(runNet / runCapex)
        ? runNet / runCapex
        : null,
    )
  })
  const totalCapex = A.reduce((s, v) => s + v, 0)
  const totalB = B.reduce((s, v) => s + v, 0)
  const totalNet = net.reduce((s, v) => s + v, 0)
  const finalCumulCapex = cumulCapex[YEARS.length - 1] ?? 0
  const finalCumulNet = cumulNet[YEARS.length - 1] ?? 0
  const fiveYrRoiFrac =
    finalCumulCapex !== 0 && Number.isFinite(finalCumulNet / finalCumulCapex)
      ? finalCumulNet / finalCumulCapex
      : null

  return {
    capex: A,
    cumulCapex,
    totalReturns: B,
    netCashFlow: net,
    cumulNet,
    cumulativeRoiFraction,
    totals: {
      capex: totalCapex,
      cumulCapex: finalCumulCapex,
      totalReturns: totalB,
      netCashFlow: totalNet,
      cumulNet: finalCumulNet,
      cumulativeRoiFraction: fiveYrRoiFrac,
    },
  }
}

function formatPanel2CumulativeRoiRatio(fraction) {
  if (fraction == null || !Number.isFinite(fraction)) return '—'
  return `${(fraction * 100).toFixed(1)}%`
}

/** Panel 2 — dual axis: cumulative ROI % (left) vs cumul. net cash flow bars (right scale = $ million). */
function Panel2RoiDualAxisChart({ cumulativeRoiTable }) {
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
    (_, i) => (cumulativeRoiTable.cumulNet[i] ?? 0) / 1_000_000,
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
  const [
    panel2CumulativeRoiTableVisible,
    setPanel2CumulativeRoiTableVisible,
  ] = useState(false)

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

      <section
        className="panel-card"
        aria-labelledby="panel2-roi-chart-heading"
      >
        <div className="panel2-roi-chart-header-row">
          <h2
            id="panel2-roi-chart-heading"
            className="card-heading panel2-roi-chart-heading"
          >
            ROI chart
          </h2>
          <div className="panel2-roi-chart-toggle-wrap">
            <button
              type="button"
              role="switch"
              aria-checked={panel2CumulativeRoiTableVisible}
              aria-label={
                panel2CumulativeRoiTableVisible
                  ? 'Hide cumulative ROI table'
                  : 'Show cumulative ROI table'
              }
              className={`p6-toggle${panel2CumulativeRoiTableVisible ? ' p6-toggle-on' : ''}`}
              onClick={() =>
                setPanel2CumulativeRoiTableVisible((v) => !v)
              }
            >
              <span className="p6-toggle-knob" />
            </button>
          </div>
        </div>
        <p className="card-lead">
          Same numbers as <strong>Cumulative ROI table</strong>
          {' '}(use the toggle to show it){' '}:
          cumulative ROI (<strong>%</strong>, left scale, line) versus cumulative
          net cash flow (<strong>million USD</strong>, right scale, bars).
        </p>
        <div className="chart-legend panel2-roi-chart-legend">
          <span className="legend-item">
            <span className="legend-line panel2-roi-chart-legend-line" />{' '}
            Cumulative ROI
          </span>
          <span className="legend-item">
            <span className="legend-swatch panel2-roi-chart-legend-swatch" />{' '}
            Cumul. net cash flow
          </span>
        </div>
        <Panel2RoiDualAxisChart cumulativeRoiTable={cumulativeRoiTable} />
      </section>

      {panel2CumulativeRoiTableVisible ? (
      <section
        className="panel-card"
        aria-labelledby="panel2-cumulative-roi-heading"
      >
        <h2 id="panel2-cumulative-roi-heading" className="card-heading">
          Cumulative ROI table
        </h2>
        <p className="card-lead">
          <strong>A</strong> is modeled CAPEX (Panel&nbsp;1 Table&nbsp;1).{' '}
          <strong>Baseline On-Prem OPEX</strong> is 100% of Table&nbsp;2 annual
          baseline total in Year&nbsp;1, then compounds by the Cash flow{' '}
          <strong>Annual OpEx change (%)</strong> each year.{' '}
          <strong>B. Total Returns</strong> =
          baseline − (Panel&nbsp;1 <strong>OPEX (On-Premise)</strong>
          {' + '}
          <strong>OPEX (Cloud + AI)</strong>)
          {' '}
          + tangible + intangible yearly totals from Panel&nbsp;2 Tables&nbsp;4
          &amp; 5. <strong>C</strong> =
          <strong>B − A</strong>. Dollar rows are USD;{' '}
          <strong>Cumulative ROI</strong> =
          cumulative <strong>C</strong>
          ÷ cumulative <strong>A</strong> (&times;100%).
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
                <th scope="row">Cumul. CAPEX</th>
                {cumulativeRoiTable.cumulCapex.map((v, yi) => (
                  <td key={yi} className="num">
                    {formatCurrency(v)}
                  </td>
                ))}
                <td className="num">
                  {formatCurrency(cumulativeRoiTable.totals.cumulCapex)}
                </td>
              </tr>
              <tr>
                <th scope="row">B. Total Returns</th>
                {cumulativeRoiTable.totalReturns.map((v, yi) => (
                  <td key={yi} className="num">
                    {formatCurrency(v)}
                  </td>
                ))}
                <td className="num">
                  {formatCurrency(cumulativeRoiTable.totals.totalReturns)}
                </td>
              </tr>
              <tr>
                <th scope="row">C. Net Cash Flow (B − A)</th>
                {cumulativeRoiTable.netCashFlow.map((v, yi) => (
                  <td key={yi} className="num">
                    {formatCurrency(v)}
                  </td>
                ))}
                <td className="num">
                  {formatCurrency(cumulativeRoiTable.totals.netCashFlow)}
                </td>
              </tr>
              <tr>
                <th scope="row">Cumul. Net Cash Flow</th>
                {cumulativeRoiTable.cumulNet.map((v, yi) => (
                  <td key={yi} className="num">
                    {formatCurrency(v)}
                  </td>
                ))}
                <td className="num">
                  {formatCurrency(cumulativeRoiTable.totals.cumulNet)}
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
      ) : null}
    </main>
  )
}

function App() {
  const [activeView, setActiveView] = useState('home')
  // Panel 5 & 6 state lifted to App for cross-panel data flow
  const [automationPct, setAutomationPct] = useState(50)
  const [teamSize, setTeamSize] = useState(10)
  const [redundancy, setRedundancy] = useState(3)
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

  const [annualDowntimeSavings] = useState('300000')
  const [annualProductivitySavings] = useState('200000')
  const [annualDataCenterAvoided] = useState('250000')

  const [aiFraudInvestment, setAiFraudInvestment] = useState(80000)
  const [aiCxInvestment, setAiCxInvestment] = useState(80000)
  const [aiDataMiningInvestment, setAiDataMiningInvestment] = useState(80000)
  const [dataAvailability, setDataAvailability] = useState(70)
  const [dataReliability, setDataReliability] = useState(70)

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
    return YEARS.reduce(
      (acc, y, idx) => {
        const opex = numericOpex[idx]
        const capex = numericCapex[idx]
        const totalCost = opex + capex
        const cumulativeCost = acc.cumulative + totalCost
        return {
          cumulative: cumulativeCost,
          rows: [
            ...acc.rows,
            {
              year: y,
              opex,
              capex,
              totalCost,
              cumulativeCost,
            },
          ],
        }
      },
      { cumulative: 0, rows: [] },
    ).rows
  }, [numericOpexForModel, panel1NumericCapexByYear])

  const annualBenefits =
    parseMoney(annualDowntimeSavings) +
    parseMoney(annualProductivitySavings) +
    parseMoney(annualDataCenterAvoided)

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

  // ── Cross-panel derived values ─────────────────────────────────
  const _uptimeBase = [95.0, 99.0, 99.5, 99.95, 99.99, 99.999]
  const _uptimeDelta = [0, 0.5, 0.3, 0.04, 0.009, 0.0009]
  const _p6UptimeSingle = _uptimeBase[redundancy - 1]
  const _p6UptimeMulti = Math.min(99.999, _p6UptimeSingle + _uptimeDelta[redundancy - 1])
  const p6Uptime = multiRegion ? _p6UptimeMulti : _p6UptimeSingle

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
          <strong>migration scenario</strong>: stacked <strong>CAPEX</strong> plus{' '}
          <strong>OPEX (combined operating)</strong>, matching the cash-flow model.
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
            <span className="legend-swatch legend-swatch-p1-opex-combined" />{' '}
            OPEX (combined)
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
            rows={rows}
            baselineAnnualBenefit={annualBenefits}
            fraudInvestment={aiFraudInvestment}
            setFraudInvestment={setAiFraudInvestment}
            cxInvestment={aiCxInvestment}
            setCxInvestment={setAiCxInvestment}
            dataMiningInvestment={aiDataMiningInvestment}
            setDataMiningInvestment={setAiDataMiningInvestment}
            dataAvailability={dataAvailability}
            setDataAvailability={setDataAvailability}
            dataReliability={dataReliability}
            setDataReliability={setDataReliability}
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
          <Panel4Governance slaUptime={p6Uptime} />
        </div>
        </div>
      </div>
    </div>
  )
}

export default App
