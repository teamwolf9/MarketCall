/**
 * The project marketing intake — the research foundation. This is the full
 * spectrum of information a team needs before building anything: strategy, copy,
 * calendars, SEO. It's the single source of truth the orchestrator feeds to
 * every specialist, and what the calendar will be generated from.
 *
 * Written for non-experts: every field carries plain-language help and a sample
 * answer, so the guided walkthrough can hold someone's hand through all of it.
 * The definition is plain data so the form, the walkthrough, the completion
 * meter, and the AI context all read from one place.
 */
export type IntakeFieldType = "text" | "textarea" | "select";

export type IntakeField = {
  id: string;
  label: string;
  /** Plain-language explanation of what we're asking and why it matters. */
  help?: string;
  /** A concrete sample answer, shown greyed-out as inspiration. */
  example?: string;
  type: IntakeFieldType;
  options?: string[];
  placeholder?: string;
  required?: boolean;
};

/** A section can depend on an earlier answer (e.g. only show launch questions for a launch). */
export type SectionCondition = { field: string; equals: string };

export type IntakeSection = {
  id: string;
  title: string;
  intro?: string;
  showIf?: SectionCondition;
  fields: IntakeField[];
};

export const INTAKE: IntakeSection[] = [
  {
    id: "project",
    title: "About this project",
    intro:
      "First, what is this project for? A project can cover your whole business, or one specific thing like a product launch or campaign.",
    fields: [
      {
        id: "project_focus",
        label: "What is this project mainly about?",
        help: "Pick the closest. It tailors the rest of the questions to what you're working on.",
        type: "select",
        options: [
          "Ongoing brand marketing",
          "Product or service launch",
          "Campaign or promotion",
          "Event",
          "Content / awareness push",
          "Other",
        ],
        required: true,
      },
      {
        id: "project_subject",
        label: "What exactly are we marketing here?",
        help: "The specific thing this project is about — a product, a launch, an event, a campaign, or the business as a whole.",
        example: "We're launching 'GlowDrops', a new vitamin-C face serum, in May.",
        type: "textarea",
        required: true,
      },
    ],
  },
  {
    id: "business",
    title: "The business behind it",
    intro: "A little about the business or brand this project belongs to.",
    fields: [
      {
        id: "one_liner",
        label: "In one sentence, what do you do?",
        help: "Imagine a stranger asks what your business is. What's the single sentence you'd say back? Keep it plain — no jargon.",
        example: "We help busy parents cook healthy dinners in 15 minutes.",
        type: "textarea",
        required: true,
      },
      {
        id: "website",
        label: "Your website",
        help: "Just the web address, if you have one. Leave blank if you don't yet.",
        example: "https://acmemeals.com",
        type: "text",
      },
      {
        id: "mission",
        label: "Why does your business exist?",
        help: "The bigger reason behind it — what you believe, or the change you want to make. There's no wrong answer.",
        example:
          "We believe eating well shouldn't take all night, so we make it fast and foolproof.",
        type: "textarea",
      },
      {
        id: "stage",
        label: "What stage are you at?",
        help: "Roughly where the business is today. Pick the closest one.",
        type: "select",
        options: ["Pre-launch", "Startup / early", "Growth", "Established", "Enterprise"],
      },
      {
        id: "locations",
        label: "Where are your customers?",
        help: "The places you serve — a town, a country, or everywhere online.",
        example: "We ship across the US; most customers are in California and Texas.",
        type: "textarea",
      },
    ],
  },
  {
    id: "offerings",
    title: "What you sell",
    fields: [
      {
        id: "products",
        label: "What are your products or services?",
        help: "List the main things people can buy from you, with a few words on each.",
        example:
          "1) Weekly meal kits ($59/wk). 2) A recipe app ($9/mo). 3) Cookbooks ($25).",
        type: "textarea",
        required: true,
      },
      {
        id: "hero_offer",
        label: "What do you most want to sell right now?",
        help: "If you could only push one thing, what would it be? This becomes the focus of campaigns.",
        example: "Our weekly meal-kit subscription — that's what we want new customers to try.",
        type: "textarea",
      },
      {
        id: "pricing",
        label: "What does it cost?",
        help: "Rough prices are fine. It helps us speak to the right kind of buyer.",
        example: "Meal kits from $59/week; app $9/month; cookbooks $25.",
        type: "textarea",
      },
      {
        id: "problem_solved",
        label: "What problem do you solve for people?",
        help: "What's the headache or wish your customer has, that you fix?",
        example: "People want to eat healthy but don't have time to plan or cook.",
        type: "textarea",
      },
      {
        id: "usp",
        label: "Why should someone pick you over a competitor?",
        help: "The honest reason you're different or better. Even a small thing counts.",
        example:
          "Every recipe is 5 ingredients or fewer and ready in 15 minutes — faster than anyone else.",
        type: "textarea",
        required: true,
      },
    ],
  },
  {
    id: "launch",
    title: "Launch details",
    intro:
      "Tell us about what's launching — these answers shape the launch campaign and the calendar.",
    showIf: { field: "project_focus", equals: "Product or service launch" },
    fields: [
      {
        id: "launch_what",
        label: "What exactly is launching?",
        help: "The product, service, feature, or offer at the center of this launch.",
        example: "GlowDrops — a vitamin-C face serum, our first skincare product.",
        type: "textarea",
        required: true,
      },
      {
        id: "launch_date",
        label: "When does it launch?",
        help: "The launch date and any key milestones (teaser, pre-orders, waitlist, early-bird). This drives the calendar.",
        example: "Waitlist opens May 1, launch May 15, early-bird ends May 22.",
        type: "textarea",
      },
      {
        id: "launch_offer",
        label: "Is there a special launch offer?",
        help: "Any intro price, discount, bonus, or bundle to get people moving.",
        example: "20% off for the first 100 customers; free shipping launch week.",
        type: "textarea",
      },
      {
        id: "launch_audience",
        label: "Who is this launch aimed at?",
        help: "If the launch targets a specific slice of your audience, describe them — it can differ from your overall customer.",
        example: "Existing moisturizer customers, plus skincare fans aged 25–40.",
        type: "textarea",
      },
      {
        id: "launch_goal",
        label: "What would make this launch a success?",
        help: "A concrete goal for the launch itself.",
        example: "500 units sold in the first month; 1,000 waitlist signups.",
        type: "textarea",
      },
      {
        id: "launch_why_now",
        label: "Why now — and why should people care?",
        help: "What makes this launch special, timely, or worth paying attention to.",
        example: "It's our first serum, sold out in testing, and lands right before summer.",
        type: "textarea",
      },
    ],
  },
  {
    id: "audience",
    title: "Who you're trying to reach",
    intro: "The more specific you are about your customer, the better everything else gets.",
    fields: [
      {
        id: "ideal_customer",
        label: "Describe your ideal customer",
        help: "Picture one perfect customer. Age, gender, job, income, where they live, their life stage — whatever you know.",
        example: "Working parents, 30–45, household income $75k+, short on time, care about health.",
        type: "textarea",
        required: true,
      },
      {
        id: "personas",
        label: "Are there a few different types of customer?",
        help: "If you serve more than one kind of person, describe each briefly. Skip if it's just one.",
        example: "1) New parents juggling careers. 2) Fitness-focused singles who meal-prep.",
        type: "textarea",
      },
      {
        id: "pain_points",
        label: "What do they struggle with or wish for?",
        help: "The frustrations and desires that bring them to you.",
        example: "No time to cook, bored of takeout, feel guilty feeding the kids junk.",
        type: "textarea",
      },
      {
        id: "objections",
        label: "Why might someone NOT buy?",
        help: "The doubts or worries that hold people back. Knowing these lets us answer them.",
        example: "'Meal kits are expensive' and 'I tried one and it was complicated.'",
        type: "textarea",
      },
      {
        id: "where_they_are",
        label: "Where do they hang out online?",
        help: "The apps, sites, groups, or people they pay attention to.",
        example: "Instagram, TikTok, parenting Facebook groups, a few food podcasts.",
        type: "textarea",
      },
    ],
  },
  {
    id: "brand",
    title: "Your brand & voice",
    fields: [
      {
        id: "voice",
        label: "How should your brand sound?",
        help: "If your brand were a person talking, what would they be like? A few words is plenty.",
        example: "Warm, encouraging, and a little playful — like a friend who's a great cook.",
        type: "textarea",
        required: true,
      },
      {
        id: "values",
        label: "What does your brand stand for?",
        help: "The handful of things you care about that show up in how you act.",
        example: "Health without stress, honesty, and being welcoming to everyone.",
        type: "textarea",
      },
      {
        id: "key_messages",
        label: "What do you always want people to remember?",
        help: "A tagline or the few points you want to land again and again.",
        example: "Healthy is easy. 15 minutes, 5 ingredients. No chef skills needed.",
        type: "textarea",
      },
      {
        id: "words_use_avoid",
        label: "Any words to use — or never use?",
        help: "Favorite phrases, and any words that feel off-brand. Optional but handy.",
        example: "Use: simple, fresh, you've got this. Avoid: diet, cheap, complicated.",
        type: "textarea",
      },
      {
        id: "visual_identity",
        label: "What does your brand look like?",
        help: "Colors, fonts, logo rules — or just paste a link to your brand guide if you have one.",
        example: "Warm greens and cream, a rounded friendly font. Brand guide: [link].",
        type: "textarea",
      },
    ],
  },
  {
    id: "market",
    title: "Your competition",
    fields: [
      {
        id: "competitors",
        label: "Who are your main competitors?",
        help: "A few names (and websites if you know them). Who else could your customer choose?",
        example: "HelloFresh (hellofresh.com), Blue Apron (blueapron.com).",
        type: "textarea",
      },
      {
        id: "advantages",
        label: "What do you do better than them?",
        help: "Where you win. Even one clear advantage is useful.",
        example: "Faster recipes, fewer ingredients, and a lower price than HelloFresh.",
        type: "textarea",
      },
      {
        id: "admired_brands",
        label: "Any brands whose style you love?",
        help: "In or outside your industry — it helps us match a vibe you like.",
        example: "We love how Oatly and Liquid Death write — bold and funny.",
        type: "textarea",
      },
      {
        id: "regulations",
        label: "Any rules you have to follow?",
        help: "Things you legally can't say or must include (common in health, finance, etc.). Skip if unsure.",
        example: "We avoid medical claims and follow FTC rules for ads.",
        type: "textarea",
      },
    ],
  },
  {
    id: "goals",
    title: "What success looks like",
    intro: "So every piece of work points at something real.",
    fields: [
      {
        id: "primary_goal",
        label: "What's the main thing you want from marketing?",
        help: "Pick the single biggest priority right now.",
        type: "select",
        options: [
          "Brand awareness",
          "Lead generation",
          "Sales / revenue",
          "Customer retention",
          "Launch a product",
          "Grow social following",
        ],
        required: true,
      },
      {
        id: "targets",
        label: "Any specific numbers you're aiming for?",
        help: "A goal you could measure. Totally fine to guess or leave blank.",
        example: "200 new subscribers a month; 10k Instagram followers by December.",
        type: "textarea",
      },
      {
        id: "timeframe",
        label: "By when?",
        help: "The window you're focused on.",
        example: "The next 90 days.",
        type: "text",
      },
      {
        id: "kpis",
        label: "How will you know it's working?",
        help: "The signs of success you'd watch. Don't worry about getting the 'right' metrics.",
        example: "New subscribers, what it costs to get one, and Instagram engagement.",
        type: "textarea",
      },
      {
        id: "budget",
        label: "Rough monthly budget?",
        help: "Even a ballpark helps us suggest realistic plans. Include ad spend if any.",
        example: "Around $2,000/month including ads.",
        type: "text",
      },
    ],
  },
  {
    id: "current",
    title: "What you're doing now",
    fields: [
      {
        id: "channels_active",
        label: "Where are you currently marketing?",
        help: "All the places you already show up, even a little.",
        example: "Instagram, TikTok, a weekly email, and a bit of Google Ads.",
        type: "textarea",
      },
      {
        id: "whats_working",
        label: "What's working, and what isn't?",
        help: "Your honest read. It saves us repeating what's already failed.",
        example: "Instagram reels do great; Google Ads feel too expensive for us.",
        type: "textarea",
      },
      {
        id: "assets",
        label: "What content or materials do you already have?",
        help: "Photos, videos, testimonials, logos — and where they live so we can use them.",
        example: "Lots of food photos and 20 recipe videos in our Google Drive: [link].",
        type: "textarea",
      },
      {
        id: "social_handles",
        label: "Your social accounts & sizes",
        help: "Your @handles and rough follower counts. Helps us see your reach.",
        example: "@acmemeals — Instagram 8k, TikTok 3k, Facebook 1k.",
        type: "textarea",
      },
      {
        id: "list_size",
        label: "How big is your email or text list?",
        help: "Roughly how many people you can email or text. Skip if none yet.",
        example: "About 4,500 email subscribers.",
        type: "text",
      },
    ],
  },
  {
    id: "content",
    title: "Content, campaigns & key dates",
    intro:
      "This part feeds your content calendar — the more concrete on timing and dates, the better.",
    fields: [
      {
        id: "content_pillars",
        label: "What themes should your content keep coming back to?",
        help: "3–5 recurring topics so your posts feel consistent. We can suggest these if you're stuck.",
        example: "1) Quick recipes. 2) Meal-prep tips. 3) Behind the scenes. 4) Customer wins.",
        type: "textarea",
      },
      {
        id: "formats",
        label: "What kinds of content do you want?",
        help: "The formats you like or can realistically make.",
        example: "Short reels, recipe carousels, a weekly email, the odd blog post.",
        type: "textarea",
      },
      {
        id: "cadence",
        label: "How often do you want to post?",
        help: "Per channel, roughly. Be realistic about what you can keep up.",
        example: "Instagram 4x/week, TikTok 3x/week, email every Tuesday.",
        type: "textarea",
      },
      {
        id: "topics_avoid",
        label: "Anything you'd rather not post about?",
        help: "Topics or angles that are off-limits for your brand.",
        example: "No fad diets, no calorie-shaming, nothing political.",
        type: "textarea",
      },
      {
        id: "upcoming",
        label: "Any launches, sales, or events coming up?",
        help: "With dates if you can — this is what the calendar will plan around.",
        example: "Spring sale Apr 1–7; kids' menu launches May 15; webinar Jun 3.",
        type: "textarea",
        placeholder: "Include dates where you can.",
      },
      {
        id: "key_dates",
        label: "Any busy seasons or important dates?",
        help: "Holidays, industry moments, or times of year that matter to your business.",
        example: "Back-to-school (Aug–Sep) is our busy season; New Year (Jan) too.",
        type: "textarea",
      },
    ],
  },
  {
    id: "logistics",
    title: "Last few practical things",
    fields: [
      {
        id: "approvers",
        label: "Who approves the work, and how fast?",
        help: "Who needs to say yes before anything goes live, and their usual turnaround.",
        example: "Jane (owner) signs off, usually within a day.",
        type: "textarea",
      },
      {
        id: "asset_links",
        label: "Where do your files and brand assets live?",
        help: "Links to your Drive, Dropbox, Notion, etc. so we can find what we need.",
        example: "Google Drive: [link]. Brand guide in Notion: [link].",
        type: "textarea",
      },
      {
        id: "anything_else",
        label: "Anything else we should know?",
        help: "A catch-all. Anything on your mind that didn't fit above.",
        example: "We're launching a kids' line soon — keep things family-friendly.",
        type: "textarea",
      },
    ],
  },
];

