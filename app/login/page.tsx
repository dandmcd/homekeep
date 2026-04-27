'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Spinner } from '@/components/ui/Spinner';

export default function LoginPage() {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, loading } = useAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleEmailSignIn = async () => {
    if (!email || !password) { setError('Please enter both email and password'); return; }
    setError('');
    try {
      setIsSigningIn(true);
      await signInWithEmail(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during sign in');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleEmailSignUp = async () => {
    if (!email || !password) { setError('Please enter both email and password'); return; }
    setError('');
    try {
      setIsSigningIn(true);
      await signUpWithEmail(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during sign up');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    try {
      setIsSigningIn(true);
      await signInWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during sign in');
      setIsSigningIn(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark p-5">
      <div className="w-full max-w-xs flex flex-col items-center gap-6">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold text-text-main dark:text-white mb-2">Homekeep</h1>
          <p className="text-text-muted dark:text-gray-400 text-base">Sign in to manage your home</p>
        </div>

        <div className="w-full flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-text-muted dark:text-gray-400">Email</label>
            <input
              type="email"
              placeholder="Enter email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="h-12 px-4 rounded-xl bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-text-main dark:text-white placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-text-muted dark:text-gray-400">Password</label>
            <input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              onKeyDown={(e) => e.key === 'Enter' && handleEmailSignIn()}
              className="h-12 px-4 rounded-xl bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-text-main dark:text-white placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
            />
          </div>

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <button
            onClick={handleEmailSignIn}
            disabled={isSigningIn}
            className="h-12 bg-primary rounded-xl font-semibold text-text-main hover:opacity-90 active:opacity-80 disabled:opacity-50 transition-opacity flex items-center justify-center"
          >
            {isSigningIn ? <Spinner size="sm" /> : 'Sign In'}
          </button>

          <button
            onClick={handleEmailSignUp}
            disabled={isSigningIn}
            className="h-12 border-2 border-gray-200 dark:border-zinc-600 rounded-xl font-semibold text-text-main dark:text-white hover:border-primary active:opacity-80 disabled:opacity-50 transition-colors"
          >
            Sign Up
          </button>
        </div>

        <div className="flex items-center w-full gap-3">
          <div className="flex-1 h-px bg-gray-200 dark:bg-zinc-700" />
          <span className="text-sm text-text-muted dark:text-gray-500">or</span>
          <div className="flex-1 h-px bg-gray-200 dark:bg-zinc-700" />
        </div>

        <button
          onClick={handleGoogleSignIn}
          disabled={isSigningIn}
          className="w-full h-12 border-2 border-primary rounded-xl font-semibold text-text-main dark:text-white hover:bg-primary/10 active:opacity-80 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
        >
          {isSigningIn ? <Spinner size="sm" /> : (
            <>
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Sign in with Google
            </>
          )}
        </button>

        <p className="text-xs text-text-muted dark:text-gray-500 text-center">
          By signing in, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
