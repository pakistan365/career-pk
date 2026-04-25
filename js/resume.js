// ============================================================
// CareerHub Pakistan — resume.js
// Resume builder: live preview, multi-template, PDF export
// ============================================================

let currentTemplate = 'classic';
let eduCount  = 0;
let expCount  = 0;
let certCount = 0;

// ── Template switcher ────────────────────────────────────────
function setTemplate(name) {
  currentTemplate = name;
  document.querySelectorAll('.template-btn').forEach(b => {
    b.classList.toggle('active', b.textContent.toLowerCase().includes(name));
  });
  updatePreview();
}

// ── Add/remove entry blocks ──────────────────────────────────
function addEducation() {
  eduCount++;
  const id = 'edu' + eduCount;
  const html = `
  <div class="entry-block" id="${id}">
    <button class="btn-remove" onclick="removeEntry('${id}')" title="Remove"><i class="fa fa-times"></i></button>
    <div class="form-row">
      <div class="form-group"><label>Degree / Certificate</label><input type="text" placeholder="BSc Computer Science" oninput="updatePreview()" class="edu-degree"/></div>
      <div class="form-group"><label>Institution</label><input type="text" placeholder="University of Karachi" oninput="updatePreview()" class="edu-institution"/></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Year</label><input type="text" placeholder="2020 – 2024" oninput="updatePreview()" class="edu-year"/></div>
      <div class="form-group"><label>Grade / CGPA</label><input type="text" placeholder="3.5/4.0 or 85%" oninput="updatePreview()" class="edu-grade"/></div>
    </div>
  </div>`;
  document.getElementById('educationList').insertAdjacentHTML('beforeend', html);
  updatePreview();
}

function addExperience() {
  expCount++;
  const id = 'exp' + expCount;
  const html = `
  <div class="entry-block" id="${id}">
    <button class="btn-remove" onclick="removeEntry('${id}')" title="Remove"><i class="fa fa-times"></i></button>
    <div class="form-row">
      <div class="form-group"><label>Job Title</label><input type="text" placeholder="Frontend Developer" oninput="updatePreview()" class="exp-title"/></div>
      <div class="form-group"><label>Company / Organization</label><input type="text" placeholder="Systems Limited" oninput="updatePreview()" class="exp-company"/></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Duration</label><input type="text" placeholder="Jan 2023 – Present" oninput="updatePreview()" class="exp-duration"/></div>
      <div class="form-group"><label>Location</label><input type="text" placeholder="Lahore, Pakistan" oninput="updatePreview()" class="exp-location"/></div>
    </div>
    <div class="form-group"><label>Description (optional)</label><textarea rows="2" placeholder="Key responsibilities and achievements..." oninput="updatePreview()" class="exp-desc"></textarea></div>
  </div>`;
  document.getElementById('experienceList').insertAdjacentHTML('beforeend', html);
  updatePreview();
}

function addCert() {
  certCount++;
  const id = 'cert' + certCount;
  const html = `
  <div class="entry-block" id="${id}">
    <button class="btn-remove" onclick="removeEntry('${id}')" title="Remove"><i class="fa fa-times"></i></button>
    <div class="form-row">
      <div class="form-group"><label>Certification Name</label><input type="text" placeholder="AWS Certified Developer" oninput="updatePreview()" class="cert-name"/></div>
      <div class="form-group"><label>Issuer</label><input type="text" placeholder="Amazon Web Services" oninput="updatePreview()" class="cert-issuer"/></div>
    </div>
    <div class="form-group"><label>Year</label><input type="text" placeholder="2024" oninput="updatePreview()" class="cert-year" style="max-width:120px"/></div>
  </div>`;
  document.getElementById('certList').insertAdjacentHTML('beforeend', html);
  updatePreview();
}

function removeEntry(id) {
  document.getElementById(id)?.remove();
  updatePreview();
}

