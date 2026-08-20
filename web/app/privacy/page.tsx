import React from 'react';

export const metadata = {
  title: 'Privacy Policy | Haqooq',
  description: 'Privacy Policy for the Haqooq Legal Services Application.',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-10 shadow-2xl backdrop-blur">
        <header className="border-b border-slate-800 pb-6 mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">Privacy Policy for Haqooq</h1>
          <p className="text-sm text-slate-400 mt-2">Effective Date: August 20, 2026 | Last Updated: August 20, 2026</p>
        </header>

        <section className="space-y-8 text-slate-300 leading-relaxed text-sm sm:text-base">
          <div>
            <h2 className="text-xl font-semibold text-white mb-3">1. Introduction</h2>
            <p>
              Welcome to <strong>Haqooq</strong> (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;). We are committed to protecting your privacy and personal data. This Privacy Policy explains how our mobile application and web platform collect, use, disclose, and safeguard your information when you use our legal marketplace and consultation services.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-3">2. Information We Collect</h2>
            <p className="mb-2">We collect information that you provide directly to us, including:</p>
            <ul className="list-disc pl-5 space-y-1 text-slate-300">
              <li><strong>Account &amp; Profile Information:</strong> Name, email address, phone number, role (Client or Lawyer), and profile picture (via Google Sign-In or Email authentication).</li>
              <li><strong>Lawyer Verification Details:</strong> Bar Council registration numbers, license documents, educational background, and practice areas.</li>
              <li><strong>Legal Case Data:</strong> Case descriptions, categories, budgets, and uploaded documents/images (evidence, contracts, case files).</li>
              <li><strong>Communication Records:</strong> Direct messages, consultation inquiries, and bids between clients and lawyers.</li>
              <li><strong>Payment &amp; Billing Records:</strong> Transaction IDs and payment receipts for credit purchases (e.g., Easypaisa verification). We do not store sensitive payment card details directly.</li>
              <li><strong>Device &amp; Usage Information:</strong> Device model, OS version, push notification tokens, and crash analytics for app performance monitoring.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-3">3. How We Use Your Information</h2>
            <ul className="list-disc pl-5 space-y-1 text-slate-300">
              <li>To provide, operate, and maintain the Haqooq platform.</li>
              <li>To match clients with verified lawyers based on case requirements.</li>
              <li>To facilitate secure in-app messaging, proposal bidding, and case tracking.</li>
              <li>To verify lawyer credentials and protect users against fraudulent activity.</li>
              <li>To process credit balance top-ups and service requests.</li>
              <li>To deliver critical notifications, case updates, and support messages.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-3">4. Information Sharing and Disclosure</h2>
            <p>
              We do not sell, rent, or trade your personal data. We only share information in the following situations:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-300 mt-2">
              <li><strong>Between Clients &amp; Lawyers:</strong> Case details and contact information are shared solely for the purpose of legal representation once agreed upon.</li>
              <li><strong>Service Providers:</strong> Secure third-party cloud infrastructure (e.g., Google Firebase, Google Cloud, Sentry) that adhere to strict data security standards.</li>
              <li><strong>Legal Compliance:</strong> When required by applicable laws, regulations, or court orders in Pakistan.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-3">5. Data Security</h2>
            <p>
              We implement industry-standard encryption, token-based authentication, and Firebase security rules to prevent unauthorized access, alteration, or disclosure of your confidential legal documents and personal data.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-3">6. Your Rights and Data Deletion</h2>
            <p>
              You have the right to access, update, or request the deletion of your account and associated personal data at any time. To request account deletion or data removal, please contact our support team at <span className="text-blue-400 font-medium">support@haqooq.pk</span> or use the in-app profile settings.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-3">7. Contact Us</h2>
            <p>
              If you have any questions or concerns regarding this Privacy Policy, please contact us at:
            </p>
            <p className="mt-2 text-white font-medium">
              Haqooq Legal Technologies<br />
              Email: <span className="text-blue-400">support@haqooq.pk</span><br />
              Website: <span className="text-blue-400">https://haqooq.pk</span>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
