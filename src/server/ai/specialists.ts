import type { ModelKey } from "@/server/ai/models";

/**
 * Specialist agents. The orchestrator routes each message to one of these; each
 * is a role + system prompt + a *preferred* logical model (so a cheap model can
 * route while a stronger one does the heavy lifting — the multi-model story).
 *
 * Adding a specialist is just another entry here; the router and UI pick it up.
 */
export type ProjectContext = {
  brandName: string;
  projectName: string;
  /** The answered marketing brief, formatted for the prompt (empty if none). */
  brief?: string;
};

export type SpecialistKey =
  | "strategist"
  | "ad_copy"
  | "content_calendar"
  | "seo";

export type Specialist = {
  key: SpecialistKey;
  name: string;
  /** One line the router uses to choose, also shown in the UI. */
  blurb: string;
  model: ModelKey;
  system: (ctx: ProjectContext) => string;
};

export const DEFAULT_SPECIALIST: SpecialistKey = "strategist";

function base(ctx: ProjectContext): string {
  const lines = [
    "You are part of MarketCall, a marketing-operations assistant working inside a specific project.",
    `Brand: ${ctx.brandName}. Project: ${ctx.projectName}.`,
    "Produce real, usable marketing work. Be concrete and concise; ask a clarifying question only when a missing detail would change the output.",
    "Anything that would touch a live client account is a draft for human review — never imply you have published or sent anything.",
  ];
  if (ctx.brief && ctx.brief.trim()) {
    lines.push(
      `\n\nUse this project's marketing brief as your source of truth. Defer to it for voice, audience, goals, and key dates. If something needed isn't in it, note the gap rather than inventing facts.\n\n# Project brief\n${ctx.brief.trim()}`,
    );
  }
  return lines.join(" ");
}

export const SPECIALISTS: Record<SpecialistKey, Specialist> = {
  strategist: {
    key: "strategist",
    name: "Strategist",
    blurb:
      "Marketing strategy, positioning, planning, audience, and anything that doesn't fit a more specific specialist.",
    model: "default",
    system: (ctx) =>
      `${base(ctx)} You are the Strategist: handle positioning, audience, campaign strategy, and general questions. Give structured, decision-ready thinking.`,
  },
  ad_copy: {
    key: "ad_copy",
    name: "Ad Copy",
    blurb:
      "Writing ads — headlines, primary text, CTAs, variants for Google/Meta/TikTok and similar.",
    model: "smart",
    system: (ctx) =>
      `${base(ctx)} You are the Ad Copy specialist. Write punchy, on-brand ad copy: multiple headline and primary-text variants with clear CTAs, labelled by platform where relevant. Note the angle behind each variant.`,
  },
  content_calendar: {
    key: "content_calendar",
    name: "Content Calendar",
    blurb:
      "Planning what to post and when — content calendars, posting schedules, themes, and formats across channels.",
    model: "default",
    system: (ctx) =>
      `${base(ctx)} You are the Content Calendar specialist. Produce structured posting calendars as clean tables or lists: date, channel, theme, hook, and format. Keep it realistic and on-cadence.`,
  },
  seo: {
    key: "seo",
    name: "SEO",
    blurb:
      "Search — keyword clusters, on-page recommendations, content briefs, and meta tags.",
    model: "default",
    system: (ctx) =>
      `${base(ctx)} You are the SEO specialist. Deliver prioritized, practical output: keyword clusters by intent, on-page recommendations, content briefs, and meta titles/descriptions.`,
  },
};

export function specialistName(key: string | null | undefined): string {
  if (key && key in SPECIALISTS) return SPECIALISTS[key as SpecialistKey].name;
  return "MarketCall";
}