// ── Collect form data ────────────────────────────────────────
function collectData() {
  const val = id => (document.getElementById(id)?.value || '').trim();

  // Education entries
  const eduBlocks = document.querySelectorAll('#educationList .entry-block');
  const education = [];
  eduBlocks.forEach(block => {
    const deg  = block.querySelector('.edu-degree')?.value?.trim();
    const inst = block.querySelector('.edu-institution')?.value?.trim();
    const yr   = block.querySelector('.edu-year')?.value?.trim();
    const gr   = block.querySelector('.edu-grade')?.value?.trim();
    if (deg || inst) education.push({ degree: deg, institution: inst, year: yr, grade: gr });
  });

  // Experience entries
  const expBlocks = document.querySelectorAll('#experienceList .entry-block');
  const experience = [];
  expBlocks.forEach(block => {
    const title    = block.querySelector('.exp-title')?.value?.trim();
    const company  = block.querySelector('.exp-company')?.value?.trim();
    const duration = block.querySelector('.exp-duration')?.value?.trim();
    const location = block.querySelector('.exp-location')?.value?.trim();
    const desc     = block.querySelector('.exp-desc')?.value?.trim();
    if (title || company) experience.push({ title, company, duration, location, desc });
  });

  // Certifications
  const certBlocks = document.querySelectorAll('#certList .entry-block');
  const certs = [];
  certBlocks.forEach(block => {
    const name   = block.querySelector('.cert-name')?.value?.trim();
    const issuer = block.querySelector('.cert-issuer')?.value?.trim();
    const year   = block.querySelector('.cert-year')?.value?.trim();
    if (name) certs.push({ name, issuer, year });
  });

  return {
    name:       val('rName')      || 'Your Name',
    title:      val('rTitle')     || '',
    email:      val('rEmail')     || '',
    phone:      val('rPhone')     || '',
    city:       val('rCity')      || '',
    linkedin:   val('rLinkedin')  || '',
    summary:    val('rSummary')   || '',
    skills:     val('rSkills')    || '',
    languages:  val('rLanguages') || '',
    education,
    experience,
    certs
  };
}

// ── Render preview ────────────────────────────────────────────
function updatePreview() {
  const d = collectData();

  if (currentTemplate === 'classic') renderClassic(d);
  else if (currentTemplate === 'modern') renderModern(d);
  else renderMinimal(d);
}

// ── Template: Classic ─────────────────────────────────────────
function renderClassic(d) {
  document.getElementById('resumePreview').innerHTML = `
  <div class="resume-template resume-classic" id="resumeDoc">
    <div class="rv-header">
      <h1 class="rv-name">${esc(d.name)}</h1>
      ${d.title ? `<p class="rv-title">${esc(d.title)}</p>` : ''}
      <div class="rv-contact">
        ${d.email    ? `<span><i class="fa fa-envelope"></i> ${esc(d.email)}</span>` : ''}
        ${d.phone    ? `<span><i class="fa fa-phone"></i> ${esc(d.phone)}</span>` : ''}
        ${d.city     ? `<span><i class="fa fa-map-marker-alt"></i> ${esc(d.city)}</span>` : ''}
        ${d.linkedin ? `<span><i class="fab fa-linkedin"></i> ${esc(d.linkedin)}</span>` : ''}
      </div>
    </div>
    <div class="rv-body">
      ${d.summary ? `
      <div class="rv-section">
        <h2 class="rv-section-title">Summary</h2>
        <p style="font-size:12px;color:#333;line-height:1.6">${esc(d.summary)}</p>
      </div>` : ''}

      ${d.education.length > 0 ? `
      <div class="rv-section">
        <h2 class="rv-section-title">Education</h2>
        ${d.education.map(e => `
        <div class="rv-entry">
          <div style="display:flex;justify-content:space-between;align-items:flex-start">
            <div>
              <div class="rv-entry-title">${esc(e.degree)}</div>
              <div class="rv-entry-sub">${esc(e.institution)}${e.grade ? ` &mdash; ${esc(e.grade)}` : ''}</div>
            </div>
            ${e.year ? `<div class="rv-entry-date">${esc(e.year)}</div>` : ''}
          </div>
        </div>`).join('')}
      </div>` : ''}

      ${d.experience.length > 0 ? `
      <div class="rv-section">
        <h2 class="rv-section-title">Experience</h2>
        ${d.experience.map(e => `
        <div class="rv-entry">
          <div style="display:flex;justify-content:space-between;align-items:flex-start">
            <div>
              <div class="rv-entry-title">${esc(e.title)}</div>
              <div class="rv-entry-sub">${esc(e.company)}${e.location ? ` &bull; ${esc(e.location)}` : ''}</div>
            </div>
            ${e.duration ? `<div class="rv-entry-date">${esc(e.duration)}</div>` : ''}
          </div>
          ${e.desc ? `<div class="rv-entry-desc">${esc(e.desc)}</div>` : ''}
        </div>`).join('')}
      </div>` : ''}

      ${d.skills ? `
      <div class="rv-section">
        <h2 class="rv-section-title">Skills</h2>
        <div class="rv-skills">
          ${d.skills.split(',').map(s => `<span class="rv-skill-tag">${esc(s.trim())}</span>`).join('')}
        </div>
      </div>` : ''}

      ${d.languages ? `
      <div class="rv-section">
        <h2 class="rv-section-title">Languages</h2>
        <p style="font-size:12px;color:#333">${esc(d.languages)}</p>
      </div>` : ''}

      ${d.certs.length > 0 ? `
      <div class="rv-section">
        <h2 class="rv-section-title">Certifications</h2>
        ${d.certs.map(c => `
        <div class="rv-entry">
          <div class="rv-entry-title">${esc(c.name)}</div>
          <div class="rv-entry-sub">${esc(c.issuer)}${c.year ? ` &bull; ${esc(c.year)}` : ''}</div>
        </div>`).join('')}
      </div>` : ''}
    </div>
  </div>`;
}

