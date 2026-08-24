import { Link } from 'react-router-dom';
import { BuildingOffice2Icon } from '@heroicons/react/24/outline';

const BENEFITS = [
  {
    icon: '🔒',
    title: 'Compliance & Identity Verification',
    body: 'We perform KYC checks on every collector and member in your organisation, ensuring full regulatory compliance and reducing fraud.',
  },
  {
    icon: '📋',
    title: 'Dedicated Collector Management',
    body: 'Invite and manage collectors, monitor individual performance, review reports, and take action on disputes — all from one dashboard.',
  },
  {
    icon: '🌐',
    title: 'Full Web Portal Access',
    body: 'Manage your organisation, groups, and billing from the web with real-time dashboards, CSV exports, and consolidated invoicing.',
  },
];

export default function ThriftOrgCreatePage() {
  return (
    <div className="max-w-lg mx-auto py-10 px-4 space-y-8">
      <Link to="/thrift" className="text-sm text-(--text-secondary) hover:text-teal-600">← Thrift Groups</Link>

      <div className="flex flex-col items-center text-center gap-4">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-teal-50 border border-teal-100">
          <BuildingOffice2Icon className="h-10 w-10 text-teal-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-(--text-primary)">Organisation Onboarding</h1>
          <p className="text-sm text-(--text-secondary) mt-2 leading-relaxed">
            Upgrade your thrift operation to an Organisation account for advanced compliance tools,
            collector management, and consolidated billing.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {BENEFITS.map(b => (
          <div
            key={b.title}
            className="flex gap-4 bg-(--surface) rounded-xl border border-(--border) shadow-sm p-5"
          >
            <span className="text-2xl leading-none mt-0.5">{b.icon}</span>
            <div>
              <p className="text-sm font-bold text-(--text-primary)">{b.title}</p>
              <p className="text-sm text-(--text-secondary) mt-1 leading-relaxed">{b.body}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-teal-50 border border-teal-200 rounded-xl p-5 text-center space-y-2">
        <p className="text-sm font-semibold text-teal-800">Ready to get started?</p>
        <p className="text-sm text-teal-700 leading-relaxed">
          Contact us at{' '}
          <a
            href="mailto:support@ajo.app"
            className="font-bold underline hover:text-teal-900"
          >
            support@ajo.app
          </a>{' '}
          and our team will set up your organisation account within 24 hours.
        </p>
      </div>

      <Link
        to="/thrift"
        className="block w-full text-center rounded-xl border border-(--border) text-(--text-secondary) py-3 text-sm font-semibold hover:bg-(--primary-tint)/30 transition-colors"
      >
        Back to Thrift Groups
      </Link>
    </div>
  );
}
