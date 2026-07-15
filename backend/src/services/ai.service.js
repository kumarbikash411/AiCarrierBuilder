const axios = require('axios');

async function callClaude(systemPrompt, userPrompt, maxTokens = 600) {
  const response = await axios.post(
    'https://api.anthropic.com/v1/messages',
    {
      model: 'claude-sonnet-4-6',
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    },
    {
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
    }
  );
  const textBlock = response.data.content.find((b) => b.type === 'text');
  return textBlock ? textBlock.text.trim() : '';
}

const RESUME_WRITER_SYSTEM = `You are an expert resume writer. You write clear, concise,
achievement-oriented resume content. Use strong action verbs, quantify impact wherever
plausible, and avoid generic filler phrases like "responsible for" or "hard-working team
player". Never invent specific numbers or facts not implied by what the user gave you —
if you add a plausible metric placeholder, mark it clearly like "[X%]" so the user knows
to fill in a real figure. Keep formatting plain (no markdown headers), since this text goes
directly into a resume.`;

async function generateSummary({ role, yearsExperience, keySkills, targetRole }) {
  const prompt = `Write a 3-4 sentence professional resume summary for someone who is a
${role} with about ${yearsExperience} years of experience. Their key skills include:
${keySkills}. ${targetRole ? `They are targeting roles like: ${targetRole}.` : ''}
Return ONLY the summary text, no preamble.`;
  return callClaude(RESUME_WRITER_SYSTEM, prompt, 300);
}

async function improveBulletPoint({ bulletText, jobTitle }) {
  const prompt = `Rewrite this resume bullet point to be more achievement-oriented and
concise, for someone working as a ${jobTitle || 'professional'}. Use a strong action verb
and quantify impact if plausible (mark unknown numbers as [X%] or [X] rather than
inventing specifics).

Original bullet: "${bulletText}"

Return ONLY the rewritten bullet point, no preamble, no quotes.`;
  return callClaude(RESUME_WRITER_SYSTEM, prompt, 150);
}

async function suggestSkills({ jobTitle, existingSkills }) {
  const prompt = `Suggest 8-10 relevant resume skills (mix of technical and soft skills)
for a ${jobTitle}. They already have: ${existingSkills || 'none listed yet'}. Don't repeat
skills they already have. Return ONLY a comma-separated list, no preamble, no numbering.`;
  return callClaude(RESUME_WRITER_SYSTEM, prompt, 200);
}

async function tailorToJobDescription({ resumeSummary, experienceText, jobDescription }) {
  const prompt = `Here is a candidate's current resume summary and experience section:

SUMMARY: ${resumeSummary}

EXPERIENCE: ${experienceText}

Here is a job description they are applying to:

${jobDescription}

Suggest a revised summary (3-4 sentences) that better aligns the candidate's existing
background with this specific job description. Only use skills/experience the candidate
already has — do not invent new experience. Return ONLY the revised summary, no preamble.`;
  return callClaude(RESUME_WRITER_SYSTEM, prompt, 350);
}

module.exports = { generateSummary, improveBulletPoint, suggestSkills, tailorToJobDescription };
