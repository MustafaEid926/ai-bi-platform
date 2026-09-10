export interface LlmGenerateRequest {
  prompt: string;
  max_new_tokens?: number;
}

export interface LlmGenerateResponse {
  answer: string;
}

export class LlmClient {
  private readonly baseUrl: string;

  constructor() {
    const baseUrl = process.env.LLM_BASE_URL?.trim();

    if (!baseUrl) {
      throw new Error('LLM_BASE_URL is not configured');
    }

    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

    async generate(
    request: LlmGenerateRequest,
  ): Promise<LlmGenerateResponse> {
    const response = await fetch(`${this.baseUrl}/generate`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        prompt: request.prompt,
        max_new_tokens: request.max_new_tokens ?? 600,
      }),
    });

    const rawBody = await response.text();

    let body: Partial<LlmGenerateResponse> & {
      detail?: string;
    };

    try {
      body = JSON.parse(rawBody);
    } catch {
      throw new Error(
        `LLM returned a non-JSON response (status ${response.status})`,
      );
    }

    if (!response.ok) {
      throw new Error(
        body.detail ??
          `LLM request failed with status ${response.status}`,
      );
    }

    if (typeof body.answer !== 'string') {
      throw new Error('LLM response does not contain a valid answer');
    }

    return {
      answer: body.answer,
    };
  }
}