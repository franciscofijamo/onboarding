import { OperationType } from '../../../prisma/generated/client'

// Single source of truth for feature costs (examples below)
export const FEATURE_CREDIT_COSTS = {
  ai_text_chat: 1,
  ai_image_generation: 5,
  essay_analysis: 10,
  mock_interview_deck: 15,
  audio_interview: 15,
} as const

export type FeatureKey = keyof typeof FEATURE_CREDIT_COSTS

const FEATURE_TO_OPERATION: Record<FeatureKey, OperationType> = {
  ai_text_chat: OperationType.AI_TEXT_CHAT,
  ai_image_generation: OperationType.AI_IMAGE_GENERATION,
  essay_analysis: OperationType.ESSAY_ANALYSIS,
  mock_interview_deck: OperationType.MOCK_INTERVIEW_DECK,
  audio_interview: OperationType.AUDIO_INTERVIEW,
}

export function toPrismaOperationType(feature: FeatureKey): OperationType {
  return FEATURE_TO_OPERATION[feature]
}
