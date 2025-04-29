import { useState, useEffect } from 'react';

export function useAuth() {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is authenticated
    const checkAuth = () => {
      const isAuthenticated = localStorage.getItem('authenticated') === 'true';
      setAuthenticated(isAuthenticated);
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = (password: string) => {
    if (password === 'DoGoodNow') {
      localStorage.setItem('authenticated', 'true');
      setAuthenticated(true);
      return true;
    }
    return false;
  };

  const logout = () => {
    localStorage.removeItem('authenticated');
    setAuthenticated(false);
  };

  return { authenticated, loading, login, logout };
} 