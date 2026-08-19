import { Link } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

interface Section {
  title: string;
  body: string;
}

const sections: Section[] = [
  {
    title: 'Introduction',
    body: 'Ajo collects and processes personal data to provide savings group management services. By using the Ajo app, you agree to the collection and use of information in accordance with this policy.',
  },
  {
    title: 'Data We Collect',
    body: 'We collect information you provide directly, including your name, email address, phone number, payment information, and profile photo. We may also collect usage data and device information to improve our services.',
  },
  {
    title: 'How We Use Your Data',
    body: 'Your data is used for group management and coordination, payment tracking and history, sending notifications about your groups and contributions, and fraud prevention and security purposes.',
  },
  {
    title: 'Data Sharing',
    body: 'We do not sell your personal data to third parties. Your information is shared only with payment processors (Flutterwave) to facilitate transactions and as required by applicable law or regulatory authorities.',
  },
  {
    title: 'Your Rights',
    body: 'You have the right to access, correct, or request deletion of your personal data at any time. To exercise these rights, please contact us at privacy@ajo.ng and we will respond within 30 days.',
  },
  {
    title: 'Security',
    body: 'We protect your data using industry-standard encryption and secure servers. While we take reasonable measures to safeguard your information, no method of transmission over the internet is 100% secure.',
  },
  {
    title: 'Contact Us',
    body: 'If you have any questions about this Privacy Policy or our data practices, please contact us at chibuzormekalam@gmail.com.',
  },
];

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6 px-4 py-8">
      <Link
        to="/account"
        className="inline-flex items-center gap-1.5 text-sm text-(--text-secondary) hover:text-(--text-primary)"
      >
        <ArrowLeftIcon className="w-4 h-4" />
        Back to Account
      </Link>

      <div className="bg-(--surface) rounded-xl border border-(--border) p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-(--text-primary)">Privacy Policy &amp; Terms</h1>
          <p className="mt-1 text-sm text-(--text-muted)">Last updated: August 2026</p>
        </div>

        <div className="space-y-6">
          {sections.map((section) => (
            <div key={section.title}>
              <h2 className="text-lg font-semibold text-(--text-primary) mb-2">{section.title}</h2>
              <p className="text-sm text-(--text-secondary) leading-relaxed">{section.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
