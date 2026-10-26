"use client";

import React, { useState } from "react";
import DashboardShell from "@/components/layout/DashboardShell";
import DashboardHeader from "@/components/layout/DashboardHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import ApprovalQueue from "@/components/crm/ApprovalQueue";
import AutomationStatusCard from "@/components/crm/AutomationStatusCard";
import AnalyticsCards from "@/components/crm/AnalyticsCards";
import BrandProfileCard from "@/components/crm/BrandProfileCard";
import GraphExplorer from "@/components/dashboard/GraphExplorer";
import CommandCenter from "@/components/dashboard/CommandCenter";
import ClientsTable from "@/components/crm/ClientsTable";
import PipelineBoard from "@/components/crm/PipelineBoard";
import SocialAccountsManager from "@/components/dashboard/SocialAccountsManager";
import AutomationHub from "@/components/dashboard/AutomationHub";
import AuditLogViewer from "@/components/dashboard/AuditLogViewer";
import SettingsHub from "@/components/dashboard/SettingsHub";
import { DashboardViewSection } from "@/lib/crm";

const sectionMeta: Record<DashboardViewSection, { eyebrow: string; title: string; description: string }> = {
  overview: { eyebrow: "Command Center", title: "Control your publishing pipeline", description: "Review what needs attention, verify automation health, and keep human approval at the center of publishing." },
  approval: { eyebrow: "Human Approval", title: "Review content before it ships", description: "Approve, reject, or return drafts without leaving the publishing workflow." },
  drafts: { eyebrow: "Content Workspace", title: "Draft library", description: "Browse and filter content across the connected publishing pipeline." },
  analytics: { eyebrow: "Performance", title: "Analytics feedback loop", description: "Use workspace-level publishing signals to understand what has been produced and published." },
  guardrails: { eyebrow: "Brand & Safety", title: "Guardrails and brand policy", description: "Keep voice, audience, prohibited topics, and disclosures aligned with your operating policy." },
  clients: { eyebrow: "Workspace", title: "Client operations", description: "Keep client-facing work separated from internal system diagnostics." },
  settings: { eyebrow: "Configuration", title: "Workspace settings", description: "Production controls belong here rather than inside individual content cards." },
  graph: { eyebrow: "Developer Diagnostics", title: "Architecture graph", description: "Inspect system integration signals without mixing developer diagnostics into daily editorial work." },
  inbox: { eyebrow: "Engagement", title: "Unified inbox", description: "Normalize conversations from connected networks into one assignment and response workflow." },
  calendar: { eyebrow: "Scheduling", title: "Content calendar", description: "Coordinate approved content, platform windows, retries, and publishing status." },
  pipeline: { eyebrow: "CRM", title: "Pipeline and opportunities", description: "Manage leads, stages, activities, and opportunities within the current workspace." },
  accounts: { eyebrow: "Integrations", title: "Social accounts", description: "Connect providers, inspect scopes, token health, capabilities, and re-authentication state." },
  automation: { eyebrow: "Automation", title: "Jobs and workflows", description: "Monitor queues, retries, dead-letter jobs, and workflow execution." },
  audit: { eyebrow: "Security", title: "Audit log", description: "Review workspace-scoped security and business events without exposing secrets." },
};

function SectionIntro({ section }: { section: DashboardViewSection }) {
  const meta = sectionMeta[section];
  return (
    <header style={{ marginBottom: "1.5rem" }}>
      <span className="eyebrow">{meta.eyebrow}</span>
      <h1 style={{ margin: 0, fontSize: "clamp(1.75rem, 3vw, 2.5rem)", lineHeight: 1.15, letterSpacing: "var(--ls-snug)", fontWeight: "var(--weight-black)", color: "var(--text)" }}>
        {meta.title}
      </h1>
      <p style={{ maxWidth: 720, margin: "0.65rem 0 0", color: "var(--muted)", fontSize: "var(--text-sm)", lineHeight: "var(--lh-relaxed)" }}>
        {meta.description}
      </p>
    </header>
  );
}

export default function DashboardPage() {
  const [currentSection, setCurrentSection] = useState<DashboardViewSection>("overview");
  const [selectedPlatform, setSelectedPlatform] = useState("all");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <>
      <a className="skip-link" href="#dashboard-main">Skip to dashboard content</a>
      <DashboardHeader
        currentSection={currentSection}
        selectedPlatform={selectedPlatform}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((open) => !open)}
        onPlatformChange={setSelectedPlatform}
      />

      <DashboardShell
        sidebarOpen={sidebarOpen}
        activeSection={currentSection}
        onSelectSection={setCurrentSection}
      >
        <div id="dashboard-main" tabIndex={-1} style={{ maxWidth: 1180, margin: "0 auto" }}>
          <SectionIntro section={currentSection} />

          {currentSection === "overview" && (
            <div style={{ display: "grid", gap: "1.5rem" }}>
              <CommandCenter onNavigate={setCurrentSection} />
              <AutomationStatusCard />
              <ApprovalQueue selectedPlatform={selectedPlatform} />
            </div>
          )}

          {(currentSection === "approval" || currentSection === "drafts") && (
            <ApprovalQueue selectedPlatform={selectedPlatform} />
          )}

          {currentSection === "analytics" && <AnalyticsCards />}

          {currentSection === "guardrails" && <BrandProfileCard />}

          {currentSection === "graph" && <GraphExplorer />}

          {["inbox","calendar"].includes(currentSection) && (
            <section className="card" aria-labelledby="planned-surface" style={{ padding: "1.25rem" }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem", alignItems: "center" }}>
                <h2 id="planned-surface" style={{ margin: 0, fontSize: "var(--text-lg)" }}>{sectionMeta[currentSection].title}</h2>
                <span style={{ padding: "0.15rem 0.5rem", border: "1px solid rgba(245,158,11,0.35)", borderRadius: "var(--radius-small)", background: "rgba(245,158,11,0.12)", color: "var(--accent)", fontSize: "var(--text-xs)", fontWeight: "var(--weight-bold)" }}>Coming soon</span>
              </div>
              <p style={{ marginTop: "0.65rem", color: "var(--muted)", lineHeight: "var(--lh-relaxed)", fontSize: "var(--text-sm)" }}>
                Not built yet. This section is reserved in the navigation, and its records will be workspace-scoped behind the same authenticated API as the rest of the dashboard.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: "0.65rem", marginTop: "0.9rem" }}>
                <div className="card" style={{ padding: "0.8rem" }}>Loading state</div><div className="card" style={{ padding: "0.8rem" }}>Empty state</div><div className="card" style={{ padding: "0.8rem" }}>Error/retry state</div>
              </div>
            </section>
          )}

          {currentSection === "accounts" && <SocialAccountsManager />}

          {currentSection === "automation" && <AutomationHub />}

          {currentSection === "audit" && <AuditLogViewer />}

          {currentSection === "clients" && <ClientsTable />}

          {currentSection === "pipeline" && <PipelineBoard />}

          {currentSection === "settings" && <SettingsHub />}
        </div>
      </DashboardShell>
      <SiteFooter />
    </>
  );
}
