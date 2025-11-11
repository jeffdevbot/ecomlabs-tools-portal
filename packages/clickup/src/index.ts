import { z } from "zod";

export interface ClickUpClientOptions {
  token?: string;
  baseUrl?: string;
  fetchFn?: typeof fetch;
}

const defaultBaseUrl = "https://api.clickup.com/api/v2";

const ClickUpErrorSchema = z.object({
  err: z.string().optional(),
  ECODE: z.string().optional(),
  message: z.string().optional()
});

export class ClickUpClient {
  private readonly token: string;
  private readonly baseUrl: string;
  private readonly fetchFn: typeof fetch;

  constructor(options: ClickUpClientOptions = {}) {
    const token = options.token ?? process.env.CLICKUP_API_TOKEN;
    if (!token) {
      throw new Error("Missing ClickUp API token");
    }
    this.token = token;
    this.baseUrl = options.baseUrl ?? defaultBaseUrl;
    this.fetchFn = options.fetchFn ?? fetch.bind(globalThis);
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await this.fetchFn(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
        ...(init?.headers ?? {})
      }
    });

    if (!response.ok) {
      const text = await response.text();
      let details: unknown;
      try {
        details = JSON.parse(text);
      } catch (error) {
        details = text;
      }
      const parsed = ClickUpErrorSchema.safeParse(details);
      const message = parsed.success ? parsed.data.message ?? parsed.data.err ?? "ClickUp API error" : String(details);
      throw new Error(`ClickUp request failed (${response.status}): ${message}`);
    }

    return (await response.json()) as T;
  }

  async getListTasks(listId: string) {
    return this.request(`/list/${listId}/task?subtasks=true`);
  }

  async getTeamFilteredTasks(teamId: string, params: Record<string, string | number | boolean>) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => searchParams.set(key, String(value)));
    return this.request(`/team/${teamId}/task?${searchParams.toString()}`);
  }
}

export function createClickUpClient(options?: ClickUpClientOptions) {
  return new ClickUpClient(options);
}
