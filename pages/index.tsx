import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <main className="min-h-screen bg-blue-50 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </main>
    );
  }

  if (user) {
    return (
      <main className="min-h-screen bg-blue-50 flex items-center justify-center">
        <p className="text-gray-600">Redirecting to dashboard...</p>
      </main>
    );
  }

  return (
    <>
      <Head>
        <title>Spavi - Medical Documentation Automation</title>
        <meta name="description" content="Convert clinical notes to Epic SmartSections" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="min-h-screen bg-blue-50 flex flex-col">
        {/* Nav */}
        <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto w-full">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Spavi</h1>
          <Link
            href="/login"
            className="px-5 py-2 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors"
          >
            Sign In
          </Link>
        </nav>

        {/* Hero */}
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="max-w-2xl text-center">
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 tracking-tight leading-tight">
              Clinical notes to Epic SmartSections in seconds
            </h2>
            <p className="mt-6 text-lg text-gray-600 leading-relaxed">
              Upload faxes, paste clinical notes, or drop PDFs. Spavi formats everything into
              ready-to-paste Epic SmartSections so you can spend less time on documentation
              and more time with patients.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/login"
                className="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors text-lg"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
