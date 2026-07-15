import { renderModernTemplate } from './modernTemplate';
import { renderClassicTemplate } from './classicTemplate';

export const TEMPLATES = {
  modern: { label: 'Modern', render: renderModernTemplate },
  classic: { label: 'Classic', render: renderClassicTemplate },
};

export function renderTemplate(templateId, content) {
  const tpl = TEMPLATES[templateId] || TEMPLATES.modern;
  return tpl.render(content);
}
