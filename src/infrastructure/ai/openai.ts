import type { DraftGenerator, GroundedDraftInput } from "@/src/application/ports/draft-generator";
import type { DraftResult } from "@/src/domain/review";

export class OpenAIDraftGenerator implements DraftGenerator {
  constructor(
    private readonly apiKey: string,
    private readonly model = "gpt-5-mini",
  ) {}

  async generate(input: GroundedDraftInput, signal: AbortSignal): Promise<DraftResult> {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      signal,
      headers: {
        authorization: `Bearer ${this.apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        max_output_tokens: 160,
        input: [
          {
            role: "developer",
            content: [{ type: "input_text", text: "Write one editable 25-60 word restaurant review suggestion. Match the numeric rating: 1-2 constructive, 3 balanced, 4-5 positive without exaggeration. Use only supplied restaurant name, selected topics, optional customer detail, and approved facts. Never invent dishes, staff, prices, visit circumstances, awards, repeated visits, or allegations. Return only review text." }],
          },
          {
            role: "user",
            content: [{ type: "input_text", text: JSON.stringify({
              restaurantName: input.restaurantName,
              rating: input.rating,
              selectedTopics: input.selectedTopics,
              approvedFacts: input.approvedFacts,
              customerDetail: input.customerDetail,
            }) }],
          },
        ],
      }),
    });
    if (!response.ok) throw new Error(`AI provider failed with status ${response.status}`);
    const body = await response.json() as {
      output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
    };
    const text = body.output
      ?.flatMap((item) => item.content ?? [])
      .find((item) => item.type === "output_text")
      ?.text?.trim();
    if (!text) throw new Error("AI provider returned no review text.");
    return { text, source: "ai" };
  }
}
