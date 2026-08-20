import { ApiClient, ApiClientError } from "./api-client";
import { getAuthSession } from "./auth.service";

export type JobStatus = "draft" | "published" | "closed";
export type JobWorkMode = "remote" | "hybrid" | "onsite";
export type JobEmploymentType = "full_time" | "part_time" | "internship" | "contract";
export interface JobSkill { name: string; level: string | null }
export interface Job {
  id: string; title: string; companyName: string; summary: string; description?: string;
  location: string | null; workMode: JobWorkMode; employmentType: JobEmploymentType;
  salaryMin: number | null; salaryMax: number | null; salaryCurrency: string | null;
  status?: JobStatus; publishedAt: string | null; closesAt: string | null;
  createdAt?: string; updatedAt?: string; requiredSkills: JobSkill[];
}
export interface JobPage { items: Job[]; page: number; pageSize: number; total: number; totalPages: number }
export interface JobMutationInput {
  title: string; companyName: string; summary: string; description: string;
  location?: string | null; workMode: JobWorkMode; employmentType: JobEmploymentType;
  salaryMin?: number | null; salaryMax?: number | null; salaryCurrency?: string | null;
  closesAt?: string | null; requiredSkills: JobSkill[];
}
export type JobApplicationStatus = "submitted" | "reviewing" | "shortlisted" | "accepted" | "rejected" | "withdrawn";
export interface JobApplication {
  id: string; coverLetter: string | null; status: JobApplicationStatus; submittedAt: string;
  withdrawnAt: string | null; updatedAt: string; job: Pick<Job, "id" | "title" | "companyName" | "status" | "closesAt">;
  history: Array<{ fromStatus: JobApplicationStatus | null; toStatus: JobApplicationStatus; createdAt: string }>;
  user?: { fullName: string; email: string };
}
export interface JobApplicationPage { items: JobApplication[]; page: number; pageSize: number; total: number; totalPages: number }
export interface SavedJobPage { items: Array<{ createdAt: string; job: Job }>; page: number; pageSize: number; total: number; totalPages: number }
export interface JobMatch {
  job: Pick<Job, "id" | "title" | "companyName">; fitScore: number; explanation: string;
  matchedSkills: Array<{ name: string; requiredLevel: string | null; learnerLevel: string | null }>;
  missingSkills: Array<{ name: string; requiredLevel: string | null; learnerLevel: string | null; reason: "missing" | "level_gap" }>;
  courseRecommendations: Array<{ id: string; title: string; slug: string; thumbnailUrl: string | null; level: string; matchedMissingSkills: string[] }>;
}
export interface JobFilters { page?: number; pageSize?: number; search?: string; location?: string; workMode?: JobWorkMode; employmentType?: JobEmploymentType; status?: JobStatus }

const publicClient = new ApiClient();
const adminClient = new ApiClient({ getAccessToken: () => getAuthSession()?.accessToken });
const query = (filters: JobFilters = {}) => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => { if (value !== undefined && value !== "") params.set(key, String(value)); });
  return params.toString() ? `?${params}` : "";
};

export const jobService = {
  list(filters: JobFilters = {}): Promise<JobPage> { return publicClient.get<JobPage>(`/jobs${query(filters)}`); },
  get(id: string): Promise<Job> { return publicClient.get<Job>(`/jobs/${id}`); },
  save(id: string): Promise<{ saved: true }> { return adminClient.post<{ saved: true }>(`/jobs/${id}/saved`); },
  unsave(id: string): Promise<{ saved: false }> { return adminClient.delete<{ saved: false }>(`/jobs/${id}/saved`); },
  apply(id: string, coverLetter?: string | null): Promise<JobApplication> { return adminClient.post<JobApplication>(`/jobs/${id}/applications`, { coverLetter }); },
  listApplications(page = 1): Promise<JobApplicationPage> { return adminClient.get<JobApplicationPage>(`/me/job-applications?page=${page}&pageSize=20`); },
  listSaved(page = 1): Promise<SavedJobPage> { return adminClient.get<SavedJobPage>(`/me/saved-jobs?page=${page}&pageSize=20`); },
  withdraw(id: string): Promise<JobApplication> { return adminClient.post<JobApplication>(`/me/job-applications/${id}/withdraw`); },
  match(id: string): Promise<JobMatch> { return adminClient.get<JobMatch>(`/jobs/${id}/match`); },
};
export const adminJobService = {
  list(filters: JobFilters = {}): Promise<JobPage> { return adminClient.get<JobPage>(`/admin/jobs${query(filters)}`); },
  create(input: JobMutationInput): Promise<Job> { return adminClient.post<Job>("/admin/jobs", { ...input }); },
  update(id: string, input: Partial<JobMutationInput>): Promise<Job> { return adminClient.patch<Job>(`/admin/jobs/${id}`, { ...input }); },
  publish(id: string): Promise<Job> { return adminClient.post<Job>(`/admin/jobs/${id}/publish`); },
  close(id: string): Promise<Job> { return adminClient.post<Job>(`/admin/jobs/${id}/close`); },
  remove(id: string): Promise<{ deleted: true }> { return adminClient.delete<{ deleted: true }>(`/admin/jobs/${id}`); },
  listApplications(page = 1): Promise<JobApplicationPage> { return adminClient.get<JobApplicationPage>(`/admin/job-applications?page=${page}&pageSize=100`); },
  updateApplicationStatus(id: string, status: JobApplicationStatus): Promise<JobApplication> { return adminClient.patch<JobApplication>(`/admin/job-applications/${id}/status`, { status }); },
};
export function getJobError(error: unknown): string {
  if (error instanceof ApiClientError || error instanceof Error) return error.message;
  return "Không thể tải cơ hội việc làm. Vui lòng thử lại.";
}
