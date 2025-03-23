import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Upload from "./pages/Upload";
import MyRecipes from "./pages/MyRecipes";
import Settings from "./pages/Settings";
import Auth from "./pages/Auth";
import { useAuthStore } from "./store/authStore";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore();

  // If auth is still loading, show a loading indicator or return null
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-dark">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-black border-t-transparent dark:border-white dark:border-t-transparent"></div>
      </div>
    );
  }

  // Only redirect if we're sure the user is not authenticated
  if (!user) return <Navigate to="/auth" />;

  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Home />} />
          <Route path="my-recipes" element={<MyRecipes />} />
          <Route path="upload" element={<Upload />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
