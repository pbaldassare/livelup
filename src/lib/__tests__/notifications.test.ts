import { describe, expect, it } from 'vitest';
import {
  connectionInboxPath,
  extractChatId,
  isMessageNotification,
  notificationsInboxPath,
  remapNotificationActionUrl,
} from '../notifications';

describe('extractChatId / isMessageNotification', () => {
  it('reads chat_id from data', () => {
    expect(extractChatId({ type: 'message', data: { chat_id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' } }))
      .toBe('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
  });

  it('parses /messages/:id and /chat/:id action urls', () => {
    expect(extractChatId({ type: 'x', action_url: '/messages/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' }))
      .toBe('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
    expect(extractChatId({ type: 'x', action_url: '/app/chat/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' }))
      .toBe('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
  });

  it('detects message notifications from type or url', () => {
    expect(isMessageNotification({ type: 'message' })).toBe(true);
    expect(isMessageNotification({ type: 'event', action_url: '/pt/messages/abc' })).toBe(true);
    expect(isMessageNotification({ type: 'event', action_url: '/pt/athletes' })).toBe(false);
  });
});

describe('remapNotificationActionUrl', () => {
  it('maps legacy /connections to the PT pending-athletes tab', () => {
    expect(remapNotificationActionUrl('/connections', { role: 'pt', pathname: '/pt' }))
      .toBe('/pt/athletes?tab=pending');
    expect(remapNotificationActionUrl('/connections', { role: 'pt', pathname: '/pt/app' }))
      .toBe('/pt/app/athletes?tab=pending');
  });

  it('maps legacy /messages/:id to the PT chat surface', () => {
    expect(remapNotificationActionUrl('/messages/abc', { role: 'pt', pathname: '/pt/athletes' }))
      .toBe('/pt/messages');
    expect(remapNotificationActionUrl('/messages/abc', { role: 'pt', pathname: '/pt/app/home' }))
      .toBe('/pt/app/chat');
    expect(remapNotificationActionUrl('/messages/abc', { role: 'atleta', pathname: '/app' }))
      .toBe('/app/chat');
  });

  it('remaps PT web action urls when the user is in the PWA', () => {
    expect(remapNotificationActionUrl('/pt/athletes', { role: 'pt', pathname: '/pt/app' }))
      .toBe('/pt/app/athletes');
    expect(remapNotificationActionUrl('/pt/messages', { role: 'pt', pathname: '/pt/app/chat' }))
      .toBe('/pt/app/chat');
    expect(remapNotificationActionUrl('/pt/athletes?tab=pending', { role: 'pt', pathname: '/pt/app' }))
      .toBe('/pt/app/athletes?tab=pending');
  });

  it('keeps PT in their surface when action_url points at /app', () => {
    expect(remapNotificationActionUrl('/app/scheda', { role: 'pt', pathname: '/pt/app' }))
      .toBe('/pt/app');
    expect(remapNotificationActionUrl('/app/chat', { role: 'pt', pathname: '/pt' }))
      .toBe('/pt');
  });

  it('falls back to the inbox when action_url is missing', () => {
    expect(remapNotificationActionUrl(null, { role: 'pt', pathname: '/pt/app' }))
      .toBe('/pt/app/notifications');
    expect(remapNotificationActionUrl(undefined, { role: 'pt', pathname: '/pt' }))
      .toBe('/pt');
    expect(remapNotificationActionUrl(null, { role: 'atleta', pathname: '/app' }))
      .toBe('/app/notifications');
  });
});

describe('inbox paths', () => {
  it('builds connection and notifications inboxes per role', () => {
    expect(connectionInboxPath({ role: 'atleta', pathname: '/app' })).toBe('/app');
    expect(notificationsInboxPath({ role: 'pt', pathname: '/pt/app/profile' }))
      .toBe('/pt/app/notifications');
  });
});
