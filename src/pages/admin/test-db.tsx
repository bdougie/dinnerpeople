import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';

export default function TestDB() {
  const { user } = useAuthStore();
  const [results, setResults] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const updatePasswordForAdmin = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.updateUser({
        password: 'hejco1-Kumbyk-cemcus'
      });
      
      if (error) {
        setResults(`Error updating password: ${error.message}`);
      } else {
        setResults('Password updated successfully for ' + user?.email);
      }
    } catch (error) {
      setResults(`Unexpected error: ${error}`);
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
      </div>
      
      <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded overflow-auto whitespace-pre-wrap">
        {results || 'Click "Run Tests" to start'}
      </pre>
    </div>
  );
}