import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChefHat } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { motion } from 'framer-motion';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, signUp, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    clearError();
  }, [isLogin, clearError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    clearError();

    try {
      if (isLogin) {
        await signIn(email, password);
      } else {
        await signUp(email, password);
      }
      navigate('/');
    } catch (error) {
      console.error('Authentication error:', error);
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
            {isLogin ? 'Welcome back' : 'Create account'}
          </p>
        </div>
        
        <form className="space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="text-sm text-red-600 dark:text-red-400 text-center bg-red-50 dark:bg-red-900/10 p-3 rounded-lg">
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm tracking-wider uppercase text-gray-500 dark:text-gray-400 mb-1">
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                className="input-control dark:bg-dark-200 dark:border-dark-300 dark:text-white dark:focus:border-white"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm tracking-wider uppercase text-gray-500 dark:text-gray-400 mb-1">
                Password
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
              {!isLogin && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Password must be at least 6 characters
                </p>
              )}
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
                {isLogin ? 'Signing in...' : 'Creating account...'}
              </span>
            ) : (
              isLogin ? 'Sign in' : 'Create account'
            )}
          </button>

          <button
            type="button"
            className="w-full text-sm tracking-wider uppercase text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white"
            onClick={() => {
              setIsLogin(!isLogin);
              clearError();
            }}
          >
            {isLogin ? 'Create new account' : 'Sign in instead'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}