import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';

interface SkeletonProps {
  height?: number;
  borderRadius?: number;
  marginBottom?: number;
  style?: any;
}

export const SkeletonCard: React.FC<SkeletonProps> = ({ 
  height = 120, 
  borderRadius = 12, 
  marginBottom = 16,
  style
}) => {
  const fadeAnim = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0.8,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();

    return () => animation.stop();
  }, [fadeAnim]);

  return (
    <Animated.View 
      style={[
        styles.skeleton, 
        { height, borderRadius, marginBottom, opacity: fadeAnim },
        style
      ]} 
    />
  );
};

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#E0E0E0',
    width: '100%',
  }
});
