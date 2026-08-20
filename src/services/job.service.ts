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
};
export const adminJobService = {
  list(filters: JobFilters = {}): Promise<JobPage> { return adminClient.get<JobPage>(`/admin/jobs${query(filters)}`); },
  create(input: JobMutationInput): Promise<Job> { return adminClient.post<Job>("/admin/jobs", { ...input }); },
  update(id: string, input: Partial<JobMutationInput>): Promise<Job> { return adminClient.patch<Job>(`/admin/jobs/${id}`, { ...input }); },
  publish(id: string): Promise<Job> { return adminClient.post<Job>(`/admin/jobs/${id}/publish`); },
  close(id: string): Promise<Job> { return adminClient.post<Job>(`/admin/jobs/${id}/close`); },
  remove(id: string): Promise<{ deleted: true }> { return adminClient.delete<{ deleted: true }>(`/admin/jobs/${id}`); },
};
export function getJobError(error: unknown): string {
  if (error instanceof ApiClientError || error instanceof Error) return error.message;
  return "Không thể tải cơ hội việc làm. Vui lòng thử lại.";
}
