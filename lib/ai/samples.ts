import type { Extraction } from "./schema";

/** One-click sample client messages for judges (FR-12), each with a known-good extraction. */
export interface SampleMessage {
  id: "simple" | "ambiguous" | "deadline";
  label: string;
  text: string;
  cached: Extraction;
}

export const SAMPLE_MESSAGES: SampleMessage[] = [
  {
    id: "deadline",
    label: "New features + deadline",
    text: "Love it! Can we also add a gift-card page and make the menu filterable by allergens? Need it before the holiday launch.",
    cached: {
      isScopeChange: true,
      summary:
        "Client wants two new storefront features (gift cards, allergen filter) before the holiday launch.",
      items: [
        {
          title: "Gift-card page",
          description: "New page to buy and redeem bakery gift cards, wired into checkout.",
          role: "dev",
          estimatedHours: 10,
          inOriginalScope: false,
          confidence: 0.82,
          sourceQuote: "add a gift-card page",
        },
        {
          title: "Allergen filter for the menu",
          description: "Tag products with allergens and add a filter control to the menu page.",
          role: "dev",
          estimatedHours: 6,
          inOriginalScope: false,
          confidence: 0.78,
          sourceQuote: "make the menu filterable by allergens",
        },
        {
          title: "QA for new features",
          description: "Test the gift-card purchase flow and allergen filter across browsers.",
          role: "qa",
          estimatedHours: 3,
          inOriginalScope: false,
          confidence: 0.7,
          sourceQuote: "Need it before the holiday launch",
        },
      ],
      requestedDeadline: null,
      clarifyingQuestions: [
        "Which date is the holiday launch, so we can confirm the new work fits?",
        "Should gift cards be fixed amounts or a custom value?",
      ],
    },
  },
  {
    id: "simple",
    label: "Simple add-on",
    text: "Could you add a newsletter sign-up box to the footer? Just name and email, nothing fancy.",
    cached: {
      isScopeChange: true,
      summary: "Client wants a simple newsletter sign-up form in the site footer.",
      items: [
        {
          title: "Newsletter sign-up in footer",
          description: "Name and email form in the footer, stored for the client's mailing list.",
          role: "dev",
          estimatedHours: 3,
          inOriginalScope: false,
          confidence: 0.88,
          sourceQuote: "add a newsletter sign-up box to the footer",
        },
      ],
      requestedDeadline: null,
      clarifyingQuestions: ["Which mailing-list tool should sign-ups go to?"],
    },
  },
  {
    id: "ambiguous",
    label: "Vague feedback",
    text: "The checkout feels a bit off. Can you make it smoother and maybe more on-brand? Also not sure the product photos are working on my phone.",
    cached: {
      isScopeChange: true,
      summary:
        "Vague feedback on checkout polish and mobile product photos; part of it may already be in scope.",
      items: [
        {
          title: "Checkout polish",
          description: "Smooth out the checkout flow. Cart & checkout is already in the Build milestone.",
          role: "dev",
          estimatedHours: 4,
          inOriginalScope: true,
          confidence: 0.45,
          sourceQuote: "make it smoother",
        },
        {
          title: "On-brand checkout styling",
          description: "Apply the bakery's brand styling to the checkout pages.",
          role: "design",
          estimatedHours: 4,
          inOriginalScope: false,
          confidence: 0.4,
          sourceQuote: "maybe more on-brand",
        },
        {
          title: "Fix product photos on mobile",
          description: "Investigate and fix product images on small screens.",
          role: "dev",
          estimatedHours: 2,
          inOriginalScope: true,
          confidence: 0.5,
          sourceQuote: "not sure the product photos are working on my phone",
        },
      ],
      requestedDeadline: null,
      clarifyingQuestions: [
        "What specifically feels off in checkout: speed, number of steps, or looks?",
        "Which phone and browser show the photo problem?",
        "Do you have brand guidelines for the checkout pages?",
      ],
    },
  },
];

export function findSample(text: string): SampleMessage | undefined {
  const t = text.trim();
  return SAMPLE_MESSAGES.find((s) => s.text === t);
}
