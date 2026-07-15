const express = require('express');
const prisma = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const { requireActiveSubscription } = require('../middleware/subscription');
const { scoreResumeAgainstJob, generateCoverLetter } = require('../services/jobmatch.service');

const router = express.Router();
router.use(requireAuth, requireActiveSubscription);

async function loadOwnedResume(resumeId, userId) {
  const resume = await prisma.resume.findUnique({ where: { id: resumeId } });
  if (!resume || resume.userId !== userId) return null;
  return resume;
}

router.post('/score', async (req, res) => {
  try {
    const { resumeId, jobDescription } = req.body;
    if (!resumeId || !jobDescription) {
      return res.status(400).json({ error: 'resumeId and jobDescription are required' });
    }
    const resume = await loadOwnedResume(resumeId, req.userId);
    if (!resume) return res.status(404).json({ error: 'Resume not found' });

    const result = await scoreResumeAgainstJob({ resumeContent: resume.content, jobDescription });
    res.json(result);
  } catch (err) {
    res.status(502).json({ error: 'Could not score resume right now.' });
  }
});

router.post('/cover-letter', async (req, res) => {
  try {
    const { resumeId, jobDescription, companyName } = req.body;
    if (!resumeId || !jobDescription) {
      return res.status(400).json({ error: 'resumeId and jobDescription are required' });
    }
    const resume = await loadOwnedResume(resumeId, req.userId);
    if (!resume) return res.status(404).json({ error: 'Resume not found' });

    const letter = await generateCoverLetter({ resumeContent: resume.content, jobDescription, companyName });
    res.json({ letter });
  } catch (err) {
    res.status(502).json({ error: 'Could not generate cover letter right now.' });
  }
});

module.exports = router;
