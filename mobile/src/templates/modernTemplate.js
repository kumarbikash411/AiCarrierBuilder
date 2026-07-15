// Builds a printable HTML string for the "Modern" template. Kept as plain
// template-literal HTML/CSS (not React) so it can be handed straight to
// expo-print for on-device PDF rendering, or used in a WebView preview.

function esc(str = '') {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function bulletsHtml(bullets = []) {
  return bullets
    .filter(Boolean)
    .map((b) => `<li>${esc(b)}</li>`)
    .join('');
}

export function renderModernTemplate(content) {
  const { personalInfo = {}, summary, experience = [], education = [], skills = [], projects = [] } = content;

  return `
  <html>
  <head>
    <meta charset="utf-8" />
    <style>
      * { box-sizing: border-box; }
      body {
        font-family: -apple-system, Helvetica, Arial, sans-serif;
        margin: 0;
        color: #1E293B;
        font-size: 13px;
        line-height: 1.5;
      }
      .page { display: flex; min-height: 100vh; }
      .sidebar {
        width: 32%;
        background: #0F172A;
        color: #E2E8F0;
        padding: 28px 20px;
      }
      .sidebar h1 { font-size: 20px; margin: 0 0 2px; color: #fff; }
      .sidebar .title { color: #38BDF8; font-size: 12px; font-weight: 600; margin-bottom: 20px; }
      .sidebar .section { margin-bottom: 20px; }
      .sidebar .section-label {
        text-transform: uppercase; font-size: 10px; letter-spacing: 1px;
        color: #94A3B8; margin-bottom: 8px; font-weight: 700;
      }
      .sidebar .contact-line { font-size: 11px; color: #CBD5E1; margin-bottom: 4px; }
      .skill-pill {
        display: inline-block; background: #1E293B; color: #E2E8F0;
        border-radius: 10px; padding: 3px 9px; font-size: 10px; margin: 0 4px 4px 0;
      }
      .main { width: 68%; padding: 28px 26px; }
      .main .section { margin-bottom: 18px; }
      .main .section-title {
        font-size: 12px; text-transform: uppercase; letter-spacing: 1px;
        color: #0F172A; font-weight: 700; border-bottom: 2px solid #0F172A;
        padding-bottom: 4px; margin-bottom: 10px;
      }
      .entry { margin-bottom: 12px; }
      .entry-header { display: flex; justify-content: space-between; align-items: baseline; }
      .entry-title { font-weight: 700; font-size: 13px; }
      .entry-sub { color: #475569; font-size: 12px; }
      .entry-date { color: #64748B; font-size: 11px; white-space: nowrap; }
      ul { margin: 6px 0 0; padding-left: 16px; }
      li { margin-bottom: 3px; }
      .summary-text { font-size: 12.5px; color: #334155; }
    </style>
  </head>
  <body>
    <div class="page">
      <div class="sidebar">
        <h1>${esc(personalInfo.fullName || 'Your Name')}</h1>
        <div class="title">${esc(personalInfo.title || '')}</div>

        <div class="section">
          <div class="section-label">Contact</div>
          ${personalInfo.email ? `<div class="contact-line">${esc(personalInfo.email)}</div>` : ''}
          ${personalInfo.phone ? `<div class="contact-line">${esc(personalInfo.phone)}</div>` : ''}
          ${personalInfo.location ? `<div class="contact-line">${esc(personalInfo.location)}</div>` : ''}
          ${personalInfo.linkedin ? `<div class="contact-line">${esc(personalInfo.linkedin)}</div>` : ''}
        </div>

        ${
          skills.length
            ? `<div class="section">
                <div class="section-label">Skills</div>
                <div>${skills.map((s) => `<span class="skill-pill">${esc(s)}</span>`).join('')}</div>
              </div>`
            : ''
        }

        ${
          education.length
            ? `<div class="section">
                <div class="section-label">Education</div>
                ${education
                  .map(
                    (e) => `
                  <div style="margin-bottom:10px;">
                    <div style="font-weight:600; font-size:12px;">${esc(e.school)}</div>
                    <div style="font-size:11px; color:#CBD5E1;">${esc(e.degree)}${e.field ? ', ' + esc(e.field) : ''}</div>
                    <div style="font-size:10px; color:#94A3B8;">${esc(e.startDate)} – ${esc(e.endDate)}</div>
                  </div>`
                  )
                  .join('')}
              </div>`
            : ''
        }
      </div>

      <div class="main">
        ${
          summary
            ? `<div class="section">
                <div class="section-title">Summary</div>
                <div class="summary-text">${esc(summary)}</div>
              </div>`
            : ''
        }

        ${
          experience.length
            ? `<div class="section">
                <div class="section-title">Experience</div>
                ${experience
                  .map(
                    (job) => `
                  <div class="entry">
                    <div class="entry-header">
                      <div class="entry-title">${esc(job.jobTitle)} — ${esc(job.company)}</div>
                      <div class="entry-date">${esc(job.startDate)} – ${esc(job.endDate)}</div>
                    </div>
                    <div class="entry-sub">${esc(job.location || '')}</div>
                    <ul>${bulletsHtml(job.bullets)}</ul>
                  </div>`
                  )
                  .join('')}
              </div>`
            : ''
        }

        ${
          projects.length
            ? `<div class="section">
                <div class="section-title">Projects</div>
                ${projects
                  .map(
                    (p) => `
                  <div class="entry">
                    <div class="entry-title">${esc(p.name)}</div>
                    <div class="summary-text">${esc(p.description)}</div>
                  </div>`
                  )
                  .join('')}
              </div>`
            : ''
        }
      </div>
    </div>
  </body>
  </html>`;
}
