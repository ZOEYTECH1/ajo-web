import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import {
  BellIcon,
  CheckCircleIcon,
  UserGroupIcon,
  BanknotesIcon,
  CubeIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import api from '../services/api';

interface NotificationItem {
  id: number;
  title: string;
  body: string;
  notif_type: string;
  action_data: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

function getNotifLink(n: NotificationItem): string | null {
  const d = n.action_data;
  const t = n.notif_type;
  if (t.startsWith('thrift') && d.group_id) return `/thrift/${d.group_id}`;
  if (d.group_id) return `/ajo/${d.group_id}`;
  if (d.business_id) return '/inventory/business';
  return null;
}

function timeAgo(dateStr: string): string {
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
  } catch {
    return dateStr;
  }
}

function NotifIcon({ type }: { type: string }) {
  if (type.startsWith('thrift')) return <BanknotesIcon className="h-5 w-5 text-blue-600" />;
  if (type.startsWith('inventory')) return <CubeIcon className="h-5 w-5 text-purple-600" />;
  if (type.includes('low_stock') || type.includes('expiry')) return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />;
  return <UserGroupIcon className="h-5 w-5 text-orange-600" />;
}

function notifBg(type: string, isRead: boolean): string {
  if (isRead) return 'bg-(--surface)';
  if (type.includes('approved') || type.includes('confirmed')) return 'bg-green-50 dark:bg-green-950/30';
  if (type.includes('rejected') || type.includes('disputed') || type.includes('out_of_stock'))
    return 'bg-red-50 dark:bg-red-950/30';
  if (type.includes('pending') || type.includes('submitted') || type.includes('low_stock') || type.includes('expiry'))
    return 'bg-yellow-50 dark:bg-yellow-950/30';
  return 'bg-blue-50 dark:bg-blue-950/30';
}

type FilterKey = 'all' | 'unread';

export default function NotificationsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<FilterKey>('all');

  const { data = [], isLoading } = useQuery<NotificationItem[]>({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications/').then((r) => r.data),
    refetchInterval: 60_000,
  });

  const markAllMutation = useMutation({
    mutationFn: () => api.post('/notifications/mark-all-read/'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markOneMutation = useMutation({
    mutationFn: (id: number) => api.post(`/notifications/${id}/read/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const unreadCount = data.filter((n) => !n.is_read).length;
  const displayed = filter === 'unread' ? data.filter((n) => !n.is_read) : data;

  function handleClick(n: NotificationItem) {
    if (!n.is_read) markOneMutation.mutate(n.id);
    const link = getNotifLink(n);
    if (link) navigate(link);
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-(--text-primary)">Notifications</h1>
          <p className="text-sm text-(--text-secondary)">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => markAllMutation.mutate()}
          disabled={unreadCount === 0 || markAllMutation.isPending}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-(--border) text-sm font-semibold text-(--text-secondary) hover:text-(--text-primary) disabled:opacity-40 transition-colors"
        >
          <CheckCircleIcon className="h-4 w-4" />
          Mark all read
        </button>
      </div>

      {/* Filter pills */}
      <div className="flex gap-2">
        {(['all', 'unread'] as FilterKey[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={clsx(
              'px-4 py-1.5 rounded-full text-sm font-semibold transition-colors capitalize',
              filter === f
                ? 'bg-orange-600 text-white'
                : 'bg-(--surface) border border-(--border) text-(--text-secondary) hover:text-(--text-primary)',
            )}
          >
            {f === 'all' ? `All (${data.length})` : `Unread (${unreadCount})`}
          </button>
        ))}
      </div>

      {/* Loading skeletons */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-(--surface) border border-(--border) skeleton" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && displayed.length === 0 && (
        <div className="text-center py-16">
          <BellIcon className="h-12 w-12 text-(--text-muted) mx-auto mb-3" />
          <p className="text-(--text-muted) text-sm">
            {filter === 'unread' ? 'No unread notifications.' : 'No notifications yet.'}
          </p>
        </div>
      )}

      {/* Notification list */}
      <div className="space-y-2">
        {displayed.map((n) => {
          const hasLink = !!getNotifLink(n);
          return (
            <div
              key={n.id}
              onClick={() => handleClick(n)}
              className={clsx(
                'rounded-xl border border-(--border) p-4 transition-all',
                notifBg(n.notif_type, n.is_read),
                hasLink ? 'cursor-pointer hover:border-orange-300 hover:shadow-sm' : '',
                !n.is_read ? 'border-l-4 border-l-blue-400' : '',
              )}
            >
              <div className="flex items-start gap-3">
                <div className="shrink-0 h-9 w-9 rounded-xl flex items-center justify-center bg-white dark:bg-gray-800 border border-(--border) shadow-sm">
                  <NotifIcon type={n.notif_type} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={clsx('text-sm font-semibold text-(--text-primary)', !n.is_read && 'font-bold')}>
                      {n.title}
                    </p>
                    {!n.is_read && (
                      <span className="shrink-0 h-2 w-2 rounded-full bg-blue-500 mt-1.5" />
                    )}
                  </div>
                  <p className="text-sm text-(--text-secondary) mt-0.5 leading-snug">{n.body}</p>
                  <p className="text-xs text-(--text-muted) mt-1">{timeAgo(n.created_at)}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
