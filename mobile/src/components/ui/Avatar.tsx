import React, { useState, useEffect } from 'react';
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
  const [avatarSvg, setAvatarSvg] = useState<string | null>(null);

  // Performance bottleneck fix: 
  // Multiavatar generation is extremely CPU intensive on JS thread.
  // Shifting it from synchronous render (useMemo) into an asynchronous event loop (useEffect)
  // prevents blockages/frozen screens during FlatList scrolling.
  useEffect(() => {
    if (imageUrl) return; // Skip heavy SVG calculation if image exists!
    
    // Defer the heavy calculation to free up the React mounting phase
    const timer = setTimeout(() => {
      const generated = multiavatar(seed);
      setAvatarSvg(generated);
    }, 0);
    
    return () => clearTimeout(timer);
  }, [seed, imageUrl]);

  return (
    <View style={[styles.container, { width: size, height: size, borderRadius: size / 2 }, style]}>
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={{ width: '100%', height: '100%' }} />
      ) : avatarSvg ? (
        <SvgXml xml={avatarSvg} width="100%" height="100%" />
      ) : null}
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
