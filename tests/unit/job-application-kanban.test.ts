import { describe, expect, it } from 'vitest'
import {
  getOutcomeLabel,
  getStatusFromKanbanStage,
  getStatusLabel,
  mapStatusToKanbanStage,
} from '@/lib/job-application/kanban'

describe('job application kanban helpers', () => {
  it('maps draft and analyzed states into in progress', () => {
    expect(mapStatusToKanbanStage('DRAFT')).toBe('IN_PROGRESS')
    expect(mapStatusToKanbanStage('ANALYZED')).toBe('IN_PROGRESS')
  })

  it('maps applied and interview pipeline states correctly', () => {
    expect(mapStatusToKanbanStage('APPLIED')).toBe('APPLIED')
    expect(mapStatusToKanbanStage('INTERVIEWING')).toBe('INTERVIEW')
    expect(mapStatusToKanbanStage('ACCEPTED')).toBe('INTERVIEW')
  })

  it('derives a backend status from the chosen kanban stage', () => {
    expect(getStatusFromKanbanStage('IN_PROGRESS', 'APPLIED', false)).toBe('DRAFT')
    expect(getStatusFromKanbanStage('IN_PROGRESS', 'INTERVIEWING', true)).toBe('ANALYZED')
    expect(getStatusFromKanbanStage('APPLIED', 'DRAFT', false)).toBe('APPLIED')
    expect(getStatusFromKanbanStage('INTERVIEW', 'APPLIED', true)).toBe('INTERVIEWING')
  })

  it('returns friendly labels for statuses and outcomes', () => {
    expect(getStatusLabel('ANALYZED')).toBe('Ready to apply')
    expect(getOutcomeLabel('OFFERED')).toBe('Offer')
    expect(getOutcomeLabel('DRAFT')).toBeNull()
  })
})
