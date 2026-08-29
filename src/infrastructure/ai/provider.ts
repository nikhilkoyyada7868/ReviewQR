import type { DraftGenerator } from "@/src/application/ports/draft-generator";
import type { ReviewQREnv } from "@/src/infrastructure/runtime-env";
import { DeterministicDraftGenerator } from "./deterministic";
import { OpenAIDraftGenerator } from "./openai";

export type AiProviderName = "openai" | "deterministic";

export interface DraftGeneratorFactory {
  /** Always returns a usable generator; missing credentials select fallback. */
  create(): DraftGenerator;
}

export function configuredDraftGenerators(env: ReviewQREnv): {
  primary: DraftGenerator;
  fallback: DraftGenerator;
} {
  const fallback = new DeterministicDraftGenerator();
  return {
    primary: env.OPENAI_API_KEY
      ? new OpenAIDraftGenerator(env.OPENAI_API_KEY, env.OPENAI_MODEL)
      : fallback,
    fallback,
  };
}
