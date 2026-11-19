const express = require('express');
const path = require('path');
const multer = require('multer');
const prisma = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const { scoreAndStructureResume, fixResumeWithAI } = require('../services/ai.service');
const { PDFParse } = require('pdf-parse');
const mammoth = require('mammoth');

const router = express.Router();
router.use(requireAuth);

const uploadResume = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter(req, file, callback) {
    const extension = path.extname(file.originalname).toLowerCase();
    if (!['.pdf', '.docx'].includes(extension)) {
      const error = new Error('Choose a PDF or Word (.docx) file');
      error.statusCode = 400;
      return callback(error);
    }
    callback(null, true);
  },
});

router.post('/import', (req, res, next) => {
  uploadResume.single('file')(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
      return res.status(status).json({ error: status === 413 ? 'Resume file must be 10 MB or smaller' : 'Choose one PDF or Word (.docx) file' });
    }
    return res.status(err.statusCode || 400).json({ error: err.message || 'Could not read that file' });
  });
}, async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Choose a PDF or Word (.docx) file' });

  const extension = path.extname(req.file.originalname).toLowerCase();
  let resumeText;
  try {
    if (extension === '.pdf') {
      if (req.file.buffer.subarray(0, 5).toString() !== '%PDF-') {
        return res.status(400).json({ error: 'This file does not appear to be a valid PDF' });
      }
      const parser = new PDFParse({ data: req.file.buffer });
      try {
        const parsed = await parser.getText();
        resumeText = parsed.text;
      } finally {
        await parser.destroy();
      }
    } else {
      if (req.file.buffer.subarray(0, 2).toString() !== 'PK') {
        return res.status(400).json({ error: 'This file does not appear to be a valid Word document' });
      }
      const parsed = await mammoth.extractRawText({ buffer: req.file.buffer });
      resumeText = parsed.value;
    }
  } catch (err) {
    console.error('Resume file parsing failed:', err.message);
    return res.status(422).json({ error: 'Could not read this file. Try exporting it as a text-based PDF or .docx document.' });
  }

  resumeText = resumeText?.replace(/\u0000/g, '').trim();
  if (!resumeText) return res.status(422).json({ error: 'No selectable text found. Scanned image PDFs are not supported yet.' });

  try {
    const review = await scoreAndStructureResume(resumeText.slice(0, 25000));
    const fileTitle = path.basename(req.file.originalname, extension).slice(0, 120) || 'Imported Resume';
    const content = { ...review.content, aiReview: {
      score: review.score,
      scoreSummary: review.scoreSummary,
      strengths: review.strengths,
      improvements: review.improvements,
    } };
    const resume = await prisma.resume.create({
      data: { userId: req.userId, title: fileTitle, template: 'modern', content },
      select: { id: true, title: true, template: true, updatedAt: true, content: true },
    });
    res.status(201).json({ resume, aiReview: content.aiReview });
  } catch (err) {
    console.error('Resume AI review failed:', err.message);
    res.status(502).json({ error: 'Could not score this resume right now. Please try again later.' });
  }
});

router.get('/', async (req, res) => {
  const resumes = await prisma.resume.findMany({
    where: { userId: req.userId },
    orderBy: { updatedAt: 'desc' },
    select: { id: true, title: true, template: true, updatedAt: true },
  });
  res.json(resumes);
});

router.post('/:id/ai-fix', async (req, res) => {
  const resume = await prisma.resume.findUnique({ where: { id: req.params.id } });
  if (!resume || resume.userId !== req.userId) return res.status(404).json({ error: 'Not found' });
  try {
    const improvements = resume.content?.aiReview?.improvements || [];
    const content = await fixResumeWithAI(resume.content, improvements);
    const fixed = await prisma.resume.create({
      data: { userId: req.userId, title: `${resume.title} (AI improved)`.slice(0, 140), template: resume.template, content },
      select: { id: true, title: true, template: true, updatedAt: true },
    });
    res.status(201).json({ resume: fixed });
  } catch (err) {
    console.error('Resume AI fix failed:', err.message);
    res.status(502).json({ error: 'Could not improve this resume right now. Please try again later.' });
  }
});

router.get('/:id', async (req, res) => {
  const resume = await prisma.resume.findUnique({ where: { id: req.params.id } });
  if (!resume || resume.userId !== req.userId) return res.status(404).json({ error: 'Not found' });
  res.json(resume);
});

router.post('/', async (req, res) => {
  const { title, template, content } = req.body;
  const resume = await prisma.resume.create({
    data: {
      userId: req.userId,
      title: title || 'Untitled Resume',
      template: template || 'modern',
      content: content || {},
    },
  });
  res.status(201).json(resume);
});

router.put('/:id', async (req, res) => {
  const resume = await prisma.resume.findUnique({ where: { id: req.params.id } });
  if (!resume || resume.userId !== req.userId) return res.status(404).json({ error: 'Not found' });

  const updated = await prisma.resume.update({
    where: { id: req.params.id },
    data: {
      title: req.body.title ?? resume.title,
      template: req.body.template ?? resume.template,
      content: req.body.content ?? resume.content,
    },
  });
  res.json(updated);
});

router.delete('/:id', async (req, res) => {
  const resume = await prisma.resume.findUnique({ where: { id: req.params.id } });
  if (!resume || resume.userId !== req.userId) return res.status(404).json({ error: 'Not found' });
  await prisma.resume.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

module.exports = router;
