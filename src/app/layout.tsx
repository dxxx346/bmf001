import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { CartProvider } from '@/contexts/CartContext';
import { ReactQueryProvider } from '@/lib/react-query';
import { ToastProvider, ToastViewport } from '@/components/ui/toast';
import { MainLayout } from '@/components/layout/MainLayout';
import { ErrorBoundary, PageErrorFallback } from '@/components/error-boundary/ErrorBoundary';
import CookieConsentBanner from '@/components/CookieConsentBanner';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Digital Marketplace - Buy and Sell Digital Products',
  description: 'Discover and purchase high-quality digital products from verified sellers. Join thousands of creators and buyers in our secure marketplace.',
  keywords: ['digital products', 'marketplace', 'buy online', 'sell digital', 'downloads'],
  authors: [{ name: 'Digital Marketplace' }],
  creator: 'Digital Marketplace',
  publisher: 'Digital Marketplace',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: process.env.NEXT_PUBLIC_SITE_URL,
    title: 'Digital Marketplace - Buy and Sell Digital Products',
    description: 'Discover and purchase high-quality digital products from verified sellers.',
    siteName: 'Digital Marketplace',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Digital Marketplace',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Digital Marketplace - Buy and Sell Digital Products',
    description: 'Discover and purchase high-quality digital products from verified sellers.',
    images: ['/og-image.png'],
  },
  verification: {
    google: process.env.GOOGLE_VERIFICATION_CODE,
    yandex: process.env.YANDEX_VERIFICATION_CODE,
    yahoo: process.env.YAHOO_VERIFICATION_CODE,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ErrorBoundary
          level="page"
          fallback={PageErrorFallback}
          enableReporting={process.env.NODE_ENV === 'production'}
          onError={(error, errorInfo) => {
            console.error('Root error boundary caught:', error, errorInfo)
          }}
        >
          <ReactQueryProvider>
            <AuthProvider>
              <CartProvider>
                <ToastProvider>
                  <MainLayout>
                    {children}
                  </MainLayout>
                  <ToastViewport />
                  <CookieConsentBanner />
                </ToastProvider>
              </CartProvider>
            </AuthProvider>
          </ReactQueryProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
