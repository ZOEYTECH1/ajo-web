import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BuildingOffice2Icon } from '@heroicons/react/24/outline';

export default function ThriftOrgCreatePage() {
  const { t } = useTranslation();

  const BENEFITS = [
    { icon: '🔒', title: t('thriftPage.orgCreate.benefits.complianceTitle'), body: t('thriftPage.orgCreate.benefits.complianceBody') },
    { icon: '📋', title: t('thriftPage.orgCreate.benefits.collectorTitle'), body: t('thriftPage.orgCreate.benefits.collectorBody') },
    { icon: '🌐', title: t('thriftPage.orgCreate.benefits.portalTitle'), body: t('thriftPage.orgCreate.benefits.portalBody') },
  ];

  return (
    <div className="max-w-lg mx-auto py-10 px-4 space-y-8">
      <Link to="/thrift" className="text-sm text-(--text-secondary) hover:text-(--primary)">{t('thriftPage.orgCreate.backToThriftGroups')}</Link>

      <div className="flex flex-col items-center text-center gap-4">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-(--primary-tint) border border-(--primary-light)/30">
          <BuildingOffice2Icon className="h-10 w-10 text-(--primary)" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-(--text-primary)">{t('thriftPage.orgCreate.title')}</h1>
          <p className="text-sm text-(--text-secondary) mt-2 leading-relaxed">
            {t('thriftPage.orgCreate.intro')}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {BENEFITS.map(b => (
          <div
            key={b.title}
            className="flex gap-4 surface-soft p-5"
          >
            <span className="text-2xl leading-none mt-0.5">{b.icon}</span>
            <div>
              <p className="text-sm font-bold text-(--text-primary)">{b.title}</p>
              <p className="text-sm text-(--text-secondary) mt-1 leading-relaxed">{b.body}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-(--primary-tint) border border-(--primary)/30 rounded-xl p-5 text-center space-y-2">
        <p className="text-sm font-semibold text-(--primary-dark)">{t('thriftPage.orgCreate.readyTitle')}</p>
        <p className="text-sm text-(--primary-dark) leading-relaxed">
          {t('thriftPage.orgCreate.contactPrefix')}{' '}
          <a
            href="mailto:support@ajo.app"
            className="font-bold underline hover:text-(--primary-dark)"
          >
            support@ajo.app
          </a>{' '}
          {t('thriftPage.orgCreate.contactSuffix')}
        </p>
      </div>

      <Link
        to="/thrift"
        className="block w-full text-center rounded-xl surface-soft-sm surface-soft-interactive text-(--text-secondary) py-3 text-sm font-semibold hover:bg-(--primary-tint)/30"
      >
        {t('thriftPage.orgCreate.backButton')}
      </Link>
    </div>
  );
}
