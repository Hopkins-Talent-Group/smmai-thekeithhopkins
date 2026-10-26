export type Platform = "meta" | "linkedin" | "twitter" | "x" | "facebook" | "instagram" | "tiktok" | "youtube" | (string & {});

export type DraftStatus = "draft" | "pending" | "approved" | "rejected" | "scheduled" | "published";
export type ClientStatus = "PROSPECT" | "ACTIVE" | "PAUSED" | "CHURNED";

export const CLIENT_STATUSES: ClientStatus[] = ["PROSPECT", "ACTIVE", "PAUSED", "CHURNED"];

export interface BrandProfile {
  name: string;
  audience: string;
  voice: string;
  prohibitedTopics: string[];
  requiredDisclosures: string[];
}

export interface ContentDraft {
  id: string;
  topic: string;
  platform: Platform;
  text: string;
  hashtags: string[];
  status: DraftStatus;
  metadata?: Record<string, unknown>;
  createdAt: string | Date;
  engagementScore?: number;
  author?: string;
  scheduledAt?: string | Date;
  publishedAt?: string | Date;
}

export interface AnalyticsMetric {
  platform: string;
  impressions: number;
  engagements: number;
  clicks: number;
  followersGained: number;
  change?: number;
  rate?: number;
}

export interface Client {
  id: string;
  name: string;
  company: string;
  email: string;
  phone?: string | null;
  website?: string | null;
  industry?: string | null;
  status: ClientStatus;
  approved: boolean;
  revenue: number;
  accountManager?: string | null;
  tags: string[];
  notes?: string | null;
  posts: { count: number; lastPost: Date | string };
  lastActivity: Date | string;
}

export interface ClientStats {
  total: number;
  active: number;
  prospects: number;
  churned: number;
  totalRevenue: number;
  totalPosts: number;
}

export const initialBrandProfile: BrandProfile = {
  name: "",
  audience: "",
  voice: "",
  prohibitedTopics: [],
  requiredDisclosures: [],
};

export const initialClients: Client[] = [];

export const initialAnalytics: AnalyticsMetric[] = [];

export type DashboardViewSection =
  | "overview"
  | "approval"
  | "drafts"
  | "analytics"
  | "guardrails"
  | "clients"
  | "settings"
  | "graph"
  | "inbox"
  | "calendar"
  | "pipeline"
  | "accounts"
  | "automation"
  | "audit";

export interface ClientStats {
  total: number;
  active: number;
  prospects: number;
  churned: number;
  totalRevenue: number;
  totalPosts: number;
}

export function toClientDTO(row: {
  id: string; name: string; company: string; email: string;
  phone: string | null; website: string | null; industry: string | null;
  status: ClientStatus; approved: boolean; revenue: number;
  accountManager: string | null; tags: string[]; notes: string | null;
  postCount: number; lastPostAt: Date | null; lastActivity: Date; createdAt: Date;
}): Client {
  return {
    id: row.id, name: row.name, company: row.company, email: row.email,
    phone: row.phone, website: row.website, industry: row.industry,
    status: row.status, approved: row.approved,
    posts: { count: row.postCount, lastPost: row.lastPostAt ?? row.createdAt },
    revenue: row.revenue, accountManager: row.accountManager,
    tags: row.tags, notes: row.notes,
    lastActivity: row.lastActivity.toISOString(),
  };
}

export const initialDrafts: ContentDraft[] = [];

// Pipeline (crm-plan-v2.md §7.2: Deal/Lead views over the Opportunity/Lead models)
export type OpportunityStatus = "OPEN" | "WON" | "LOST";
export type LeadStatus = "NEW" | "QUALIFIED" | "WORKING" | "CONVERTED" | "LOST";
export const LEAD_STATUSES: LeadStatus[] = ["NEW", "QUALIFIED", "WORKING", "CONVERTED", "LOST"];

export interface Lead {
  id: string;
  title: string;
  status: LeadStatus;
  source: string | null;
  value: number | null;
  createdAt: string;
}

export interface Opportunity {
  id: string;
  title: string;
  amount: number | null;
  status: OpportunityStatus;
  expectedCloseAt: string | null;
  lead: { id: string; title: string } | null;
  createdAt: string;
}

export interface PipelineStageView {
  id: string;
  name: string;
  position: number;
  probability: number;
  opportunities: Opportunity[];
}

export interface PipelineView {
  pipeline: { id: string; name: string };
  stages: PipelineStageView[];
  leads: Lead[];
  counts: { openOpportunities: number; openValue: number; leads: number };
}

