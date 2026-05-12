import React, { useMemo } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle, Image } from 'react-native';
import { SvgXml } from 'react-native-svg';
import multiavatar from '@multiavatar/multiavatar';

interface AvatarProps {
  seed: string; // The user ID or name to generate deterministic avatar
  imageUrl?: string | null; // Optional user uploaded image URL
  size?: number;
  style?: StyleProp<ViewStyle>;
}

export const Avatar: React.FC<AvatarProps> = ({ seed, imageUrl, size = 50, style }) => {
  const avatarSvg = useMemo(() => {
    return multiavatar(seed);
  }, [seed]);

  return (
    <View style={[styles.container, { width: size, height: size, borderRadius: size / 2 }, style]}>
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={{ width: '100%', height: '100%' }} />
      ) : (
        <SvgXml xml={avatarSvg} width="100%" height="100%" />
      )}
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
