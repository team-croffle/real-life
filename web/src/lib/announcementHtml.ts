import { ANNOUNCEMENT_ALLOWED_TAGS } from '@nest-vue/shared';
import DOMPurify from 'dompurify';

export function sanitizeAnnouncementHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [...ANNOUNCEMENT_ALLOWED_TAGS],
    ALLOWED_ATTR: [],
  });
}
