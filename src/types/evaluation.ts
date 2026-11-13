export interface PreFlightCheck {
  totalPagesReceived: number
  firstSentence: string
  lastSentence: string
  detectedPaperMode: string
  questionText: string
  totalMarksPossible: number
  isCompleteScript: boolean
}

export interface Scoring {
  rawCalculatedScore?: number
  performanceBand?: string
  awardedScore: number
  maxScore: number
  percentileEstimate: string
  examinerVerdict: string
}

export interface ParameterEvaluation {
  score: number
  maxScore: number
  strengths: string[]
  criticalGaps: string[]
  directEvidence: string
}

export interface SpellingGrammarError {
  foundText: string
  correctedText: string
  pageNumber: number
}

export interface PresentationAndMechanics {
  handwritingLegibility: "High" | "Legible with Effort" | "Poor" | "Not assessed"
  structuralFormatting: string
  wordCountEstimate?: number
  wordLimitCompliance?: 'WITHIN_LIMIT' | 'OVER_LIMIT' | 'UNDER_LIMIT' | 'UNKNOWN'
  spellingAndGrammarErrors: SpellingGrammarError[]
}

export interface ExactValueAddition {
  sourceIds?: string[]
  type: string
  recommendation: string
}

export interface KnowledgeSource {
  documentId: string
  title: string
  paper: string
  subject: string
  topic: string
  chapter: string
  section: string
  page: number
  content: string
  scoreHybrid?: number
  scoreBm25?: number
  scoreSemantic?: number
}

export interface TopperDeltaPack {
  missedDimensions: string[]
  exactValueAdditions: ExactValueAddition[]
  modelParagraphRewrite: string
}

export interface DirectiveCompliance {
  directiveWord: string
  complianceVerdict: "COMPLIANT" | "PARTIAL" | "NON_COMPLIANT"
  complianceNote: string
}

export interface ImprovementAction {
  dimension: string
  action: string
  exampleContent: string
}

export interface TopperFramework {
  suggestedIntroApproach: string
  mandatoryDimensions: string[]
  recommendedSubheadings: string[]
  conclusionType: string
  wordBudgetAllocation: string
}

export interface QuestionConfirmationData {
  ocrDetectedQuestion: string
  userConfirmedQuestion: string
  wasAutoDetected: boolean
  wasUserConfirmed: boolean
  confirmationTimestamp?: string
}

export interface FactualConcern {
  claim: string
  riskLevel: string
  note: string
}

export interface UpscEvaluationReport {
  handwritingAudit?: { status: "assessed" | "unavailable" | "insufficient_visual_evidence"; pageNumber: number; legibility: string; observations: { area: string; observation: string; action: string }[]; limitation: string }
  aspirantDiagnosis?: {
    scriptDiagnosis: string; directiveAudit: string;
    strength: { evidence: string; whyItWorks: string; nextRefinement: string };
    priorities: { gap: string; consequence: string; nextAttemptAction: string }[];
    dimensions: { name: string; status: "HIT" | "PARTIAL" | "MISSED"; evidence: string; explanation: string; improvedTreatment: string }[];
    sentenceUpgrades: { original: string; objection: string; rewrite: string }[];
    revisionTopics: { topic: string; gap: string; studyTask: string; practiceCheck: string }[];
    presentation: { observableStructure: string; visualAssessmentLimit: string; usefulVisual: string };
    nextAnswerChecklist: string[];
  }
  questionBreakdown?: { coreTheme: string; directiveExpectation: string; subparts: string[] }
  teachingAdditions?: { improvedIntroduction: string; improvedConclusion: string; diagramSuggestion: string }
  rubricCategory?: string
  confirmedSettings?: { paper: string; maximumMarks: number; wordLimit: number }
  rubricWeights?: Record<string, number>
  modelAnswer?: string
  modelAnswerSourceIds?: string[]
  sourceCitations?: { id: string; title: string; sourceType: string; page: string; excerpt: string }[]
  qualityAudit?: { retrievedSources: number; citedSources: number; warnings: string[]; modelAnswerWordCount: number }
  preFlightCheck: PreFlightCheck
  scoring: Scoring
  parameterEvaluations: Record<string, ParameterEvaluation>
  presentationAndMechanics: PresentationAndMechanics
  topperDeltaPack: TopperDeltaPack
  directiveCompliance?: DirectiveCompliance
  improvementPlan?: ImprovementAction[]
  topperFramework?: TopperFramework
  questionConfirmation?: QuestionConfirmationData
  missingDimensions?: string[]
  factualConcerns?: FactualConcern[]
  rubricVersion?: string
  promptVersion?: string
  modelVersion?: string
  needsHumanReview?: boolean
  evaluationStatus?: "final" | "provisional" | "blocked"
  extractionStatus?: "ready" | "needs_review" | "incomplete" | "failed"
}

