const axios = require('axios');

async function callClaude(systemPrompt, userPrompt, maxTokens = 1200) {
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

function resumeToPlainText(content) {
  const { personalInfo = {}, summary, experience = [], education = [], skills = [] } = content;
  const expText = experience
    .map((e) => `${e.jobTitle} at ${e.company}: ${(e.bullets || []).join('. ')}`)
    .join('\n');
  const eduText = education.map((e) => `${e.degree} in ${e.field} - ${e.school}`).join('\n');
  return `Title: ${personalInfo.title || ''}
Summary: ${summary || ''}
Experience:\n${expText}
Education:\n${eduText}
Skills: ${skills.join(', ')}`;
}

const MATCH_SYSTEM = `You are an ATS (Applicant Tracking System) simulation and career coach.
Given a resume and a target job description, you estimate how well the resume would score
in automated keyword/skill screening AND give concrete, honest advice on what's missing.
Be direct — the goal is to help this person actually get an interview call, not to flatter
them. Do not invent experience or skills the resume doesn't support. Respond with ONLY valid
JSON, no markdown fences, matching exactly this shape:
{
  "matchScore": <integer 0-100>,
  "matchingKeywords": ["...".],
  "missingKeywords": ["..."],
  "suggestions": ["specific, actionable suggestion", "..."]
}`;

async function scoreResumeAgainstJob({ resumeContent, jobDescription }) {
  const resumeText = resumeToPlainText(resumeContent);
  const prompt = `RESUME:\n${resumeText}\n\nJOB DESCRIPTION:\n${jobDescription}\n\nReturn ONLY the JSON object described in your instructions.`;
  const raw = await callClaude(MATCH_SYSTEM, prompt, 900);
  const cleaned = raw.replace(/^```json\s*|```$/g, '').trim();
  return JSON.parse(cleaned);
}

const COVER_LETTER_SYSTEM = `You are an expert cover letter writer. You write concise
(under 300 words), specific cover letters that connect the candidate's actual background
to the target role — no generic filler, no invented experience. Plain text output, no
markdown, ready to paste into an email or application form.`;

async function generateCoverLetter({ resumeContent, jobDescription, companyName }) {
  const resumeText = resumeToPlainText(resumeContent);
  const prompt = `RESUME:\n${resumeText}\n\nJOB DESCRIPTION:\n${jobDescription}\n\n${
    companyName ? `Company name: ${companyName}\n` : ''
  }Write a tailored cover letter. Return ONLY the letter text, no preamble.`;
  return callClaude(COVER_LETTER_SYSTEM, prompt, 700);
}

module.exports = { scoreResumeAgainstJob, generateCoverLetter };
