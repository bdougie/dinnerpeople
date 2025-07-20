import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    // Handle the callback from Supabase auth
    const handleAuthCallback = async () => {
      try {
        // Get the hash fragment
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const error = hashParams.get('error');
        const errorDescription = hashParams.get('error_description');
        
        if (error) {
          console.error('Auth callback error:', error, errorDescription);
          
          // Handle specific errors
          if (error === 'access_denied' && errorDescription?.includes('expired')) {
            // Redirect to auth with error message
            navigate('/auth?error=' + encodeURIComponent('Password reset link has expired. Please request a new one.'));
          } else {
            navigate('/auth?error=' + encodeURIComponent(errorDescription || 'Authentication error'));
          }
          return;
        }

        // Check if we have a session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          navigate('/auth');
          return;
        }

        if (session) {
          // Check if this is a password reset
          const accessToken = hashParams.get('access_token');
          const type = hashParams.get('type');
          
          if (type === 'recovery' || accessToken) {
            // This is a password reset - redirect to reset password page
            navigate('/auth/reset-password');
          } else {
            // Regular sign in - go to home
            navigate('/');
          }
        } else {
          navigate('/auth');
        }
      } catch (error) {
        console.error('Error in auth callback:', error);
        navigate('/auth');
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">Processing authentication...</h2>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
      </div>
    </div>
  );
}