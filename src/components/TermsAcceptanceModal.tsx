'use client';

import { useState, useEffect } from 'react';
import { X, FileText, Shield, AlertCircle, CheckCircle } from 'lucide-react';

interface TermsAcceptanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: (termsVersion: string, privacyVersion: string) => void;
  required?: boolean;
  termsVersion?: string;
  privacyPolicyVersion?: string;
}

export default function TermsAcceptanceModal({
  isOpen,
  onClose,
  onAccept,
  required = false,
  termsVersion = '1.0',
  privacyPolicyVersion = '1.0',
}: TermsAcceptanceModalProps) {
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showTermsContent, setShowTermsContent] = useState(false);
  const [showPrivacyContent, setShowPrivacyContent] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAcceptedTerms(false);
      setAcceptedPrivacy(false);
    }
  }, [isOpen]);

  const handleAccept = async () => {
    if (!acceptedTerms || !acceptedPrivacy) {
      return;
    }

    setLoading(true);
    try {
      await onAccept(termsVersion, privacyPolicyVersion);
      onClose();
    } catch (error) {
      console.error('Failed to record terms acceptance:', error);
    } finally {
      setLoading(false);
    }
  };

  const canProceed = acceptedTerms && acceptedPrivacy;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="w-full max-w-4xl bg-white rounded-lg shadow-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center">
            <FileText className="w-6 h-6 text-blue-500 mr-3" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Terms of Service & Privacy Policy
              </h2>
              <p className="text-sm text-gray-600">
                Please review and accept our updated terms and privacy policy
              </p>
            </div>
          </div>
          {!required && (
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {required && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-amber-500 mr-3" />
                <div>
                  <h3 className="text-sm font-medium text-amber-800">
                    Action Required
                  </h3>
                  <p className="text-sm text-amber-700">
                    You must accept the updated terms and privacy policy to continue using our service.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Terms of Service Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <FileText className="w-5 h-5 text-blue-500 mr-2" />
                <h3 className="text-lg font-medium text-gray-900">
                  Terms of Service (v{termsVersion})
                </h3>
              </div>
              <button
                onClick={() => setShowTermsContent(!showTermsContent)}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                {showTermsContent ? 'Hide' : 'Read Full Terms'}
              </button>
            </div>

            {showTermsContent && (
              <div className="bg-gray-50 border rounded-lg p-4 max-h-64 overflow-y-auto">
                <div className="prose prose-sm max-w-none">
                  <h4>1. Acceptance of Terms</h4>
                  <p>By using our digital marketplace, you agree to these terms of service.</p>
                  
                  <h4>2. User Accounts</h4>
                  <p>You are responsible for maintaining the confidentiality of your account credentials.</p>
                  
                  <h4>3. Digital Products</h4>
                  <p>All digital products are licensed, not sold. You receive a non-exclusive, non-transferable license.</p>
                  
                  <h4>4. Payment and Refunds</h4>
                  <p>Payments are processed securely. Refunds are available within 14 days for valid reasons.</p>
                  
                  <h4>5. Prohibited Activities</h4>
                  <p>You may not use our service for illegal activities or to violate intellectual property rights.</p>
                  
                  <h4>6. Data Protection</h4>
                  <p>We process your personal data in accordance with our Privacy Policy and GDPR requirements.</p>
                  
                  <h4>7. Limitation of Liability</h4>
                  <p>Our liability is limited to the amount paid for the specific product or service.</p>
                  
                  <h4>8. Termination</h4>
                  <p>We may terminate accounts that violate these terms. You may delete your account at any time.</p>
                </div>
              </div>
            )}

            <label className="flex items-start space-x-3">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <div className="text-sm">
                <span className="text-gray-700">
                  I have read and agree to the{' '}
                  <a
                    href="/terms-of-service"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Terms of Service
                  </a>
                </span>
                {acceptedTerms && (
                  <CheckCircle className="inline w-4 h-4 text-green-500 ml-2" />
                )}
              </div>
            </label>
          </div>

          {/* Privacy Policy Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Shield className="w-5 h-5 text-green-500 mr-2" />
                <h3 className="text-lg font-medium text-gray-900">
                  Privacy Policy (v{privacyPolicyVersion})
                </h3>
              </div>
              <button
                onClick={() => setShowPrivacyContent(!showPrivacyContent)}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                {showPrivacyContent ? 'Hide' : 'Read Full Policy'}
              </button>
            </div>

            {showPrivacyContent && (
              <div className="bg-gray-50 border rounded-lg p-4 max-h-64 overflow-y-auto">
                <div className="prose prose-sm max-w-none">
                  <h4>1. Information We Collect</h4>
                  <p>We collect information you provide directly, usage data, and device information.</p>
                  
                  <h4>2. How We Use Your Information</h4>
                  <p>We use your information to provide services, process payments, and improve our platform.</p>
                  
                  <h4>3. Information Sharing</h4>
                  <p>We don&apos;t sell your personal information. We share data only as described in this policy.</p>
                  
                  <h4>4. Data Security</h4>
                  <p>We use industry-standard security measures including encryption and secure servers.</p>
                  
                  <h4>5. Your Rights (GDPR)</h4>
                  <p>You have the right to access, correct, delete, or export your personal data.</p>
                  
                  <h4>6. Cookies</h4>
                  <p>We use cookies to improve your experience. You can control cookie preferences.</p>
                  
                  <h4>7. Data Retention</h4>
                  <p>We retain your data as long as your account is active or as needed for legal obligations.</p>
                  
                  <h4>8. International Transfers</h4>
                  <p>Your data may be transferred to and processed in countries outside your residence.</p>
                  
                  <h4>9. Children's Privacy</h4>
                  <p>Our service is not intended for children under 16. We don&apos;t knowingly collect data from children.</p>
                  
                  <h4>10. Contact Us</h4>
                  <p>For privacy concerns, contact our Data Protection Officer at privacy@example.com.</p>
                </div>
              </div>
            )}

            <label className="flex items-start space-x-3">
              <input
                type="checkbox"
                checked={acceptedPrivacy}
                onChange={(e) => setAcceptedPrivacy(e.target.checked)}
                className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <div className="text-sm">
                <span className="text-gray-700">
                  I have read and agree to the{' '}
                  <a
                    href="/privacy-policy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Privacy Policy
                  </a>
                </span>
                {acceptedPrivacy && (
                  <CheckCircle className="inline w-4 h-4 text-green-500 ml-2" />
                )}
              </div>
            </label>
          </div>

          {/* GDPR Rights Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Your Privacy Rights</h4>
            <div className="text-sm text-blue-800 space-y-1">
              <p>• <strong>Right to Access:</strong> Request a copy of your personal data</p>
              <p>• <strong>Right to Rectification:</strong> Correct inaccurate personal data</p>
              <p>• <strong>Right to Erasure:</strong> Request deletion of your personal data</p>
              <p>• <strong>Right to Portability:</strong> Export your data in a machine-readable format</p>
              <p>• <strong>Right to Object:</strong> Object to processing of your personal data</p>
              <p>• <strong>Right to Restrict:</strong> Limit how we process your personal data</p>
            </div>
            <p className="text-xs text-blue-700 mt-2">
              You can exercise these rights through your privacy dashboard or by contacting us.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <div className="text-sm text-gray-600">
            Last updated: {new Date().toLocaleDateString()}
          </div>
          
          <div className="flex space-x-3">
            {!required && (
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
            )}
            
            <button
              onClick={handleAccept}
              disabled={!canProceed || loading}
              className={`px-6 py-2 rounded-md font-medium ${
                canProceed && !loading
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {loading ? 'Processing...' : 'Accept and Continue'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Hook for terms acceptance
export function useTermsAcceptance() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRequired, setIsRequired] = useState(false);

  const checkTermsAcceptance = async () => {
    try {
      const response = await fetch('/api/privacy/terms');
      if (response.ok) {
        const data = await response.json();
        
        // Check if user needs to accept updated terms
        const latestAcceptance = data.acceptances[0];
        const currentTermsVersion = '1.0'; // Get from config
        const currentPrivacyVersion = '1.0'; // Get from config
        
        if (!latestAcceptance || 
            latestAcceptance.terms_version !== currentTermsVersion ||
            latestAcceptance.privacy_policy_version !== currentPrivacyVersion) {
          setIsRequired(true);
          setIsModalOpen(true);
        }
      }
    } catch (error) {
      console.error('Failed to check terms acceptance:', error);
    }
  };

  const recordAcceptance = async (termsVersion: string, privacyVersion: string) => {
    try {
      const response = await fetch('/api/privacy/terms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          termsVersion,
          privacyPolicyVersion: privacyVersion,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to record terms acceptance');
      }

      setIsModalOpen(false);
      setIsRequired(false);
    } catch (error) {
      console.error('Failed to record terms acceptance:', error);
      throw error;
    }
  };

  return {
    isModalOpen,
    isRequired,
    checkTermsAcceptance,
    recordAcceptance,
    openModal: () => setIsModalOpen(true),
    closeModal: () => !isRequired && setIsModalOpen(false),
  };
}
