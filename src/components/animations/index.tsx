// DagangCerdas — Animation Hooks & Components
// Reusable micro-animations untuk UI premium

import { useEffect, useRef, useState } from 'react';
import {
  Animated, Easing, TouchableOpacity, ViewStyle, StyleProp,
} from 'react-native';

/**
 * Hook: Animated counting number (e.g. Rp0 → Rp1.500.000)
 */
export function useCountAnimation(
  targetValue: number,
  duration: number = 1200,
  delay: number = 0,
): number {
  const [displayValue, setDisplayValue] = useState(0);
  const animRef = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    animRef.setValue(0);
    const listener = animRef.addListener(({ value }) => {
      setDisplayValue(Math.floor(value));
    });

    Animated.timing(animRef, {
      toValue: targetValue,
      duration,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // required for value listener
    }).start();

    return () => animRef.removeListener(listener);
  }, [targetValue, duration, delay, animRef]);

  return displayValue;
}

/**
 * Hook: Fade-in on mount
 */
export function useFadeIn(duration: number = 500, delay: number = 0) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [duration, delay, opacity, translateY]);

  return { opacity, transform: [{ translateY }] };
}

/**
 * Hook: Staggered fade-in for list items
 */
export function useStaggeredFadeIn(itemCount: number, staggerDelay: number = 80) {
  const animations = useRef(
    Array.from({ length: itemCount }, () => ({
      opacity: new Animated.Value(0),
      translateY: new Animated.Value(15),
    }))
  ).current;

  useEffect(() => {
    const anims = animations.map((anim, index) =>
      Animated.parallel([
        Animated.timing(anim.opacity, {
          toValue: 1,
          duration: 400,
          delay: index * staggerDelay,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(anim.translateY, {
          toValue: 0,
          duration: 400,
          delay: index * staggerDelay,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ])
    );
    Animated.stagger(staggerDelay, anims).start();
  }, [animations, staggerDelay]);

  return animations;
}

/**
 * Hook: Pulse animation (for attention/alerts)
 */
export function usePulse(minScale: number = 0.95, maxScale: number = 1.05) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: maxScale,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: minScale,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [maxScale, minScale, scale]);

  return { transform: [{ scale }] };
}

/**
 * Component: Pressable with scale animation
 */
interface ScalePressableProps {
  children: React.ReactNode;
  onPress: () => void;
  onLongPress?: () => void;
  style?: StyleProp<ViewStyle>;
  scaleValue?: number;
  disabled?: boolean;
}

export function ScalePressable({
  children, onPress, onLongPress, style, scaleValue = 0.96, disabled = false,
}: ScalePressableProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: scaleValue,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 6,
    }).start();
  };

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <TouchableOpacity
        onPress={onPress}
        onLongPress={onLongPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        disabled={disabled}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
}

/**
 * Component: Animated View wrapper with fade-in
 */
interface FadeInViewProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  style?: StyleProp<ViewStyle>;
}

export function FadeInView({ children, delay = 0, duration = 500, style }: FadeInViewProps) {
  const anim = useFadeIn(duration, delay);
  return (
    <Animated.View style={[anim, style]}>
      {children}
    </Animated.View>
  );
}

/**
 * Component: Animated progress bar
 */
interface AnimatedProgressProps {
  progress: number; // 0-1
  color?: string;
  backgroundColor?: string;
  height?: number;
  duration?: number;
}

export function AnimatedProgress({
  progress,
  color = '#2196F3',
  backgroundColor = '#E0E0E0',
  height = 8,
  duration = 1000,
}: AnimatedProgressProps) {
  const width = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(width, {
      toValue: Math.min(progress, 1),
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [progress, duration, width]);

  return (
    <Animated.View style={{ height, backgroundColor, borderRadius: height / 2, overflow: 'hidden' as const }}>
      <Animated.View
        style={{
          height,
          borderRadius: height / 2,
          backgroundColor: color,
          width: width.interpolate({
            inputRange: [0, 1],
            outputRange: ['0%', '100%'],
          }),
        }}
      />
    </Animated.View>
  );
}
