import React, { useMemo } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { createAvatar } from '@dicebear/core';
import { initials, bottts } from '@dicebear/collection';

interface AvatarProps {
  seed: string; // The user ID or name to generate deterministic avatar
  size?: number;
  style?: StyleProp<ViewStyle>;
  type?: 'bottts' | 'initials';
}

export const Avatar: React.FC<AvatarProps> = ({ seed, size = 50, style, type = 'bottts' }) => {
  const avatarSvg = useMemo(() => {
    return createAvatar(type === 'bottts' ? bottts : initials, {
      seed,
      size,
      radius: 50,
      backgroundColor: ['b6e3f4', 'c0aede', 'd1d4f9', 'ffd5dc', 'ffdfbf'],
    }).toString();
  }, [seed, size, type]);

  return (
    <View style={[styles.container, { width: size, height: size, borderRadius: size / 2 }, style]}>
      <SvgXml xml={avatarSvg} width="100%" height="100%" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
});
