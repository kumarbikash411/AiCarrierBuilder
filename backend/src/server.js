require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth.routes');
const resumeRoutes = require('./routes/resume.routes');
const aiRoutes = require('./routes/ai.routes');
const subscriptionRoutes = require('./routes/subscription.routes');
const interviewRoutes = require('./routes/interview.routes');
const jobmatchRoutes = require('./routes/jobmatch.routes');

const app = express();

app.use(helmet());
app.use(cors());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 300 }));

// Razorpay webhook needs the RAW body for signature verification
app.use('/api/subscription/webhook', express.raw({ type: '*/*' }));
app.use(express.json({ limit: '2mb' }));

app.get('/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/resumes', resumeRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/interview', interviewRoutes);
app.use('/api/jobmatch', jobmatchRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 4001;
app.listen(PORT, () => console.log(`Resume Builder AI backend running on port ${PORT}`));