export interface OCRBlock {
  id: string
  page: number
  text: string
  confidence: number | null
  uncertain: boolean
}

export interface OCRResultData {
  documentId?: string
  pages?: {
    pageNumber: number
    width: number
    height: number
    coordinateUnit?: string
    isHandwritten?: boolean
    blocks: OCRBlock[]
    fullText: string
  }[]
  fullText?: string
  averageConfidence?: number | null
  uncertainRegions?: OCRBlock[]
  model?: string
  modelVersion?: string
  processingTimeMs?: number
}

export interface EvaluationJobResponse {
  status: "uploading" | "preprocessing" | "ocr" | "question_analysis" | "retrieval" | "evaluating" | "scoring" | "completed" | "failed" | "created"
  stage?: string
  progress?: number
  report?: {
    report: UpscEvaluationReport
    ocrData?: OCRResultData
  } | UpscEvaluationReport | null
  error?: string | null
}

export const DEMO_REPORT_DATA: UpscEvaluationReport = {
  preFlightCheck: {
    totalPagesReceived: 2,
    firstSentence:
      "Digital literacy is fundamentally reshaping the landscape of welfare delivery in modern India.",
    lastSentence:
      "Therefore, while digitisation accelerates welfare distribution, it must be paired with offline fallback mechanisms and aggressive grassroots digital training programs to avoid deepening inequality.",
    detectedPaperMode: "MODE_GS_GENERAL",
    questionText:
      "Digital India is not just about digital infrastructure but a fundamental shift in governance. Examine.",
    totalMarksPossible: 10,
    isCompleteScript: true,
  },
  scoring: {
    awardedScore: 6.8,
    maxScore: 10,
    percentileEstimate: "Top 12%",
    examinerVerdict:
      "Comprehensive articulation of governance transformation with robust multi-dimensional coverage; could be strengthened with recent empirical data on rural digital divide.",
  },
  parameterEvaluations: {
    questionDemand: {
      score: 7,
      maxScore: 10,
      strengths: [
        "Directly addressed both dimensions: digital infrastructure vs fundamental governance paradigm shift",
        "Clear distinction between G2C, G2B, and G2G delivery mechanisms",
      ],
      criticalGaps: [
        "Directive 'Examine' warrants deeper scrutiny of structural implementation bottlenecks",
      ],
      directEvidence:
        "Digital literacy is fundamentally reshaping the landscape of welfare delivery in modern India...",
    },
    contentKnowledge: {
      score: 7.5,
      maxScore: 10,
      strengths: [
        "Accurate citation of JAM Trinity, CoWIN, and PM-KISAN architectures",
        "Sound understanding of Direct Benefit Transfer (DBT) leakage mitigation",
      ],
      criticalGaps: [
        "Did not cite NITI Aayog's Digital Banks report or TRAI 2023 rural broadband density figures",
      ],
      directEvidence:
        "Through initiatives like the JAM Trinity (Jan Dhan, Aadhaar, Mobile), targeting has improved significantly...",
    },
    analyticalDepth: {
      score: 6.5,
      maxScore: 10,
      strengths: [
        "Good correlation between biometric authentication and systemic corruption reduction",
      ],
      criticalGaps: [
        "Exclusion error vs inclusion error tradeoff under-analyzed",
        "Constitutional dimension (Right to Privacy - Puttaswamy verdict) omitted",
      ],
      directEvidence:
        "This digital divide translates into an exclusion error, wherein the most marginalized are locked out...",
    },
    structureOrganization: {
      score: 7.5,
      maxScore: 10,
      strengths: [
        "Clear 3-tier structure: Paradigm Shift -> Structural Bottlenecks -> Way Forward",
        "Sub-headings and crisp bullet points increase visual readability",
      ],
      criticalGaps: [
        "Conclusion slightly rushed; could benefit from a dedicated policy framework recommendation",
      ],
      directEvidence:
        "Therefore, while digitisation accelerates welfare distribution, it must be paired with offline fallback...",
    },
    multiDimensionality: {
      score: 6.5,
      maxScore: 10,
      strengths: ["Covered Administrative and Social aspects well"],
      criticalGaps: [
        "Missed Economic dimension (fiscal savings from DBT) and Gender dimension (rural women digital literacy gap)",
      ],
      directEvidence:
        "Rural areas frequently suffer from severe digital infrastructure deficits...",
    },
    examplesAndData: {
      score: 7,
      maxScore: 10,
      strengths: [
        "Included 40% panchayat broadband deficiency statistic",
        "Referenced CoWIN and PM-KISAN schemes",
      ],
      criticalGaps: [
        "Could include economic survey estimates of leakages prevented through DBT",
      ],
      directEvidence:
        "Recent data suggests that over 40% of panchayats do not have stable connectivity...",
    },
    presentationAndMechanics: {
      score: 7,
      maxScore: 10,
      strengths: [
        "Neat handwriting with consistent margins and highlighted key terms",
      ],
      criticalGaps: [
        "A small flow diagram representing G2C delivery channels would have elevated presentation",
      ],
      directEvidence:
        "A primary advantage of digital literacy is its ability to bypass middlemen...",
    },
    conclusionAndWayForward: {
      score: 7,
      maxScore: 10,
      strengths: [
        "Constructive forward-looking stance balancing technological optimism with social safeguards",
      ],
      criticalGaps: [
        "Should mention BharatNet Phase 3 and Digital Personal Data Protection Act 2023",
      ],
      directEvidence:
        "while digitisation accelerates welfare distribution, it must be paired with offline fallback mechanisms...",
    },
  },
  presentationAndMechanics: {
    handwritingLegibility: "High",
    structuralFormatting:
      "Structured with bold subheadings and boxed key terms. Margins maintained according to UPSC answer booklet norms.",
    spellingAndGrammarErrors: [
      {
        foundText: "digitisation",
        correctedText: "digitization",
        pageNumber: 2,
      },
    ],
  },
  topperDeltaPack: {
    missedDimensions: [
      "Economic (Fiscal savings from direct benefit transfer leakages)",
      "Gender Divide (NFHS-5 statistics on rural women smartphone ownership)",
      "Constitutional / Legal (Puttaswamy Judgment & DPDP Act 2023 safeguards)",
    ],
    exactValueAdditions: [
      {
        type: "Data/Statistic",
        recommendation:
          "Cite Economic Survey: DBT has saved the exchequer over ₹2.7 lakh crore in cumulative leaked subsidies.",
      },
      {
        type: "Committee / Report",
        recommendation:
          "Reference Parliamentary Standing Committee on Communications & IT regarding BharatNet last-mile viability.",
      },
      {
        type: "Diagram / Flowchart",
        recommendation:
          "Draw a simple 3-tier 'JAM Trinity -> Middleman Disintermediation -> Direct Beneficiary Empowerment' funnel diagram.",
      },
    ],
    modelParagraphRewrite:
      "Digital India represents a paradigm shift from physical to digital governance architecture. At its core, it transforms the State–citizen relationship through three mutually reinforcing dimensions: Digital infrastructure as utility, Governance on demand, and Digital empowerment of citizens (DEIT, 2015). The G2C transformation has been substantial: DigiLocker has issued 6+ billion documents, reducing bureaucratic friction. However, as TRAI (2023) highlights, only 40% of rural households possess high-speed broadband, creating a two-speed digital citizenship that demands offline fallback safeguards.",
  },
}
