export interface AnswerPromptInput {
  question: string;
  analyticsResult: unknown;
}

export function buildAnswerPrompt({
  question,
  analyticsResult,
}: AnswerPromptInput): string {
  return `You are a business intelligence analyst.

Answer the user's question using ONLY the analytics result provided below.

User question:
${question}

Analytics result:
${JSON.stringify(analyticsResult)}

Instructions:
- Give a concise, clear business answer.
- Mention the important numbers from the result.
- Do not invent or assume data that is not present.
- Do not describe the internal API, query, or implementation.
- If the result contains multiple rows, summarize the relevant comparison clearly.
`;
}
