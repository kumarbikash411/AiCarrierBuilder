const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { generateInterviewQuestions } = require('../services/interview.service');

const router = express.Router();
router.use(requireAuth);

router.post('/questions', async (req, res) => {
  try {
    const { jobTitle, jobDescription, experienceLevel } = req.body;
    if (!jobTitle) return res.status(400).json({ error: 'jobTitle is required' });

    const result = await generateInterviewQuestions({ jobTitle, jobDescription, experienceLevel });
    res.json(result);
  } catch (err) {
    res.status(502).json({ error: 'Could not generate interview questions right now.' });
  }
});

module.exports = router;
