function esc(str = '') {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function bulletsHtml(bullets = []) {
  return bullets
    .filter(Boolean)
    .map((b) => `<li>${esc(b)}</li>`)
    .join('');
}

export function renderClassicTemplate(content) {
  const { personalInfo = {}, summary, experience = [], education = [], skills = [], projects = [] } = content;

  const contactLine = [personalInfo.email, personalInfo.phone, personalInfo.location, personalInfo.linkedin]
    .filter(Boolean)
    .map(esc)
    .join('  •  ');

  return `
  <html>
  <head>
    <meta charset="utf-8" />
    <style>
      * { box-sizing: border-box; }
      body {
        font-family: Georgia, 'Times New Roman', serif;
        margin: 0;
        padding: 34px 40px;
        color: #1F2937;
        font-size: 13px;
        line-height: 1.55;
      }
      .header { text-align: center; margin-bottom: 18px; border-bottom: 1.5px solid #1F2937; padding-bottom: 14px; }
      .header h1 { margin: 0 0 4px; font-size: 24px; letter-spacing: 0.5px; }
      .header .title { font-size: 13px; color: #4B5563; font-style: italic; margin-bottom: 6px; }
      .header .contact { font-size: 11px; color: #4B5563; }
      .section { margin-bottom: 16px; }
      .section-title {
        font-size: 13px; font-weight: 700; text-transform: uppercase;
        letter-spacing: 1.2px; margin-bottom: 8px; color: #1F2937;
      }
      .entry { margin-bottom: 12px; }
      .entry-header { display: flex; justify-content: space-between; align-items: baseline; }
      .entry-title { font-weight: 700; font-size: 13px; }
      .entry-sub { font-style: italic; color: #4B5563; font-size: 12px; }
      .entry-date { color: #6B7280; font-size: 11.5px; white-space: nowrap; }
      ul { margin: 6px 0 0; padding-left: 18px; }
      li { margin-bottom: 3px; }
      .skills-line { font-size: 12.5px; }
    </style>
  </head>
  <body>
    <div class="header">
      <h1>${esc(personalInfo.fullName || 'Your Name')}</h1>
      <div class="title">${esc(personalInfo.title || '')}</div>
      <div class="contact">${contactLine}</div>
    </div>

    ${summary ? `<div class="section"><div class="section-title">Summary</div><div>${esc(summary)}</div></div>` : ''}

    ${
      experience.length
        ? `<div class="section">
            <div class="section-title">Experience</div>
            ${experience
              .map(
                (job) => `
              <div class="entry">
                <div class="entry-header">
                  <div class="entry-title">${esc(job.jobTitle)}, ${esc(job.company)}</div>
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
      education.length
        ? `<div class="section">
            <div class="section-title">Education</div>
            ${education
              .map(
                (e) => `
              <div class="entry">
                <div class="entry-header">
                  <div class="entry-title">${esc(e.school)}</div>
                  <div class="entry-date">${esc(e.startDate)} – ${esc(e.endDate)}</div>
                </div>
                <div class="entry-sub">${esc(e.degree)}${e.field ? ', ' + esc(e.field) : ''}</div>
              </div>`
              )
              .join('')}
          </div>`
        : ''
    }

    ${skills.length ? `<div class="section"><div class="section-title">Skills</div><div class="skills-line">${skills.map(esc).join('  •  ')}</div></div>` : ''}

    ${
      projects.length
        ? `<div class="section">
            <div class="section-title">Projects</div>
            ${projects
              .map((p) => `<div class="entry"><div class="entry-title">${esc(p.name)}</div><div>${esc(p.description)}</div></div>`)
              .join('')}
          </div>`
        : ''
    }
  </body>
  </html>`;
}
