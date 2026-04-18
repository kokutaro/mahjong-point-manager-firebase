import React from 'react';
import styles from './Skeleton.module.css';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
  style?: React.CSSProperties;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width,
  height,
  borderRadius,
  className,
  style,
}) => {
  return (
    <div
      className={`${styles.skeleton} ${className || ''}`}
      aria-hidden="true"
      style={{
        width,
        height,
        borderRadius,
        ...style,
      }}
    />
  );
};
