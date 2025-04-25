"use client";

import { useState, useEffect } from 'react';

export function useAuth() {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check sessionStorage on component mount
    const isAuthenticated = sessionStorage.getItem('isAuthenticated') === 'true';
    setAuthenticated(isAuthenticated);
    setLoading(false);
  }, []);

  const login = (password: string) => {
    const PASSWORD = process.env.NEXT_PUBLIC_APP_PASSWORD;
    if (password === PASSWORD) {
      sessionStorage.setItem('isAuthenticated', 'true');
      setAuthenticated(true);
      return true;
    }
    return false;
  };

  return { authenticated, loading, login };
} 