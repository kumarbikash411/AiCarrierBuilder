export const emptyResumeContent = {
  personalInfo: { fullName: '', title: '', email: '', phone: '', location: '', linkedin: '' },
  summary: '',
  experience: [], // { id, jobTitle, company, location, startDate, endDate, bullets: [string] }
  education: [], // { id, school, degree, field, startDate, endDate }
  skills: [], // string[]
  projects: [], // { id, name, description, link }
};

export function newId() {
  return Math.random().toString(36).slice(2, 10);
}

export function emptyExperience() {
  return { id: newId(), jobTitle: '', company: '', location: '', startDate: '', endDate: '', bullets: [''] };
}

export function emptyEducation() {
  return { id: newId(), school: '', degree: '', field: '', startDate: '', endDate: '' };
}

export function emptyProject() {
  return { id: newId(), name: '', description: '', link: '' };
}
