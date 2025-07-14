import React, { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { motion } from 'framer-motion';

export default function Settings() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const { updatePassword, error, clearError, user } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
      return;
    }

    try {
      await updatePassword(newPassword);
      setMessage({ type: 'success', text: 'Password updated successfully' });
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      // Error is handled by the store
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-8"
      >
        <div>
          <h1 className="text-3xl font-bold tracking-wider uppercase dark:text-white">Settings</h1>
          <p className="mt-2 text-sm tracking-wider uppercase text-gray-500 dark:text-gray-400">
            Manage your account
          </p>
        </div>

        <div className="bg-white dark:bg-dark-100 p-6 border border-gray-200 dark:border-dark-200">
          <h2 className="text-lg font-medium tracking-wider uppercase dark:text-white mb-6">
            Change Password
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {(message || error) && (
              <div className={`text-sm ${message?.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                {message?.text || error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="newPassword" className="block text-sm tracking-wider uppercase text-gray-500 dark:text-gray-400 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  id="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input-control dark:bg-dark-200 dark:border-dark-300 dark:text-white dark:focus:border-white"
                  required
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm tracking-wider uppercase text-gray-500 dark:text-gray-400 mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input-control dark:bg-dark-200 dark:border-dark-300 dark:text-white dark:focus:border-white"
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn-primary dark:border-white dark:text-white dark:hover:bg-white dark:hover:text-black">
              Update Password
            </button>
          </form>
        </div>

        <div className="bg-white dark:bg-dark-100 p-6 border border-gray-200 dark:border-dark-200">
          <h2 className="text-lg font-medium tracking-wider uppercase dark:text-white mb-2">
            Account Information
          </h2>
          <p className="text-sm tracking-wider text-gray-500 dark:text-gray-400">
            Email: {user?.email}
          </p>
        </div>
      </motion.div>
    </div>
  );
}