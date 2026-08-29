import type { DraftGenerator, DraftPolicy, GroundedDraftInput } from "@/src/application/ports/draft-generator";
import type { DraftResult, Rating } from "@/src/domain/review";

export class DefaultDraftPolicy implements DraftPolicy {
  sentimentBand(rating: Rating) {
    if (rating <= 2) return "constructive" as const;
    if (rating === 3) return "balanced" as const;
    return "positive" as const;
  }

  validate(result: DraftResult, input: GroundedDraftInput): void {
    const text = result.text.trim();
    const words = text.split(/\s+/u).filter(Boolean).length;
    if (text.length < 10 || text.length > 1_000 || words < 12 || words > 90) {
      throw new Error("Generated draft failed length policy.");
    }

    const normalizedText = normalize(text);
    if (!normalizedText.includes(normalize(input.restaurantName))) {
      throw new Error("Generated draft omitted the restaurant identity.");
    }
    const mentionsSelectedTopic = input.selectedTopics.some((topic) => {
      const label = normalize(topic.label);
      const descriptorWords = normalize(topic.promptDescriptor)
        .split(" ")
        .filter((word) => word.length >= 4);
      return normalizedText.includes(label) || descriptorWords.some((word) => normalizedText.includes(word));
    });
    if (!mentionsSelectedTopic) {
      throw new Error("Generated draft was not grounded in a selected topic.");
    }

    const suppliedText = normalize([
      input.restaurantName,
      ...input.selectedTopics.flatMap((topic) => [topic.label, topic.promptDescriptor]),
      ...input.approvedFacts,
      input.customerDetail ?? "",
    ].join(" "));
    const unsupportedClaimPatterns = [
      /\b(?:award[- ]winning|michelin|celebrity|famous chef|number one|#1)\b/iu,
      /\b(?:waiter|waitress|server|manager|chef)\s+[A-Z][\p{L}'-]+/u,
      /(?:[$€£₹]|\b(?:usd|inr|dollars?|rupees?)\b)\s*\d|\d\s*(?:[$€£₹]|usd|inr|dollars?|rupees?)/iu,
      /\b(?:every time|as always|again and again|my usual|regular customer)\b/iu,
      /\b(?:birthday|anniversary|date night|business lunch|family dinner|celebration)\b/iu,
      /\b(?:pizza|pasta|burger|biryani|curry|dosa|sushi|steak|dessert|coffee|cocktail|noodles|soup|chicken|fish)\b/iu,
    ];
    for (const pattern of unsupportedClaimPatterns) {
      const match = text.match(pattern)?.[0];
      if (match && !suppliedText.includes(normalize(match))) {
        throw new Error("Generated draft contained an unsupported claim.");
      }
    }

    const strongPositive = /\b(?:amazing|excellent|perfect|outstanding|best|flawless|highly recommend|great experience)\b/iu;
    const strongNegative = /\b(?:awful|terrible|worst|disgusting|unsafe|horrible|never again)\b/iu;
    if (input.rating <= 2 && strongPositive.test(text)) {
      throw new Error("Generated draft sentiment did not match the rating.");
    }
    if (input.rating >= 4 && strongNegative.test(text)) {
      throw new Error("Generated draft sentiment did not match the rating.");
    }
    if (input.rating === 3 && (strongPositive.test(text) || strongNegative.test(text))) {
      throw new Error("Generated draft was not balanced for a three-star rating.");
    }
  }
}

function normalize(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

function joinTopics(topics: readonly { label: string }[]): string {
  const labels = topics.map((topic) => topic.label.toLocaleLowerCase());
  if (labels.length === 1) return labels[0];
  return `${labels.slice(0, -1).join(", ")} and ${labels.at(-1)}`;
}

export class DeterministicDraftGenerator implements DraftGenerator {
  async generate(input: GroundedDraftInput, signal: AbortSignal): Promise<DraftResult> {
    void signal;
    const topics = joinTopics(input.selectedTopics);
    const detail = input.customerDetail ? ` ${input.customerDetail.trim()}` : "";
    let text: string;
    if (input.rating <= 2) {
      text = `My experience at ${input.restaurantName} fell short of expectations, particularly with ${topics}.${detail} I hope these areas receive attention so a future visit can feel more satisfactory.`;
    } else if (input.rating === 3) {
      text = `My visit to ${input.restaurantName} was a mixed experience. ${topics[0]?.toUpperCase()}${topics.slice(1)} stood out, though there is still room for improvement.${detail} Overall, it was an okay visit.`;
    } else if (input.rating === 4) {
      text = `I had a good experience at ${input.restaurantName}, especially with ${topics}.${detail} The visit was enjoyable overall, with just a little room for improvement.`;
    } else {
      text = `I had a great experience at ${input.restaurantName}. ${topics[0]?.toUpperCase()}${topics.slice(1)} made the visit especially enjoyable.${detail} I would be happy to visit again.`;
    }
    return { text: text.replace(/\s+/gu, " ").trim(), source: "fallback" };
  }
}
