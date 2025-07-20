import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';

// TODO: Remove this entire test page after fixing admin authentication
// See: https://github.com/bdougie/dinnerpeople/issues/27
export default function TestDB() {
  const { user } = useAuthStore();
  const [results, setResults] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const updatePasswordForAdmin = async () => {
    setLoading(true);
    try {
      // First check if user is logged in
      if (!user) {
        setResults('Error: You must be logged in to update password');
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.updateUser({
        password: 'hejco1-Kumbyk-cemcus'
      });
      
      if (error) {
        setResults(`Error updating password: ${error.message}`);
      } else {
        setResults(`✅ Password updated successfully for ${user.email}!\n\nYour new password is: hejco1-Kumbyk-cemcus\n\nYou can now use this password to log in.`);
      }
    } catch (error) {
      setResults(`Unexpected error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const checkInbucket = () => {
    window.open('http://localhost:54324', '_blank');
    setResults('Mailpit opened in new tab. Look for emails sent to ' + user?.email);
  };

  const testPasswordReset = async () => {
    setLoading(true);
    try {
      const email = 'ilikerobot@gmail.com';
      setResults(`Testing password reset for ${email}...\n\n`);
      
      // First check if user exists
      const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
      
      if (listError) {
        // Try non-admin approach
        const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/reset-password`,
        });
        
        setResults(prev => prev + `Reset attempt response:\n${JSON.stringify({ data, error }, null, 2)}\n\n`);
        
        if (!error) {
          setResults(prev => prev + `✅ Reset email should be sent! Check Mailpit at http://localhost:54324`);
        } else {
          setResults(prev => prev + `❌ Error: ${error.message}`);
        }
      } else {
        const userExists = users?.some(u => u.email === email);
        setResults(prev => prev + `User ${email} exists: ${userExists}\n\n`);
        
        if (!userExists) {
          setResults(prev => prev + `❌ User not found! You may need to create the account first.`);
        } else {
          // Try to send reset
          const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/auth/reset-password`,
          });
          
          setResults(prev => prev + `Reset attempt response:\n${JSON.stringify({ data, error }, null, 2)}\n\n`);
          
          if (!error) {
            setResults(prev => prev + `✅ Reset email should be sent! Check Mailpit at http://localhost:54324`);
          }
        }
      }
    } catch (error) {
      setResults(`Error during test: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const runTest = async () => {
    setLoading(true);
    setResults('');
    
    try {
      // Test 1: Check if video_frames table exists
      const { data: tables, error: tablesError } = await supabase
        .from('pg_tables')
        .select('tablename')
        .eq('schemaname', 'public')
        .eq('tablename', 'video_frames');
      
      if (tablesError) {
        setResults(prev => prev + `\nError checking tables: ${JSON.stringify(tablesError)}`);
      } else {
        setResults(prev => prev + `\nTable check: ${JSON.stringify(tables)}`);
      }

      // Test 2: Check column info
      const { data: columns, error: columnsError } = await supabase
        .rpc('get_table_columns', { table_name: 'video_frames' });
      
      if (columnsError) {
        // Try alternative method
        const { data: altColumns, error: altError } = await supabase
          .from('information_schema.columns')
          .select('column_name, data_type')
          .eq('table_name', 'video_frames');
        
        if (altError) {
          setResults(prev => prev + `\nError checking columns: ${JSON.stringify(altError)}`);
        } else {
          setResults(prev => prev + `\nColumns: ${JSON.stringify(altColumns)}`);
        }
      } else {
        setResults(prev => prev + `\nColumns via RPC: ${JSON.stringify(columns)}`);
      }

      // Test 3: Try a simple insert without embedding
      const testRecipeId = 'test-' + Date.now();
      const { error: insertError } = await supabase
        .from('video_frames')
        .insert({
          recipe_id: testRecipeId,
          timestamp: 0,
          description: 'Test frame',
          image_url: 'http://example.com/test.jpg'
        });
      
      if (insertError) {
        setResults(prev => prev + `\nInsert without embedding error: ${JSON.stringify(insertError)}`);
      } else {
        setResults(prev => prev + `\nInsert without embedding: SUCCESS`);
        
        // Clean up
        await supabase.from('video_frames').delete().eq('recipe_id', testRecipeId);
      }

      // Test 4: Try insert with null embedding
      const { error: nullEmbedError } = await supabase
        .from('video_frames')
        .insert({
          recipe_id: testRecipeId,
          timestamp: 1,
          description: 'Test frame with null embedding',
          image_url: 'http://example.com/test2.jpg',
          embedding: null
        });
      
      if (nullEmbedError) {
        setResults(prev => prev + `\nInsert with null embedding error: ${JSON.stringify(nullEmbedError)}`);
      } else {
        setResults(prev => prev + `\nInsert with null embedding: SUCCESS`);
        
        // Clean up
        await supabase.from('video_frames').delete().eq('recipe_id', testRecipeId);
      }

      // Test 5: Check current user
      setResults(prev => prev + `\n\nCurrent user: ${user?.email || 'Not logged in'}`);
      
    } catch (error) {
      setResults(prev => prev + `\nUnexpected error: ${JSON.stringify(error)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Database Test</h1>
      
      <div className="flex gap-4 mb-4">
        <button
          onClick={runTest}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Running Tests...' : 'Run Tests'}
        </button>
        
        <button
          onClick={updatePasswordForAdmin}
          disabled={loading}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? 'Updating...' : 'Update Password'}
        </button>
        
        <button
          onClick={checkInbucket}
          className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
        >
          Check Email (Mailpit)
        </button>
        
        <button
          onClick={testPasswordReset}
          disabled={loading}
          className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Test Password Reset'}
        </button>
      </div>
      
      <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded overflow-auto whitespace-pre-wrap">
        {results || 'Click "Run Tests" to start'}
      </pre>
    </div>
  );
}