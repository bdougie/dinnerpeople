import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

export default function PasswordTest() {
  const [email, setEmail] = useState('ilikerobot@gmail.com');
  const [password, setPassword] = useState('');
  const [results, setResults] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const testSignUp = async () => {
    setLoading(true);
    try {
      setResults('Attempting to create account...\n');
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password: 'temporary123',
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });
      
      if (error) {
        setResults(prev => prev + `❌ Sign up error: ${error.message}\n`);
        if (error.message.includes('already registered')) {
          setResults(prev => prev + '\nUser already exists. Try signing in instead.\n');
        }
      } else {
        setResults(prev => prev + `✅ Account created! Check Mailpit for confirmation email.\n`);
      }
    } catch (error) {
      setResults(prev => prev + `Error: ${error}\n`);
    } finally {
      setLoading(false);
    }
  };

  const testSignIn = async () => {
    setLoading(true);
    try {
      setResults('Attempting to sign in...\n');
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: password || 'temporary123'
      });
      
      if (error) {
        setResults(prev => prev + `❌ Sign in error: ${error.message}\n`);
      } else {
        setResults(prev => prev + `✅ Signed in successfully!\n`);
        setResults(prev => prev + `User ID: ${data.user?.id}\n`);
        setResults(prev => prev + `Email: ${data.user?.email}\n`);
        
        // Check if admin
        const { data: isAdmin } = await supabase.rpc('check_is_admin');
        setResults(prev => prev + `Admin status: ${isAdmin ? 'YES' : 'NO'}\n`);
        
        if (!isAdmin) {
          setResults(prev => prev + '\n⚠️ Not an admin. Making you an admin...\n');
          
          // Try to make admin using service role
          const { error: adminError } = await supabase
            .from('admin_users')
            .insert({ 
              user_id: data.user?.id,
              email: data.user?.email,
              created_by: data.user?.id
            });
            
          if (adminError) {
            setResults(prev => prev + `Could not make admin: ${adminError.message}\n`);
          } else {
            setResults(prev => prev + `✅ Admin access granted!\n`);
          }
        }
        
        setResults(prev => prev + '\nRedirecting to home in 3 seconds...');
        setTimeout(() => navigate('/'), 3000);
      }
    } catch (error) {
      setResults(prev => prev + `Error: ${error}\n`);
    } finally {
      setLoading(false);
    }
  };

  const testPasswordReset = async () => {
    setLoading(true);
    try {
      setResults(`Testing password reset for ${email}...\n\n`);
      
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      
      setResults(prev => prev + `Reset response:\n${JSON.stringify({ data, error }, null, 2)}\n\n`);
      
      if (!error) {
        setResults(prev => prev + `✅ Reset email sent! Check Mailpit at http://localhost:54324\n`);
        window.open('http://localhost:54324', '_blank');
      } else {
        setResults(prev => prev + `❌ Error: ${error.message}\n`);
      }
    } catch (error) {
      setResults(prev => prev + `Error: ${error}\n`);
    } finally {
      setLoading(false);
    }
  };

  const directPasswordUpdate = async () => {
    setLoading(true);
    try {
      setResults('Updating password directly...\n');
      
      const { data, error } = await supabase.auth.updateUser({
        password: 'hejco1-Kumbyk-cemcus'
      });
      
      if (error) {
        setResults(prev => prev + `❌ Error: ${error.message}\n`);
        setResults(prev => prev + '\nYou must be logged in to update password.\n');
      } else {
        setResults(prev => prev + `✅ Password updated successfully!\n`);
        setResults(prev => prev + `New password: hejco1-Kumbyk-cemcus\n`);
      }
    } catch (error) {
      setResults(prev => prev + `Error: ${error}\n`);
    } finally {
      setLoading(false);
    }
  };

  const checkCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setResults(`Current user: ${user.email} (${user.id})\n`);
    } else {
      setResults('No user logged in\n');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-4">Password & Auth Test Page</h1>
      
      <div className="mb-4">
        <label className="block mb-2">Email:</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-2 border rounded"
        />
      </div>
      
      <div className="mb-4">
        <label className="block mb-2">Password (for sign in):</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Leave empty to use 'temporary123'"
          className="w-full p-2 border rounded"
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-6">
        <button
          onClick={checkCurrentUser}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          Check Current User
        </button>
        
        <button
          onClick={testSignUp}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Processing...' : 'Test Sign Up'}
        </button>
        
        <button
          onClick={testSignIn}
          disabled={loading}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? 'Processing...' : 'Test Sign In'}
        </button>
        
        <button
          onClick={testPasswordReset}
          disabled={loading}
          className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50"
        >
          {loading ? 'Processing...' : 'Test Password Reset'}
        </button>
        
        <button
          onClick={directPasswordUpdate}
          disabled={loading}
          className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
        >
          {loading ? 'Processing...' : 'Update to hejco1-Kumbyk-cemcus'}
        </button>
        
        <button
          onClick={() => window.open('http://localhost:54324', '_blank')}
          className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
        >
          Open Mailpit
        </button>
      </div>
      
      <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded overflow-auto whitespace-pre-wrap">
        {results || 'Click a button to start testing'}
      </pre>
    </div>
  );
}