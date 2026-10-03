import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

// Configure Axios defaults
axios.defaults.baseURL = 'http://localhost:5000/api';
axios.defaults.withCredentials = true;

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [workerProfile, setWorkerProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Clear errors after 5 seconds
  const clearError = () => {
    setTimeout(() => {
      setError(null);
    }, 5000);
  };

  // Load user on mount
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await axios.get('/auth/me');
        if (response.data.success) {
          setUser(response.data.user);
          setWorkerProfile(response.data.workerProfile);
        }
      } catch (err) {
        // User not logged in, ignore error
        setUser(null);
        setWorkerProfile(null);
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentUser();
  }, []);

  // Login User
  const login = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post('/auth/login', { email, password });
      if (response.data.success) {
        setUser(response.data.user);
        // Fetch full profiles if user is worker
        if (response.data.user.role === 'worker') {
          const profileRes = await axios.get('/auth/me');
          setWorkerProfile(profileRes.data.workerProfile);
        } else {
          setWorkerProfile(null);
        }
        return { success: true, user: response.data.user };
      }
    } catch (err) {
      const message = err.response?.data?.message || 'Login failed. Please check credentials.';
      setError(message);
      clearError();
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  };

  // Register User
  // The backend does NOT issue a session on registration: the account
  // must first be activated through the emailed verification link.
  const register = async (userData) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post('/auth/register', userData);
      if (response.data.success) {
        return {
          success: true,
          message:
            response.data.message ||
            'Registration successful. Please check your email to verify your account before logging in.',
        };
      }
    } catch (err) {
      const message = err.response?.data?.message || 'Registration failed. Try again.';
      setError(message);
      clearError();
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  };

  // Logout User
  const logout = async () => {
    setLoading(true);
    try {
      await axios.post('/auth/logout');
      setUser(null);
      setWorkerProfile(null);
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Update User Profile
  const updateProfile = async (profileData) => {
    try {
      const response = await axios.put('/auth/profile', profileData);
      if (response.data.success) {
        setUser(response.data.user);
        return { success: true };
      }
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to update profile';
      setError(message);
      clearError();
      return { success: false, message };
    }
  };

  // Update Worker Profile (skills, area)
  const updateWorkerProfile = async (workerData) => {
    try {
      const response = await axios.put('/worker/profile', workerData);
      if (response.data.success) {
        setWorkerProfile(response.data.profile);
        return { success: true };
      }
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to update worker skills';
      setError(message);
      clearError();
      return { success: false, message };
    }
  };

  // Toggle availability status
  const toggleWorkerAvailability = async () => {
    try {
      const response = await axios.patch('/worker/availability');
      if (response.data.success) {
        setWorkerProfile(prev => ({
          ...prev,
          isAvailable: response.data.isAvailable
        }));
        return { success: true, isAvailable: response.data.isAvailable };
      }
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to update availability';
      setError(message);
      clearError();
      return { success: false, message };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        workerProfile,
        loading,
        error,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        updateProfile,
        updateWorkerProfile,
        toggleWorkerAvailability,
      }}
    >
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
