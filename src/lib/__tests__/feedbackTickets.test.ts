import { describe, expect, it } from 'vitest';
import { parseFeedbackAttachmentPaths } from '@/lib/api/feedbackAttachments';
import {
  defaultFeedbackSubject,
  isPtFeedbackCategory,
  ptHasUnreadAdminReply,
} from '@/lib/feedbackTickets';

describe('feedbackTickets', () => {
  it('recognizes pt categories', () => {
    expect(isPtFeedbackCategory('pt_suggestion')).toBe(true);
    expect(isPtFeedbackCategory('general')).toBe(false);
  });

  it('builds default subject', () => {
    expect(defaultFeedbackSubject('pt_bug')).toMatch(/^Bug —/);
  });

  it('parses attachment paths from array or json', () => {
    expect(parseFeedbackAttachmentPaths(['a/b.jpg'])).toEqual(['a/b.jpg']);
    expect(parseFeedbackAttachmentPaths('["x/y.pdf"]')).toEqual(['x/y.pdf']);
    expect(parseFeedbackAttachmentPaths(null)).toEqual([]);
  });

  it('detects unread admin reply for PT', () => {
    const ticket = {
      user_id: 'pt-1',
      last_public_sender_id: 'admin-1',
      status: 'in_progress',
    };
    expect(ptHasUnreadAdminReply(ticket, 'pt-1')).toBe(true);
    expect(ptHasUnreadAdminReply({ ...ticket, last_public_sender_id: 'pt-1' }, 'pt-1')).toBe(
      false,
    );
  });
});