// ── Template: Modern (two-column with blue sidebar) ───────────
function renderModern(d) {
  document.getElementById('resumePreview').innerHTML = `
  <div class="resume-template" id="resumeDoc" style="display:flex;min-height:600px;padding:0;background:#fff">
    <!-- Sidebar -->
    <div style="width:200px;background:#1557D0;color:#fff;padding:24px 16px;flex-shrink:0">
      <h1 style="font-family:'DM Serif Display',serif;font-size:18px;color:#fff;margin-bottom:4px;line-height:1.2">${esc(d.name)}</h1>
      ${d.title ? `<p style="font-size:11px;color:rgba(255,255,255,0.8);margin-bottom:16px">${esc(d.title)}</p>` : ''}
      <div style="border-top:1px solid rgba(255,255,255,0.2);padding-top:14px;margin-top:8px">
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:rgba(255,255,255,0.6);margin-bottom:8px">Contact</div>
        ${d.email    ? `<div style="font-size:11px;color:rgba(255,255,255,0.85);margin-bottom:5px"><i class="fa fa-envelope" style="width:14px"></i> ${esc(d.email)}</div>` : ''}
        ${d.phone    ? `<div style="font-size:11px;color:rgba(255,255,255,0.85);margin-bottom:5px"><i class="fa fa-phone" style="width:14px"></i> ${esc(d.phone)}</div>` : ''}
        ${d.city     ? `<div style="font-size:11px;color:rgba(255,255,255,0.85);margin-bottom:5px"><i class="fa fa-map-marker-alt" style="width:14px"></i> ${esc(d.city)}</div>` : ''}
        ${d.linkedin ? `<div style="font-size:11px;color:rgba(255,255,255,0.85);margin-bottom:5px"><i class="fab fa-linkedin" style="width:14px"></i> ${esc(d.linkedin)}</div>` : ''}
      </div>
      ${d.skills ? `
      <div style="border-top:1px solid rgba(255,255,255,0.2);padding-top:14px;margin-top:14px">
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:rgba(255,255,255,0.6);margin-bottom:8px">Skills</div>
        ${d.skills.split(',').map(s => `<div style="font-size:11px;color:rgba(255,255,255,0.85);padding:2px 0">&bull; ${esc(s.trim())}</div>`).join('')}
      </div>` : ''}
      ${d.languages ? `
      <div style="border-top:1px solid rgba(255,255,255,0.2);padding-top:14px;margin-top:14px">
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:rgba(255,255,255,0.6);margin-bottom:8px">Languages</div>
        <div style="font-size:11px;color:rgba(255,255,255,0.85)">${esc(d.languages)}</div>
      </div>` : ''}
    </div>
    <!-- Main -->
    <div style="flex:1;padding:24px 20px;overflow:hidden">
      ${d.summary ? `
      <div style="margin-bottom:18px">
        <h2 style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#1557D0;border-bottom:1px solid #e2e2e2;padding-bottom:4px;margin-bottom:8px">Profile</h2>
        <p style="font-size:12px;color:#333;line-height:1.6">${esc(d.summary)}</p>
      </div>` : ''}
      ${d.education.length > 0 ? `
      <div style="margin-bottom:18px">
        <h2 style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#1557D0;border-bottom:1px solid #e2e2e2;padding-bottom:4px;margin-bottom:8px">Education</h2>
        ${d.education.map(e => `
        <div style="margin-bottom:8px">
          <div style="font-size:13px;font-weight:700;color:#111">${esc(e.degree)}</div>
          <div style="font-size:11px;color:#555">${esc(e.institution)}${e.grade ? ` — ${esc(e.grade)}` : ''}${e.year ? ` | ${esc(e.year)}` : ''}</div>
        </div>`).join('')}
      </div>` : ''}
      ${d.experience.length > 0 ? `
      <div style="margin-bottom:18px">
        <h2 style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#1557D0;border-bottom:1px solid #e2e2e2;padding-bottom:4px;margin-bottom:8px">Experience</h2>
        ${d.experience.map(e => `
        <div style="margin-bottom:10px">
          <div style="display:flex;justify-content:space-between">
            <div style="font-size:13px;font-weight:700;color:#111">${esc(e.title)}</div>
            ${e.duration ? `<div style="font-size:11px;color:#888">${esc(e.duration)}</div>` : ''}
          </div>
          <div style="font-size:11px;color:#555;margin-bottom:3px">${esc(e.company)}${e.location ? ` | ${esc(e.location)}` : ''}</div>
          ${e.desc ? `<div style="font-size:11px;color:#333;line-height:1.5">${esc(e.desc)}</div>` : ''}
        </div>`).join('')}
      </div>` : ''}
      ${d.certs.length > 0 ? `
      <div>
        <h2 style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#1557D0;border-bottom:1px solid #e2e2e2;padding-bottom:4px;margin-bottom:8px">Certifications</h2>
        ${d.certs.map(c => `
        <div style="margin-bottom:6px">
          <div style="font-size:12px;font-weight:700;color:#111">${esc(c.name)}</div>
          <div style="font-size:11px;color:#555">${esc(c.issuer)}${c.year ? ` — ${esc(c.year)}` : ''}</div>
        </div>`).join('')}
      </div>` : ''}
    </div>
  </div>`;
}

