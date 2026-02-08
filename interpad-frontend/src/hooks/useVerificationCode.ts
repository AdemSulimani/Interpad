import { useState } from 'react';

export const useVerificationCode = () => {
  const [codes, setCodes] = useState<string[]>(['', '', '', '', '', '']);

  const handleCodeChange = (index: number, value: string) => {
    // Allow only single digit
    if (value.length > 1) return;
    
    const newCodes = [...codes];
    newCodes[index] = value;
    setCodes(newCodes);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`code-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle backspace to go to previous input
    if (e.key === 'Backspace' && !codes[index] && index > 0) {
      const prevInput = document.getElementById(`code-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    const newCodes = pastedData.split('').concat(Array(6 - pastedData.length).fill(''));
    setCodes(newCodes);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Frontend only - no logic implementation
  };

  const handleResend = () => {
    // Frontend only - no logic implementation
  };

  return {
    codes,
    handleCodeChange,
    handleKeyDown,
    handlePaste,
    handleSubmit,
    handleResend,
  };
};

