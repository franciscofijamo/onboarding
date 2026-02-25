import { OperationType } from '../../../prisma/generated/client'

export const FEATURE_CREDIT_COSTS = {
  ai_text_chat: 1,
  ai_image_generation: 5,
  cv_analysis: 10,
  job_match: 10,
  interview_prep: 15,
  scenario_simulation: 15,
  business_english_session: 5,
} as const

export type FeatureKey = keyof typeof FEATURE_CREDIT_COSTS

const FEATURE_TO_OPERATION: Record<FeatureKey, OperationType> = {
  ai_text_chat: OperationType.AI_TEXT_CHAT,
  ai_image_generation: OperationType.AI_IMAGE_GENERATION,
  cv_analysis: OperationType.CV_ANALYSIS,
  job_match: OperationType.JOB_MATCH,
  interview_prep: OperationType.INTERVIEW_PREP,
  scenario_simulation: OperationType.SCENARIO_SIMULATION,
  business_english_session: OperationType.BUSINESS_ENGLISH_SESSION,
}

export function toPrismaOperationType(feature: FeatureKey): OperationType {
  return FEATURE_TO_OPERATION[feature]
}
