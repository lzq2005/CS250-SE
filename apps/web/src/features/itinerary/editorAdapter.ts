import type { CandidatePlan, DraftEditRequest } from '@tripmate/contracts';

export interface CandidateEditorAdapter {
  editDraft(request: DraftEditRequest): Promise<CandidatePlan>;
}

export class CandidateEditorError extends Error {
  constructor(
    message: string,
    public code: string | null = null,
    public details: Record<string, unknown> | null = null,
  ) {
    super(message);
    this.name = 'CandidateEditorError';
  }
}