export type IntakeAnswers = Record<string, string>;

export const INTAKE_FIELDS: IntakeField[] = INTAKE.flatMap((s) => s.fields);
export const INTAKE_FIELD_IDS: string[] = INTAKE_FIELDS.map((f) => f.id);

/** A section shows unless its condition references an answer that doesn't match. */
export function sectionVisible(
  section: IntakeSection,
  answers: IntakeAnswers,
): boolean {
  if (!section.showIf) return true;
  return (answers[section.showIf.field] ?? "") === section.showIf.equals;
}

export function visibleSections(answers: IntakeAnswers): IntakeSection[] {
  return INTAKE.filter((s) => sectionVisible(s, answers));
}

export function visibleFields(answers: IntakeAnswers): IntakeField[] {
  return visibleSections(answers).flatMap((s) => s.fields);
}

export type SequenceItem = {
  sectionTitle: string;
  showIf?: SectionCondition;
  field: IntakeField;
};

/** Flat walkthrough sequence with each field's section context + condition. */
export const INTAKE_SEQUENCE: SequenceItem[] = INTAKE.flatMap((s) =>
  s.fields.map((field) => ({ sectionTitle: s.title, showIf: s.showIf, field })),
);

export function itemVisible(item: SequenceItem, answers: IntakeAnswers): boolean {
  if (!item.showIf) return true;
  return (answers[item.showIf.field] ?? "") === item.showIf.equals;
}

/** The walkthrough sequence with conditionally-hidden questions removed. */
export function visibleSequence(answers: IntakeAnswers): SequenceItem[] {
  return INTAKE_SEQUENCE.filter((it) => itemVisible(it, answers));
}
