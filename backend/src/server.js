require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { execSync } = require('child_process');

const authRoutes = require('./routes/auth.routes');
const resumeRoutes = require('./routes/resume.routes');
const aiRoutes = require('./routes/ai.routes');
const interviewRoutes = require('./routes/interview.routes');
const jobmatchRoutes = require('./routes/jobmatch.routes');
const applicationRoutes = require('./routes/applications.routes');

const app = express();

app.use(helmet());
app.use(cors());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 300 }));

app.use(express.json({ limit: '2mb' }));

app.get('/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/resumes', resumeRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/interview', interviewRoutes);
app.use('/api/jobmatch', jobmatchRoutes);
app.use('/api/applications', applicationRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

// Ensure the database schema is up to date before serving any requests.
// Railway's pre-deploy command (see railway.json) already runs this, but we
// run it here as well as a safety net in case the pre-deploy step is not
// configured (e.g. local/manual deployments), so tables like User,
// Subscription and OtpCode always exist before the app accepts traffic.
try {
  console.log('Running Prisma migrations...');
  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    cwd: __dirname + '/../',
  });
  console.log('Migrations completed');
} catch (err) {
  console.error('Migration failed:', err.message);
}

const PORT = process.env.PORT || 4001;
app.listen(PORT, () => console.log(`Resume Builder AI backend running on port ${PORT}`));
