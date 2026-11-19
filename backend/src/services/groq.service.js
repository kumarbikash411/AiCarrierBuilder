const axios = require('axios');

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODEL = 'openai/gpt-oss-120b';

async function callGroq(systemPrompt, userPrompt, maxTokens = 600, { jsonMode = false } = {}) {
  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is not configured');
  }

  const configuredModel = process.env.GROQ_MODEL;
  const model = configuredModel === 'llama-3.3-70b-versatile' ? DEFAULT_MODEL : configuredModel || DEFAULT_MODEL;
  const response = await axios.post(
    GROQ_API_URL,
    {
      model,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return response.data.choices?.[0]?.message?.content?.trim() || '';
}

module.exports = { callGroq };
