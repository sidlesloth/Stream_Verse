import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // { id, name, role: 'viewer' | 'creator' }
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session (e.g., in localStorage)
    const savedUser = localStorage.getItem('streamverse_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = (data) => {
    // data should be { user: { ... }, accessToken: "...", refreshToken: "..." }
    const userData = { ...data.user, token: data.accessToken };
    setUser(userData);
    localStorage.setItem('streamverse_user', JSON.stringify(userData));
  };



  const logout = () => {
    setUser(null);
    localStorage.removeItem('streamverse_user');
  };

  const isCreator = user?.role === 'creator';
  const isLoggedIn = !!user;

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoggedIn, isCreator, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
