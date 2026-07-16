const { callGroq } = require('./groq.service');

const INTERVIEW_COACH_SYSTEM = `You are an experienced interview coach. You produce realistic
interview questions for a specific role, each paired with a short tip on how to structure a
strong answer (not a full scripted answer — a strategy, like "use the STAR method and focus
on X" or "walk through your reasoning on trade-offs before giving a final answer"). You must
respond with ONLY valid JSON, no markdown code fences, no preamble, matching exactly this
shape:
{
  "questions": [
    { "category": "Behavioral" | "Technical" | "Role-specific" | "Situational",
      "question": "...",
      "tip": "..." }
  ]
}`;

async function generateInterviewQuestions({ jobTitle, jobDescription, experienceLevel }) {
  const prompt = `Generate 10 likely interview questions for a candidate interviewing for:
Role: ${jobTitle}
Experience level: ${experienceLevel || 'mid-level'}
${jobDescription ? `Job description:\n${jobDescription}` : ''}

Mix categories: a few Behavioral, a few Technical or Role-specific, and 1-2 Situational.
Return ONLY the JSON object described in your instructions.`;

  const raw = await callGroq(INTERVIEW_COACH_SYSTEM, prompt, 1400, { jsonMode: true });
  return JSON.parse(raw);
}

module.exports = { generateInterviewQuestions };
