import React from 'react';

interface PasswordStrengthMeterProps {
  password: string;
}

import { calculatePasswordStrength } from '../../utils/passwordStrength';

export const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({ password }) => {
  const { score, label, color } = calculatePasswordStrength(password);

  return (
    <div style={{ marginTop: '8px' }}>
      <div style={{ display: 'flex', gap: '4px', height: '4px', marginBottom: '4px' }}>
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: '100%',
              backgroundColor: i < score ? color : '#e0e0e0',
              borderRadius: '2px',
              transition: 'background-color 0.3s ease',
            }}
          />
        ))}
      </div>
      <div style={{ fontSize: '0.8rem', color: score === 0 ? '#999' : color, textAlign: 'right' }}>
        {label}
      </div>
    </div>
  );
};
