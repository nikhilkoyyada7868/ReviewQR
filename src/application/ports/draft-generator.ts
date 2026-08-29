import type { DraftRequest, DraftResult, Rating } from "@/src/domain/review";

export interface GroundedDraftInput extends DraftRequest {
  restaurantName: string;
  selectedTopics: readonly { label: string; promptDescriptor: string }[];
  approvedFacts: readonly string[];
}

export interface DraftGenerator {
  generate(input: GroundedDraftInput, signal: AbortSignal): Promise<DraftResult>;
}

export interface DraftPolicy {
  sentimentBand(rating: Rating): "constructive" | "balanced" | "positive";
  validate(result: DraftResult, input: GroundedDraftInput): void;
}
