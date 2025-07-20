import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChefHat } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isValidToken, setIsValidToken] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if we have a valid session from the magic link
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setIsValidToken(true);
      } else {
        setError('Invalid or expired reset link. Please request a new one.');
      }
    };

    checkSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        throw error;
      }

      setSuccessMessage('Password updated successfully! Redirecting to login...');
      
      // Sign out and redirect to login
      setTimeout(async () => {
        await supabase.auth.signOut();
        navigate('/auth');
      }, 2000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-dark py-12 px-4 transition-colors">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-md w-full space-y-12"
      >
        <div>
          <ChefHat className="mx-auto h-12 w-12 text-black dark:text-white" />
          <h2 className="mt-8 text-center text-3xl tracking-wider uppercase text-black dark:text-white">
            DP-O
          </h2>
          <p className="mt-2 text-center text-sm tracking-wider uppercase text-gray-500 dark:text-gray-400">
            Reset your password
          </p>
        </div>
        
        <form className="space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="text-sm text-red-600 dark:text-red-400 text-center bg-red-50 dark:bg-red-900/10 p-3 rounded-lg">
              {error}
            </div>
          )}
          
          {successMessage && (
            <div className="text-sm text-green-600 dark:text-green-400 text-center bg-green-50 dark:bg-green-900/10 p-3 rounded-lg">
              {successMessage}
            </div>
          )}
          
          {isValidToken && !successMessage && (
            <>
              <div className="space-y-4">
                <div>
                  <label htmlFor="password" className="block text-sm tracking-wider uppercase text-gray-500 dark:text-gray-400 mb-1">
                    New Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    required
                    minLength={6}
                    className="input-control dark:bg-dark-200 dark:border-dark-300 dark:text-white dark:focus:border-white"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm tracking-wider uppercase text-gray-500 dark:text-gray-400 mb-1">
                    Confirm Password
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    required
                    minLength={6}
                    className="input-control dark:bg-dark-200 dark:border-dark-300 dark:text-white dark:focus:border-white"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Password must be at least 6 characters
                  </p>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full btn-primary dark:border-white dark:text-white dark:hover:bg-white dark:hover:text-black disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Updating password...
                  </span>
                ) : (
                  'Update password'
                )}
              </button>
            </>
          )}

          <button
            type="button"
            className="w-full text-sm tracking-wider uppercase text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white"
            onClick={() => navigate('/auth')}
          >
            Back to sign in
          </button>
        </form>
      </motion.div>
    </div>
  );
}