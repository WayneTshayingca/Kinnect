import Link from 'next/link'
import { Logo } from '@/components/Logo'

export const metadata = {
  title: 'Privacy Policy — Kinnect',
  description: 'How Kinnect collects, uses, and protects your personal information.',
}

const LAST_UPDATED = '12 April 2025'
const CONTACT_EMAIL = 'privacy@kinnect.co.za'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-primary-800 text-white">
        <div className="max-w-3xl mx-auto px-6 py-6 flex items-center justify-between">
          <Link href="/">
            <Logo variant="full" color="white" size="sm" />
          </Link>
          <Link
            href="/"
            className="text-sm text-white/70 hover:text-white transition-colors"
          >
            ← Back to sign in
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="bg-white rounded-2xl shadow-sm p-8 md:p-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
          <p className="text-sm text-gray-500 mb-10">Last updated: {LAST_UPDATED}</p>

          <div className="prose prose-gray max-w-none space-y-8 text-gray-700 leading-relaxed">

            <section>
              <p>
                Kinnect (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is a family coordination platform built for
                South African households. This Privacy Policy explains what personal information
                we collect, how we use it, and your rights regarding that information when you
                use our web application at kinnect.co.za.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">1. Information We Collect</h2>
              <h3 className="text-base font-semibold text-gray-800 mb-2">Account information</h3>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                <li>Your full name and email address, provided when you sign up or sign in with Google.</li>
                <li>A password (stored as a secure hash — we never store plain-text passwords).</li>
                <li>Your role within your family (e.g., parent, caregiver, child).</li>
              </ul>

              <h3 className="text-base font-semibold text-gray-800 mt-4 mb-2">Family &amp; household data</h3>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                <li>Family group name and the names of family members you invite.</li>
                <li>Tasks, to-do items, and their due dates and completion status.</li>
                <li>Calendar events including titles, dates, times, and notes.</li>
                <li>Shopping list items.</li>
                <li>Routines and recurring responsibilities, including assigned family members and schedules.</li>
              </ul>

              <h3 className="text-base font-semibold text-gray-800 mt-4 mb-2">Usage information</h3>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                <li>Basic error and performance data collected via Sentry to help us identify and fix bugs.</li>
                <li>We do not use advertising trackers or sell your data to third parties.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">2. How We Use Your Information</h2>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                <li>To provide, operate, and improve the Kinnect application.</li>
                <li>To authenticate you and keep your account secure.</li>
                <li>To display your family&rsquo;s tasks, events, shopping lists, and routines to authorised family members.</li>
                <li>To send transactional emails such as account verification and password resets (no marketing emails without your consent).</li>
                <li>To diagnose and fix technical errors in the application.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">3. Google Sign-In</h2>
              <p className="text-sm">
                We offer sign-in via Google OAuth 2.0. When you choose this option, Google
                shares your name and email address with us — we do not receive your Google
                password or access to other Google services (such as Gmail or Google Drive).
                Your use of Google Sign-In is also governed by{' '}
                <a
                  href="https://policies.google.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent-600 hover:underline"
                >
                  Google&rsquo;s Privacy Policy
                </a>
                .
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">4. Data Storage &amp; Security</h2>
              <p className="text-sm">
                Your data is stored in a secure PostgreSQL database managed by{' '}
                <a
                  href="https://supabase.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent-600 hover:underline"
                >
                  Supabase
                </a>
                , our database and authentication provider. Supabase stores data in data
                centres located outside of South Africa; by using Kinnect you consent to this
                cross-border transfer.
              </p>
              <p className="text-sm mt-3">
                We apply row-level security so that each family&rsquo;s data is accessible only to
                members of that family. All data is transmitted over HTTPS. We take reasonable
                technical and organisational measures to protect your information from
                unauthorised access, loss, or misuse.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">5. Data Sharing</h2>
              <p className="text-sm">
                We do not sell or rent your personal information. We share data only with:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-sm mt-2">
                <li><strong>Supabase</strong> — database and authentication infrastructure.</li>
                <li><strong>Sentry</strong> — anonymised error reporting to help us fix bugs.</li>
                <li><strong>Vercel</strong> — web hosting and deployment platform.</li>
                <li>Legal authorities, if required to comply with a valid legal obligation.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">6. Data Retention</h2>
              <p className="text-sm">
                We retain your data for as long as your account is active. If you wish to
                delete your account and all associated data, please contact us at{' '}
                <a href={`mailto:${CONTACT_EMAIL}`} className="text-accent-600 hover:underline">
                  {CONTACT_EMAIL}
                </a>{' '}
                and we will process your request within 30 days.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">7. Your Rights (POPIA)</h2>
              <p className="text-sm">
                As a South African resident you have rights under the Protection of Personal
                Information Act (POPIA), including the right to:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-sm mt-2">
                <li>Access the personal information we hold about you.</li>
                <li>Request correction of inaccurate or incomplete information.</li>
                <li>Request deletion of your personal information.</li>
                <li>Object to the processing of your personal information.</li>
                <li>Lodge a complaint with the Information Regulator of South Africa.</li>
              </ul>
              <p className="text-sm mt-3">
                To exercise any of these rights, contact us at{' '}
                <a href={`mailto:${CONTACT_EMAIL}`} className="text-accent-600 hover:underline">
                  {CONTACT_EMAIL}
                </a>
                .
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">8. Children&rsquo;s Privacy</h2>
              <p className="text-sm">
                Kinnect is designed for use by adults managing a household. Children may
                appear as dependents within a family group, but accounts must be created and
                managed by an adult (18 years or older). We do not knowingly collect personal
                information directly from children under 13.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">9. Changes to This Policy</h2>
              <p className="text-sm">
                We may update this policy from time to time. When we do, we will update the
                &quot;Last updated&quot; date at the top of this page. Continued use of Kinnect after
                changes are posted constitutes acceptance of the revised policy.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">10. Contact Us</h2>
              <p className="text-sm">
                If you have questions, concerns, or requests regarding this Privacy Policy or
                your personal data, please contact us at:
              </p>
              <div className="mt-3 bg-gray-50 rounded-xl p-4 text-sm">
                <p className="font-semibold text-gray-900">Kinnect</p>
                <p className="text-gray-600">South Africa</p>
                <p className="mt-1">
                  <a href={`mailto:${CONTACT_EMAIL}`} className="text-accent-600 hover:underline">
                    {CONTACT_EMAIL}
                  </a>
                </p>
              </div>
            </section>

          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-8 text-sm text-gray-400">
        © {new Date().getFullYear()} Kinnect. Built for South African families.
      </footer>
    </div>
  )
}