// ── Template: Minimal ─────────────────────────────────────────
function renderMinimal(d) {
  document.getElementById('resumePreview').innerHTML = `
  <div class="resume-template" id="resumeDoc" style="padding:36px;background:#fff;color:#111;font-family:'DM Sans',sans-serif">
    <div style="text-align:center;margin-bottom:24px;border-bottom:1px solid #111;padding-bottom:16px">
      <h1 style="font-family:'DM Serif Display',serif;font-size:28px;margin-bottom:4px;color:#111">${esc(d.name)}</h1>
      ${d.title ? `<p style="font-size:13px;color:#555;margin-bottom:8px">${esc(d.title)}</p>` : ''}
      <div style="display:flex;justify-content:center;flex-wrap:wrap;gap:16px;font-size:11px;color:#777">
        ${d.email  ? `<span>${esc(d.email)}</span>` : ''}
        ${d.phone  ? `<span>${esc(d.phone)}</span>` : ''}
        ${d.city   ? `<span>${esc(d.city)}</span>` : ''}
        ${d.linkedin ? `<span>${esc(d.linkedin)}</span>` : ''}
      </div>
    </div>
    ${d.summary ? `<p style="font-size:12px;color:#333;line-height:1.7;margin-bottom:20px;text-align:center;max-width:500px;margin-left:auto;margin-right:auto">${esc(d.summary)}</p>` : ''}
    ${d.education.length > 0 ? `
    <div style="margin-bottom:20px">
      <h2 style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#888;margin-bottom:10px">Education</h2>
      ${d.education.map(e => `
      <div style="display:flex;justify-content:space-between;margin-bottom:6px">
        <div><div style="font-size:13px;font-weight:600;color:#111">${esc(e.degree)}</div><div style="font-size:11px;color:#555">${esc(e.institution)}${e.grade ? ` · ${esc(e.grade)}` : ''}</div></div>
        ${e.year ? `<div style="font-size:11px;color:#888">${esc(e.year)}</div>` : ''}
      </div>`).join('')}
    </div>` : ''}
    ${d.experience.length > 0 ? `
    <div style="margin-bottom:20px">
      <h2 style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#888;margin-bottom:10px">Experience</h2>
      ${d.experience.map(e => `
      <div style="margin-bottom:10px">
        <div style="display:flex;justify-content:space-between">
          <div style="font-size:13px;font-weight:600;color:#111">${esc(e.title)} — <span style="font-weight:400;color:#555">${esc(e.company)}</span></div>
          ${e.duration ? `<div style="font-size:11px;color:#888">${esc(e.duration)}</div>` : ''}
        </div>
        ${e.desc ? `<div style="font-size:11px;color:#444;line-height:1.5;margin-top:3px">${esc(e.desc)}</div>` : ''}
      </div>`).join('')}
    </div>` : ''}
    ${d.skills ? `
    <div style="margin-bottom:20px">
      <h2 style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#888;margin-bottom:8px">Skills</h2>
      <p style="font-size:12px;color:#444">${esc(d.skills)}</p>
    </div>` : ''}
    ${d.languages ? `
    <div>
      <h2 style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#888;margin-bottom:8px">Languages</h2>
      <p style="font-size:12px;color:#444">${esc(d.languages)}</p>
    </div>` : ''}
  </div>`;
}

