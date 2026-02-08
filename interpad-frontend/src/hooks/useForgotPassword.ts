import { useState } from 'react';

export const useForgotPassword = () => {
  const [email, setEmail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Frontend only - no logic implementation
  };

  return {
    email,
    setEmail,
    handleSubmit,
  };
};

