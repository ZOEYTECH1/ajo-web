import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeftIcon, ChevronDownIcon, EnvelopeIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';

const SUPPORT_EMAIL = 'support@ajoapp.ng';
const WHATSAPP_NUMBER = '+2348000000000'; // placeholder

const FAQS: { q: string; a: string }[] = [
  {
    q: 'What is Ajo and how does it work?',
    a: 'Ajo is a digital record-keeping app for traditional Nigerian savings circles (Ajo/Esusu/Adashe). Members pool money in real life — the app records and verifies that contributions happened. It never holds or moves money.',
  },
  {
    q: 'Does Ajo hold or transfer my money?',
    a: 'No. Ajo only records contributions. All actual money exchanges happen directly between members as they always have. We create a tamper-evident audit trail so everyone can trust the records.',
  },
  {
    q: 'How do I join a group?',
    a: 'Ask your group admin for the 8-character invite code. On the Ajo Groups page, click "Join a Group" and enter the code. You\'ll be added instantly.',
  },
  {
    q: 'How do I record a contribution?',
    a: 'Open your group, click "Submit Payment", enter the amount and optionally attach a photo proof (e.g. bank transfer screenshot). Your admin will approve or query it.',
  },
  {
    q: 'What happens if my payment is queried?',
    a: 'The admin marks your payment as disputed. You\'ll get a notification. You can resubmit with better proof or contact your admin directly to resolve it.',
  },
  {
    q: 'Can I use Ajo for my business inventory?',
    a: 'Yes. The Inventory section lets you track products, record sales, log expenses, and view a daily profit & loss dashboard. It works for both retail shops and warehouses.',
  },
  {
    q: 'How does the low-stock alert work?',
    a: 'Each product has a low-stock threshold you can set. When stock falls at or below that number, you get a notification and the product appears in the dashboard alert section.',
  },
  {
    q: 'How do expiry date alerts work?',
    a: 'Set an expiry date on any product when adding or editing it. You\'ll receive a notification 30 days before expiry (warning) and again 7 days before (urgent). Expired products never trigger alerts.',
  },
  {
    q: 'Can I have multiple business locations?',
    a: 'Yes. Create separate locations (retail or warehouse) under Business. Each has its own stock, sales, and staff. Managers can transfer stock between locations.',
  },
  {
    q: 'How do I invite staff to my business?',
    a: 'Go to Inventory → Business → Staff. Click the invite button and enter their registered Ajo email. They must already have an Ajo account. Choose their role: Staff, Manager, or Owner.',
  },
  {
    q: 'I forgot my password. How do I reset it?',
    a: 'On the login page, click "Forgot password?" and enter your email. You\'ll receive a reset link. Check your spam folder if it doesn\'t arrive within a minute.',
  },
  {
    q: 'How do I delete my account?',
    a: 'Go to your Account page and scroll to the bottom. Click "Delete Account". This is permanent and cannot be undone — all your data will be removed.',
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`rounded-xl border p-4 transition-colors ${open ? 'border-(--primary)' : 'border-(--border)'} bg-(--surface)`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-start justify-between gap-3 text-left"
      >
        <span className="text-sm font-semibold text-(--text-primary) leading-snug">{q}</span>
        <ChevronDownIcon
          className={`h-5 w-5 shrink-0 mt-0.5 text-(--text-muted) transition-transform ${open ? 'rotate-180 text-(--primary)' : ''}`}
        />
      </button>
      {open && (
        <p className="mt-3 text-sm text-(--text-secondary) leading-relaxed">{a}</p>
      )}
    </div>
  );
}

export default function HelpPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6 px-4 py-8">
      <Link
        to="/account"
        className="inline-flex items-center gap-1.5 text-sm text-(--text-secondary) hover:text-(--text-primary)"
      >
        <ArrowLeftIcon className="w-4 h-4" />
        Back to Account
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-(--text-primary)">Help &amp; Support</h1>
        <p className="mt-1 text-sm text-(--text-muted)">Frequently asked questions</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          className="flex flex-col items-center rounded-xl border border-(--border) bg-(--surface) p-5 text-center hover:border-(--primary) transition-colors"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-green-50 dark:bg-green-950">
            <EnvelopeIcon className="h-5 w-5 text-green-700 dark:text-green-400" />
          </span>
          <span className="mt-2 text-sm font-semibold text-(--text-primary)">Email us</span>
          <span className="mt-0.5 text-xs text-(--text-secondary)">{SUPPORT_EMAIL}</span>
        </a>
        <a
          href={`https://wa.me/${WHATSAPP_NUMBER.replace('+', '')}`}
          target="_blank"
          rel="noreferrer"
          className="flex flex-col items-center rounded-xl border border-(--border) bg-(--surface) p-5 text-center hover:border-(--primary) transition-colors"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-green-50 dark:bg-green-950">
            <ChatBubbleLeftRightIcon className="h-5 w-5 text-green-600" />
          </span>
          <span className="mt-2 text-sm font-semibold text-(--text-primary)">WhatsApp</span>
          <span className="mt-0.5 text-xs text-(--text-secondary)">Chat with support</span>
        </a>
      </div>

      <div>
        <h2 className="text-xs font-bold uppercase tracking-wide text-(--text-secondary) mb-3">
          Frequently Asked Questions
        </h2>
        <div className="space-y-2">
          {FAQS.map((item) => (
            <FAQItem key={item.q} q={item.q} a={item.a} />
          ))}
        </div>
      </div>
    </div>
  );
}
