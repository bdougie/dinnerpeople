import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

// TODO: Remove this entire test page after fixing admin authentication
// See: https://github.com/bdougie/dinnerpeople/issues/27
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
      
      // Check admin status
      const { data: isAdmin } = await supabase.rpc('check_is_admin');
      setResults(prev => prev + `Admin status: ${isAdmin ? '✅ YES' : '❌ NO'}\n`);
    } else {
      setResults('No user logged in\n');
    }
  };

  const makeUserAdmin = async () => {
    setLoading(true);
    try {
      setResults('Making user admin...\n');
      
      // First get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setResults('❌ Error: You must be logged in first\n');
        setLoading(false);
        return;
      }
      
      // Try a direct SQL approach using RPC
      const { data, error } = await supabase.rpc('make_user_admin', {
        target_user_id: user.id,
        target_email: user.email
      });
      
      if (error) {
        // If RPC doesn't exist, try direct insert
        setResults(prev => prev + 'RPC failed, trying direct insert...\n');
        
        // Use raw SQL via the SQL editor approach
        const insertQuery = `
          INSERT INTO admin_users (user_id, email, created_by)
          VALUES ('${user.id}', '${user.email}', '${user.id}')
          ON CONFLICT (user_id) DO NOTHING
          RETURNING *;
        `;
        
        try {
          // Try to insert directly
          const { error: insertError } = await supabase
            .from('admin_users')
            .insert({ 
              user_id: user.id,
              email: user.email,
              created_by: user.id
            })
            .select();
            
          if (insertError) {
            setResults(prev => prev + `❌ Direct insert error: ${insertError.message}\n`);
            
            // Check if already exists
            const { data: existingAdmin } = await supabase
              .from('admin_users')
              .select('*')
              .eq('user_id', user.id)
              .single();
              
            if (existingAdmin) {
              setResults(prev => prev + `✅ You're already an admin!\n`);
            }
          } else {
            setResults(prev => prev + `✅ Success! ${user.email} is now an admin.\n`);
          }
        } catch (e) {
          setResults(prev => prev + `Error with insert: ${e}\n`);
        }
      } else {
        setResults(`✅ Success! ${user.email} is now an admin.\n`);
      }
      
      // Verify admin status
      const { data: isAdmin } = await supabase.rpc('check_is_admin');
      setResults(prev => prev + `\nAdmin check: ${isAdmin ? '✅ Confirmed' : '❌ Failed'}\n`);
      
      if (isAdmin) {
        setResults(prev => prev + '\nYou can now access:\n');
        setResults(prev => prev + '- /admin/sandbox\n');
        setResults(prev => prev + '- /admin/test-db\n');
        setResults(prev => prev + '\n🎉 Try visiting /admin/sandbox now!\n');
      }
      
    } catch (error) {
      setResults(`❌ Error: ${error}\n`);
    } finally {
      setLoading(false);
    }
  };

  const goToSandbox = () => {
    navigate('/admin/sandbox');
  };

  const forceAdminAccess = () => {
    // Temporarily override admin check in localStorage
    localStorage.setItem('force_admin_access', 'true');
    setResults('✅ Admin access forced! You can now visit /admin/sandbox\n\nNote: This is a temporary override for development.');
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
        
        <button
          onClick={makeUserAdmin}
          disabled={loading}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
        >
          {loading ? 'Processing...' : 'Make Me Admin'}
        </button>
        
        <button
          onClick={goToSandbox}
          className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
        >
          Go to Sandbox →
        </button>
        
        <button
          onClick={forceAdminAccess}
          className="px-4 py-2 bg-pink-600 text-white rounded hover:bg-pink-700"
        >
          🔓 Force Admin Access
        </button>
      </div>
      
      <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded overflow-auto whitespace-pre-wrap">
        {results || 'Click a button to start testing'}
      </pre>
    </div>
  );
}