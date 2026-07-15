const express = require('express');
const prisma = require('../config/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const resumes = await prisma.resume.findMany({
    where: { userId: req.userId },
    orderBy: { updatedAt: 'desc' },
    select: { id: true, title: true, template: true, updatedAt: true },
  });
  res.json(resumes);
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
