import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';

type AuthMode = 'signin' | 'signup';

export default function LoginPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard');
    }
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push('/dashboard');
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setSignupSuccess(true);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || user) {
    return (
      <main className="min-h-screen bg-blue-50 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </main>
    );
  }

  return (
    <>
      <Head>
        <title>{mode === 'signin' ? 'Sign In' : 'Create Account'} - Spavi</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main className="min-h-screen bg-blue-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          {/* Logo / Brand */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Spavi</h1>
            <p className="mt-2 text-gray-600">Clinical Document Formatter for Epic</p>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            {/* Tab Toggle */}
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => { setMode('signin'); setError(null); setSignupSuccess(false); }}
                className={`flex-1 py-3.5 text-sm font-semibold transition-colors ${
                  mode === 'signin'
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => { setMode('signup'); setError(null); setSignupSuccess(false); }}
                className={`flex-1 py-3.5 text-sm font-semibold transition-colors ${
                  mode === 'signup'
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Create Account
              </button>
            </div>

            <div className="p-6">
              {signupSuccess ? (
                <div className="text-center py-4">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Check your email</h3>
                  <p className="text-gray-600 text-sm">
                    We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account.
                  </p>
                  <button
                    onClick={() => { setMode('signin'); setSignupSuccess(false); }}
                    className="mt-6 text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    Back to Sign In
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 text-sm"
                      placeholder="doctor@clinic.com"
                    />
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                      Password
                    </label>
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                      minLength={6}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 text-sm"
                      placeholder={mode === 'signup' ? 'At least 6 characters' : 'Enter your password'}
                    />
                  </div>

                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                        {mode === 'signin' ? 'Signing in...' : 'Creating account...'}
                      </>
                    ) : (
                      mode === 'signin' ? 'Sign In' : 'Create Account'
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-gray-400 mt-6">
            Secure clinical document processing
          </p>
        </div>
      </main>
    </>
  );
}
