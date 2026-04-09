export const JOB_POSTING_STATUSES = ['DRAFT', 'PUBLISHED', 'PAUSED', 'CLOSED'] as const;
export type JobPostingStatus = (typeof JOB_POSTING_STATUSES)[number];

export const JOB_POSTING_CATEGORIES = [
  'TECHNOLOGY', 'FINANCE', 'HEALTHCARE', 'EDUCATION', 'ENGINEERING',
  'MARKETING', 'SALES', 'HUMAN_RESOURCES', 'LEGAL', 'OPERATIONS',
  'LOGISTICS', 'HOSPITALITY', 'CONSTRUCTION', 'MEDIA', 'OTHER',
] as const;
export type JobPostingCategory = (typeof JOB_POSTING_CATEGORIES)[number];

export const SALARY_RANGES = [
  'UNDER_15K', 'FROM_15K_TO_25K', 'FROM_25K_TO_40K',
  'FROM_40K_TO_60K', 'FROM_60K_TO_90K', 'ABOVE_90K', 'NEGOTIABLE',
] as const;
export type SalaryRange = (typeof SALARY_RANGES)[number];

export const JOB_TYPES = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'REMOTE', 'HYBRID'] as const;
export type JobType = (typeof JOB_TYPES)[number];

export type JobPosting = {
  id: string;
  companyId: string;
  title: string;
  category: JobPostingCategory;
  salaryRange: SalaryRange;
  jobType: JobType;
  description: string;
  status: JobPostingStatus;
  createdAt: string;
  updatedAt: string;
};

export const CATEGORY_LABELS: Record<JobPostingCategory, string> = {
  TECHNOLOGY: 'Tecnologia',
  FINANCE: 'Finanças',
  HEALTHCARE: 'Saúde',
  EDUCATION: 'Educação',
  ENGINEERING: 'Engenharia',
  MARKETING: 'Marketing',
  SALES: 'Vendas',
  HUMAN_RESOURCES: 'Recursos Humanos',
  LEGAL: 'Jurídico',
  OPERATIONS: 'Operações',
  LOGISTICS: 'Logística',
  HOSPITALITY: 'Hotelaria',
  CONSTRUCTION: 'Construção',
  MEDIA: 'Média',
  OTHER: 'Outros',
};

export const SALARY_RANGE_LABELS: Record<SalaryRange, string> = {
  UNDER_15K: 'Até 15.000 MT',
  FROM_15K_TO_25K: '15.000 – 25.000 MT',
  FROM_25K_TO_40K: '25.000 – 40.000 MT',
  FROM_40K_TO_60K: '40.000 – 60.000 MT',
  FROM_60K_TO_90K: '60.000 – 90.000 MT',
  ABOVE_90K: 'Acima de 90.000 MT',
  NEGOTIABLE: 'Negociável',
};

export const JOB_TYPE_LABELS: Record<JobType, string> = {
  FULL_TIME: 'Tempo Inteiro',
  PART_TIME: 'Meio Período',
  CONTRACT: 'Contrato',
  INTERNSHIP: 'Estágio',
  REMOTE: 'Remoto',
  HYBRID: 'Híbrido',
};

export const STATUS_LABELS: Record<JobPostingStatus, string> = {
  DRAFT: 'Rascunho',
  PUBLISHED: 'Publicada',
  PAUSED: 'Pausada',
  CLOSED: 'Encerrada',
};

export const KANBAN_COLUMNS: { status: JobPostingStatus; label: string; accent: string; badgeClass: string }[] = [
  {
    status: 'DRAFT',
    label: 'Rascunho',
    accent: 'from-slate-500/20 via-slate-500/5 to-transparent',
    badgeClass: 'bg-slate-500/10 text-slate-700 border-slate-200',
  },
  {
    status: 'PUBLISHED',
    label: 'Publicada',
    accent: 'from-emerald-500/20 via-emerald-500/5 to-transparent',
    badgeClass: 'bg-emerald-500/10 text-emerald-700 border-emerald-200',
  },
  {
    status: 'PAUSED',
    label: 'Pausada',
    accent: 'from-amber-500/20 via-amber-500/5 to-transparent',
    badgeClass: 'bg-amber-500/10 text-amber-700 border-amber-200',
  },
  {
    status: 'CLOSED',
    label: 'Encerrada',
    accent: 'from-rose-500/20 via-rose-500/5 to-transparent',
    badgeClass: 'bg-rose-500/10 text-rose-700 border-rose-200',
  },
];
