/**
 * Notification service — persisted in-app notifications with
 * realtime push. Every notification is durable (survives reload
 * via the REST list) AND pushed live over the pub/sub channel so
 * a connected realtime client toasts it instantly.
 */
import type { Repositories, UserRecord } from '../repositories/types';
import { getPubSub } from '../lib/pubsub';

export class NotificationService {
  constructor(private repos: Repositories) {}

  async list(viewer: UserRecord, opts?: { limit?: number; unreadOnly?: boolean }) {
    const [items, unread] = await Promise.all([
      this.repos.notifications.listForUser(viewer.id, { limit: opts?.limit ?? 30, unreadOnly: opts?.unreadOnly }),
      this.repos.notifications.unreadCount(viewer.id),
    ]);
    return { items, unread };
  }

  async markRead(viewer: UserRecord, id: unknown) {
    if (typeof id === 'string') await this.repos.notifications.markRead(viewer.id, id);
  }

  async markAllRead(viewer: UserRecord) {
    await this.repos.notifications.markAllRead(viewer.id);
  }

  /** System/admin delivery helper with live push. */
  async notify(userId: string, input: { type: string; title: string; body?: string; data?: Record<string, unknown> }) {
    const rec = await this.repos.notifications.create(userId, input);
    await getPubSub().publish({ type: 'NOTIFICATION', userId, notificationType: input.type, title: input.title }).catch(() => {});
    return rec;
  }
}
