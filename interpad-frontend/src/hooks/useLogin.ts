import { useState } from 'react';

export const useLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Frontend only - no logic implementation
  };

  const handleGoogleLogin = () => {
    // Frontend only - no logic implementation
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return {
    email,
    setEmail,
    password,
    setPassword,
    showPassword,
    rememberMe,
    setRememberMe,
    handleSubmit,
    handleGoogleLogin,
    togglePasswordVisibility,
  };
};

