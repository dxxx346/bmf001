import PrivacyDashboard from '@/components/PrivacyDashboard';

export default function PrivacySettingsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <PrivacyDashboard />
    </div>
  );
}

export const metadata = {
  title: 'Privacy Settings - Digital Marketplace',
  description: 'Manage your privacy settings, data exports, and GDPR rights',
};
