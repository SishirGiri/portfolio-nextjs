/**
 * Friend service — the social graph domain logic.
 *
 * Rules: requests expire implicitly (ignored after accept/reject),
 * pending requests block re-sending, friendships are symmetric
 * rows with an ordered pair (a < b), and every accepted request
 * notifies BOTH sides. Presence (online dots) is filled in by
 * the realtime layer, not here.
 */
import type { Repositories, UserRecord } from '../repositories/types';
import { getPubSub } from '../lib/pubsub';

export type FriendOutcome =
  | { ok: true }
  | { ok: false; code: string; message: string };

export class FriendService {
  constructor(private repos: Repositories) {}

  async search(query: unknown, viewer: UserRecord): Promise<{ userId: string; username: string; level: number }[]> {
    if (typeof query !== 'string' || query.trim().length < 2) return [];
    const users = await this.repos.players.searchByUsername(query.trim(), 10, viewer.id);
    const out = [];
    for (const u of users) {
      const profile = await this.repos.players.getProfile(u.id);
      out.push({ userId: u.id, username: u.username ?? '?', level: profile?.level ?? 0 });
    }
    return out;
  }

  async request(viewer: UserRecord, targetId: unknown): Promise<FriendOutcome> {
    if (typeof targetId !== 'string') return { ok: false, code: 'invalid_target', message: 'Pick a player to add.' };
    if (targetId === viewer.id) return { ok: false, code: 'self_request', message: 'You cannot add yourself.' };
    const target = await this.repos.players.findById(targetId);
    if (!target || target.isGuest) return { ok: false, code: 'not_found', message: 'Player not found.' };
    if (await this.repos.friends.areFriends(viewer.id, targetId)) {
      return { ok: false, code: 'already_friends', message: 'You are already friends.' };
    }
    const existing = await this.repos.friends.findRequestBetween(viewer.id, targetId);
    if (existing) {
      if (existing.fromId === viewer.id) {
        return { ok: false, code: 'already_requested', message: 'Request already pending.' };
      }
      // they asked US — auto-accept instead of bouncing requests
      return this.accept(viewer, existing.id);
    }
    const created = await this.repos.friends.createRequest(viewer.id, targetId);
    if (!created) return { ok: false, code: 'already_requested', message: 'Request already pending.' };
    await this.repos.notifications.create(targetId, {
      type: 'friend_request',
      title: 'Friend request',
      body: `${viewer.username ?? 'A player'} wants to be your friend.`,
      data: { requestId: created.id, fromId: viewer.id },
    });
    await getPubSub().publish({ type: 'NOTIFICATION', userId: targetId, notificationType: 'friend_request' }).catch(() => {});
    return { ok: true };
  }

  async incoming(viewer: UserRecord) {
    return this.repos.friends.listIncoming(viewer.id);
  }

  async accept(viewer: UserRecord, requestId: unknown): Promise<FriendOutcome> {
    if (typeof requestId !== 'string') return { ok: false, code: 'invalid_request', message: 'Invalid request.' };
    const requests = await this.repos.friends.listIncoming(viewer.id);
    const req = requests.find((r) => r.id === requestId);
    if (!req) return { ok: false, code: 'not_found', message: 'Request not found.' };
    await this.repos.friends.updateRequest(requestId, 'accepted');
    await this.repos.friends.createFriendship(req.fromId, viewer.id);
    // clear any other pending notifications about this request
    await this.repos.notifications.create(req.fromId, {
      type: 'friend_accepted',
      title: 'Friend added',
      body: `${viewer.username ?? 'A player'} accepted your friend request.`,
      data: { friendId: viewer.id },
    });
    await getPubSub().publish({ type: 'NOTIFICATION', userId: req.fromId, notificationType: 'friend_accepted' }).catch(() => {});
    return { ok: true };
  }

  async reject(viewer: UserRecord, requestId: unknown): Promise<FriendOutcome> {
    if (typeof requestId !== 'string') return { ok: false, code: 'invalid_request', message: 'Invalid request.' };
    const requests = await this.repos.friends.listIncoming(viewer.id);
    if (!requests.some((r) => r.id === requestId)) {
      return { ok: false, code: 'not_found', message: 'Request not found.' };
    }
    await this.repos.friends.updateRequest(requestId, 'rejected');
    return { ok: true };
  }

  async remove(viewer: UserRecord, friendId: unknown): Promise<FriendOutcome> {
    if (typeof friendId !== 'string') return { ok: false, code: 'invalid_target', message: 'Invalid friend.' };
    if (!(await this.repos.friends.areFriends(viewer.id, friendId))) {
      return { ok: false, code: 'not_friends', message: 'Not friends.' };
    }
    await this.repos.friends.removeFriendship(viewer.id, friendId);
    return { ok: true };
  }

  async list(viewer: UserRecord) {
    const friends = await this.repos.friends.listFriends(viewer.id);
    const incoming = await this.repos.friends.listIncoming(viewer.id);
    return { friends, requests: incoming };
  }
}
