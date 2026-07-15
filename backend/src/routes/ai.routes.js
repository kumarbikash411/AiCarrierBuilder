const express = require('express');
const { requireAuth } = require('../middleware/auth');
const {
  generateSummary,
  improveBulletPoint,
  suggestSkills,
  tailorToJobDescription,
} = require('../services/ai.service');

const router = express.Router();
router.use(requireAuth);

router.post('/summary', async (req, res) => {
  try {
    const { role, yearsExperience, keySkills, targetRole } = req.body;
    if (!role || !keySkills) return res.status(400).json({ error: 'role and keySkills are required' });
    const summary = await generateSummary({ role, yearsExperience, keySkills, targetRole });
    res.json({ summary });
  } catch (err) {
    res.status(502).json({ error: 'AI service unavailable, try again shortly.' });
  }
});

router.post('/improve-bullet', async (req, res) => {
  try {
    const { bulletText, jobTitle } = req.body;
    if (!bulletText) return res.status(400).json({ error: 'bulletText is required' });
    const improved = await improveBulletPoint({ bulletText, jobTitle });
    res.json({ improved });
  } catch (err) {
    res.status(502).json({ error: 'AI service unavailable, try again shortly.' });
  }
});

router.post('/suggest-skills', async (req, res) => {
  try {
    const { jobTitle, existingSkills } = req.body;
    if (!jobTitle) return res.status(400).json({ error: 'jobTitle is required' });
    const skills = await suggestSkills({ jobTitle, existingSkills });
    res.json({ skills: skills.split(',').map((s) => s.trim()).filter(Boolean) });
  } catch (err) {
    res.status(502).json({ error: 'AI service unavailable, try again shortly.' });
  }
});

router.post('/tailor-to-job', async (req, res) => {
  try {
    const { resumeSummary, experienceText, jobDescription } = req.body;
    if (!jobDescription) return res.status(400).json({ error: 'jobDescription is required' });
    const summary = await tailorToJobDescription({ resumeSummary, experienceText, jobDescription });
    res.json({ summary });
  } catch (err) {
    res.status(502).json({ error: 'AI service unavailable, try again shortly.' });
  }
});

module.exports = router;
