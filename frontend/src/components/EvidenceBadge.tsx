import React from 'react';
import { ShieldCheck, Calculator, UserCheck, Database, HelpCircle } from 'lucide-react';
import { useLanguage } from '../i18n';

interface EvidenceBadgeProps {
  source?: string;
  confidence?: string;
  rawSnippet?: string;
}

export const EvidenceBadge: React.FC<EvidenceBadgeProps> = ({
  source = 'Missing / Unknown',
  confidence = 'Uncertain',
  rawSnippet,
}) => {
  const { t } = useLanguage();

  let icon = <HelpCircle size={13} />;
  let badgeClass = 'badge-missing';
  let label = t.missing;

  if (source === 'Read from Package') {
    icon = <ShieldCheck size={13} />;
    badgeClass = 'badge-source';
    label = t.readFromPackage;
  } else if (source === 'Calculated') {
    icon = <Calculator size={13} />;
    badgeClass = 'badge-calc';
    label = t.calculated;
  } else if (source === 'User Verified') {
    icon = <UserCheck size={13} />;
    badgeClass = 'badge-source';
    label = t.userVerified;
  } else if (source === 'Reference DB') {
    icon = <Database size={13} />;
    badgeClass = 'badge-calc';
    label = t.referenceDb;
  }

  return (
    <span
      className={`badge ${badgeClass}`}
      title={rawSnippet ? `Detected from label: "${rawSnippet}"` : `Source: ${source}`}
    >
      {icon}
      <span>{label}</span>
      {confidence === 'High' && (
        <span style={{ fontSize: '0.65rem', opacity: 0.8, marginLeft: '2px' }}>✓</span>
      )}
    </span>
  );
};
