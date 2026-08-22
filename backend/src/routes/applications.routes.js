const express = require('express');
const { z } = require('zod');
const prisma = require('../config/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

const statusValues = ['SAVED', 'APPLIED', 'INTERVIEWING', 'OFFER', 'REJECTED'];
const createSchema = z.object({
  company: z.string().trim().min(1).max(120),
  role: z.string().trim().min(1).max(120),
  location: z.string().trim().max(120).optional().nullable(),
  applicationUrl: z.string().trim().url().max(2000).optional().or(z.literal('')).nullable(),
  notes: z.string().trim().max(4000).optional().nullable(),
  submittedResumeId: z.string().uuid().optional().nullable(),
});
const updateSchema = createSchema.partial().extend({
  status: z.enum(statusValues).optional(),
  appliedAt: z.string().datetime().nullable().optional(),
});

async function ownedApplication(id, userId) {
  return prisma.jobApplication.findFirst({ where: { id, userId } });
}

router.get('/', async (req, res, next) => {
  try {
    const applications = await prisma.jobApplication.findMany({
      where: { userId: req.userId },
      orderBy: [{ updatedAt: 'desc' }],
    });
    res.json(applications);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Enter a company and role, and use a valid application link.' });
    const data = parsed.data;
    if (data.submittedResumeId) {
      const resume = await prisma.resume.findFirst({ where: { id: data.submittedResumeId, userId: req.userId } });
      if (!resume) return res.status(400).json({ error: 'Selected resume was not found.' });
    }
    const application = await prisma.jobApplication.create({
      data: { ...data, applicationUrl: data.applicationUrl || null, userId: req.userId },
    });
    res.status(201).json(application);
  } catch (err) { next(err); }
});

router.put('/:id', async (req, res, next) => {
  try {
    if (!(await ownedApplication(req.params.id, req.userId))) return res.status(404).json({ error: 'Application not found.' });
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid application details.' });
    const data = parsed.data;
    if (data.submittedResumeId) {
      const resume = await prisma.resume.findFirst({ where: { id: data.submittedResumeId, userId: req.userId } });
      if (!resume) return res.status(400).json({ error: 'Selected resume was not found.' });
    }
    const updateData = { ...data };
    // Do not erase optional fields when a caller only changes the status.
    if (Object.prototype.hasOwnProperty.call(data, 'applicationUrl')) {
      updateData.applicationUrl = data.applicationUrl || null;
    }
    if (Object.prototype.hasOwnProperty.call(data, 'appliedAt')) {
      updateData.appliedAt = data.appliedAt ? new Date(data.appliedAt) : null;
    }
    const application = await prisma.jobApplication.update({
      where: { id: req.params.id },
      data: updateData,
    });
    res.json(application);
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    if (!(await ownedApplication(req.params.id, req.userId))) return res.status(404).json({ error: 'Application not found.' });
    await prisma.jobApplication.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) { next(err); }
});

module.exports = router;