// ── Helper: escape HTML ───────────────────────────────────────
function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── PDF Download ──────────────────────────────────────────────
async function downloadPDF() {
  const btn = document.querySelector('.template-picker .btn-primary');
  if (btn) { btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Generating...'; btn.disabled = true; }

  try {
    const el = document.getElementById('resumeDoc') || document.getElementById('resumePreview');
    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      width: el.scrollWidth,
      height: el.scrollHeight
    });

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageW   = pdf.internal.pageSize.getWidth();
    const pageH   = pdf.internal.pageSize.getHeight();
    const imgW    = pageW;
    const imgH    = (canvas.height * imgW) / canvas.width;

    const imgData = canvas.toDataURL('image/png');

    if (imgH <= pageH) {
      pdf.addImage(imgData, 'PNG', 0, 0, imgW, imgH);
    } else {
      // Multi-page support
      let yPos = 0;
      while (yPos < imgH) {
        if (yPos > 0) pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, -yPos, imgW, imgH);
        yPos += pageH;
      }
    }

    const name = (document.getElementById('rName')?.value || 'resume').replace(/\s+/g, '_').toLowerCase();
    pdf.save(`${name}_resume.pdf`);
  } catch(err) {
    console.error('PDF error:', err);
    alert('Could not generate PDF. Please ensure jsPDF and html2canvas are loaded correctly.');
  }

  if (btn) { btn.innerHTML = '<i class="fa fa-download"></i> Download PDF'; btn.disabled = false; }
}

// ── Expose updateFavCount (for resume page where app.js may not run) ──
function updateFavCount() {
  try {
    const favs = JSON.parse(localStorage.getItem('ch_favs') || '[]');
    const el = document.getElementById('favCount');
    if (el) el.textContent = favs.length;
  } catch(e) {}
}

// ── Init ───────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  updatePreview();

  // Dark mode init
  if (localStorage.getItem('ch_dark') === 'true') {
    document.body.classList.add('dark');
    const btn = document.getElementById('themeBtn');
    if (btn) btn.innerHTML = '<i class="fa fa-sun"></i>';
  }

  // Mobile hamburger
  document.getElementById('hamburger')?.addEventListener('click', () => {
    document.getElementById('navLinks')?.classList.toggle('open');
  });
});
