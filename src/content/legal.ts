export type LegalDocumentId = 'privacy' | 'terms'

export interface LegalDocument {
  id: LegalDocumentId
  title: string
  updated: string
  sections: { heading: string; paragraphs: string[] }[]
}

export const LEGAL_DOCUMENTS: Record<LegalDocumentId, LegalDocument> = {
  privacy: {
    id: 'privacy',
    title: 'Privacy Policy',
    updated: '11 August 2026',
    sections: [
      {
        heading: 'Overview',
        paragraphs: [
          'O-Analysis (“the App”) is a browser-based orienteering map analysis tool. It is designed to work offline and to process your projects on your own device.',
          'This policy explains what information may be involved when you use the App, and how that relates to laws such as the EU General Data Protection Regulation (GDPR).',
        ],
      },
      {
        heading: 'What we process (and where)',
        paragraphs: [
          'Maps, GPX tracks, drawings, annotations, and project files you import or create are processed locally in your browser. They are stored on your device (for example in IndexedDB or similar browser storage) so the App can restore your work and run offline.',
          'We do not require an account. We do not operate a backend that stores your project content. Unless you choose to export, download, or share a file yourself, your project data stays on your device.',
        ],
      },
      {
        heading: 'Analytics',
        paragraphs: [
          'The App may use a privacy-oriented analytics service (One Dollar Stats) to collect basic usage information, such as page views and anonymous product events (for example that an export happened). This helps us understand how the App is used and improve it.',
          'Analytics data is processed by that provider according to their practices. It is not used to identify you personally for advertising profiles, and it does not include the contents of your maps or GPX files.',
        ],
      },
      {
        heading: 'Advertisements and external links',
        paragraphs: [
          'The App may show advertisements or links to third-party sites. If you follow those links, the third party’s own privacy policy applies. We do not sell your personal data.',
        ],
      },
      {
        heading: 'Cookies and similar technologies',
        paragraphs: [
          'The App may use local browser storage for app functionality (for example remembering that you dismissed a hint). The analytics script may use cookies or similar technologies as described by the analytics provider.',
        ],
      },
      {
        heading: 'Your GDPR rights',
        paragraphs: [
          'Because project data is stored on your device, you control it directly: you can delete projects, clear site data in your browser settings, or uninstall the App / clear the PWA storage.',
          'Where GDPR applies to any limited personal data processed via analytics or hosting (for example an IP address processed by a provider), you may have rights to access, rectification, erasure, restriction, objection, and portability, and the right to lodge a complaint with a supervisory authority.',
          'To exercise rights related to analytics or this site, contact the operator of O-Analysis using the contact details published on oanalysis.com (or the site from which you access the App).',
        ],
      },
      {
        heading: 'Children',
        paragraphs: [
          'The App is not directed at children under 16. Do not use the App if you are under the age required by applicable law without appropriate consent.',
        ],
      },
      {
        heading: 'Changes',
        paragraphs: [
          'We may update this policy from time to time. The “Last updated” date at the top of this document will change when we do. Continued use of the App after an update means you accept the revised policy.',
        ],
      },
    ],
  },
  terms: {
    id: 'terms',
    title: 'Terms of Service',
    updated: '11 August 2026',
    sections: [
      {
        heading: 'Agreement',
        paragraphs: [
          'By using O-Analysis (“the App”), you agree to these Terms of Service. If you do not agree, do not use the App.',
        ],
      },
      {
        heading: 'The service',
        paragraphs: [
          'O-Analysis lets you import map images and GPX tracks, annotate them, and export or save projects. The App runs in your browser (and can be installed as a progressive web app) and is intended to work offline with data kept on your device.',
          'The App is provided as-is for personal and professional use related to orienteering analysis. Features may change, and availability is not guaranteed.',
        ],
      },
      {
        heading: 'Your content and responsibility',
        paragraphs: [
          'You retain rights to the files and content you import or create. You are responsible for having any rights needed to use those materials (for example map copyrights) and for backing up anything important by exporting or saving project files.',
          'Because processing happens on your device, loss of browser storage, device failure, or clearing site data can delete unsaved work. We are not responsible for data loss on your device.',
        ],
      },
      {
        heading: 'Acceptable use',
        paragraphs: [
          'You agree not to misuse the App, attempt to disrupt it, reverse engineer it except as allowed by law, or use it for unlawful purposes.',
        ],
      },
      {
        heading: 'Third-party services',
        paragraphs: [
          'The App may include analytics and advertisements or links to third-party websites. Those services are governed by their own terms. We are not responsible for third-party content or practices.',
        ],
      },
      {
        heading: 'Disclaimer and limitation of liability',
        paragraphs: [
          'The App is provided “as is” and “as available,” without warranties of any kind, express or implied, including fitness for a particular purpose and non-infringement, to the fullest extent permitted by law.',
          'To the fullest extent permitted by law, the operator of O-Analysis is not liable for any indirect, incidental, special, consequential, or punitive damages, or for loss of data, profits, or goodwill, arising from your use of the App.',
          'Nothing in these terms limits liability that cannot be limited under applicable law (including certain consumer rights in the EU/EEA/UK).',
        ],
      },
      {
        heading: 'Privacy',
        paragraphs: [
          'Use of the App is also subject to our Privacy Policy, which describes local processing, analytics, and your rights under regulations such as the GDPR.',
        ],
      },
      {
        heading: 'Changes and contact',
        paragraphs: [
          'We may update these terms from time to time. The “Last updated” date will change when we do. Continued use after an update constitutes acceptance of the revised terms.',
          'Questions about these terms can be directed to the operator of O-Analysis via the contact details published on oanalysis.com (or the site from which you access the App).',
        ],
      },
    ],
  },
}
