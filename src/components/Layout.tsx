import { useState, useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { ChefHat, Upload, Home, LogOut, Settings, Sun, Moon } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { motion, AnimatePresence } from 'framer-motion';

export default function Layout() {
  const { signOut } = useAuthStore();
  const { isDark, toggleTheme } = useThemeStore();
  const location = useLocation();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const navItems = [
    { to: '/', icon: Home, label: 'Home' },
    { to: '/my-recipes', icon: ChefHat, label: 'My Recipes' },
    { to: '/upload', icon: Upload, label: 'Upload Video' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-dark transition-colors">
      <nav className="fixed top-0 left-0 right-0 bg-white dark:bg-dark border-b dark:border-dark-200 z-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setIsDrawerOpen(!isDrawerOpen)}
                className="flex flex-col space-y-1.5 focus:outline-none"
                aria-label="Menu"
              >
                <span className="block w-6 h-0.5 bg-black dark:bg-white"></span>
                <span className="block w-5 h-0.5 bg-black dark:bg-white"></span>
              </button>

              <Link to="/" className="text-2xl tracking-wider font-medium dark:text-white">
                DP-O
              </Link>
            </div>

            <div className="flex items-center space-x-4">
              <Link 
                to="/upload"
                className="hidden md:flex items-center space-x-2 px-4 py-2 text-sm tracking-wider uppercase border border-black dark:border-white text-black dark:text-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
              >
                <Upload size={16} />
                <span>Upload</span>
              </Link>

              <button
                onClick={toggleTheme}
                className="p-2 text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white transition-colors"
              >
                {isDark ? <Sun size={20} /> : <Moon size={20} />}
              </button>

              <button
                onClick={() => signOut()}
                className="text-sm tracking-wider uppercase text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <AnimatePresence>
        {isDrawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
              className="fixed inset-0 bg-black/20 dark:bg-black/40 z-40"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
              className="fixed top-0 left-0 bottom-0 w-72 bg-white dark:bg-dark z-50 overflow-auto"
            >
              <div className="p-6 space-y-8">
                <div className="flex items-center justify-between">
                  <span className="text-2xl tracking-wider font-medium dark:text-white">Menu</span>
                  <button
                    onClick={() => setIsDrawerOpen(false)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-dark-200 rounded-full"
                  >
                    <span className="sr-only">Close menu</span>
                    <svg className="w-5 h-5 dark:text-white" viewBox="0 0 24 24">
                      <path
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.5"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>

                <div className="space-y-6">
                  {navItems.map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setIsDrawerOpen(false)}
                      className={`block text-lg tracking-wider ${
                        location.pathname === item.to
                          ? 'text-black dark:text-white'
                          : 'text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white'
                      }`}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>

                <div className="pt-4 border-t dark:border-dark-200">
                  <button
                    onClick={toggleTheme}
                    className="flex items-center space-x-3 text-lg tracking-wider text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white"
                  >
                    {isDark ? (
                      <>
                        <Sun size={20} />
                        <span>Light Mode</span>
                      </>
                    ) : (
                      <>
                        <Moon size={20} />
                        <span>Dark Mode</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <main className="max-w-7xl mx-auto px-6 pt-24 pb-24 md:pb-12">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <Outlet />
        </motion.div>
      </main>
    </div>
  );
}