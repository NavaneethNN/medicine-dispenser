/**
 * Preloader.tsx
 *
 * Full-screen animated splash shown while the app boots.
 * Uses only React Native's built-in Animated API — no extra packages.
 *
 * Animations:
 *   1. Logo icon — gentle infinite pulse (scale 1 → 1.08 → 1)
 *   2. Progress bar — fills left-to-right over `duration` ms
 *   3. Whole screen — fades out when `done` becomes true,
 *      then calls `onFinished` so App.tsx unmounts it
 */
import { useEffect, useRef } from 'react';
import {
  Animated, View, Text, StyleSheet, Dimensions, Easing,
} from 'react-native';
import Icon from './Icon';

const { width: SCREEN_W } = Dimensions.get('window');

const PRIMARY   = '#0D9488';
const PRIMARY_DK= '#0F766E';
const BG        = '#F0FDFA';

interface PreloaderProps {
  /** When true the bar completes and the screen fades out. */
  done: boolean;
  /** Called after the fade-out finishes — unmount signal. */
  onFinished: () => void;
  /** How long the progress bar takes to fill, in ms. Default 1800. */
  duration?: number;
}

export default function Preloader({ done, onFinished, duration = 1800 }: PreloaderProps) {
  const pulse    = useRef(new Animated.Value(1)).current;
  const progress = useRef(new Animated.Value(0)).current;
  const opacity  = useRef(new Animated.Value(1)).current;

  // ── 1. Pulse loop ──────────────────────────────────────────────────────────
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.1,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  // ── 2. Progress bar fill ───────────────────────────────────────────────────
  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // width % can't use native driver
    }).start();
  }, [progress, duration]);

  // ── 3. Fade out when done ──────────────────────────────────────────────────
  useEffect(() => {
    if (!done) return;
    // Jump the bar to 100 % instantly, then fade
    Animated.sequence([
      Animated.timing(progress, {
        toValue: 1,
        duration: 200,
        useNativeDriver: false,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 400,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) onFinished();
    });
  }, [done, opacity, progress, onFinished]);

  const barWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Animated.View style={[styles.container, { opacity }]}>

      {/* Logo */}
      <Animated.View style={[styles.logoWrap, { transform: [{ scale: pulse }] }]}>
        <View style={styles.logoBox}>
          <Icon name="medical" size={40} color="#FFFFFF" />
        </View>
      </Animated.View>

      {/* App name */}
      <Text style={styles.appName}>Medi Dispenser</Text>
      <Text style={styles.tagline}>Smart care, right on time.</Text>

      {/* Progress bar */}
      <View style={styles.barTrack}>
        <Animated.View style={[styles.barFill, { width: barWidth }]} />
      </View>

    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: BG,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  logoWrap: { marginBottom: 20 },
  logoBox: {
    width: 88,
    height: 88,
    borderRadius: 24,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
  },
  appName: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  tagline: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 48,
  },
  barTrack: {
    width: SCREEN_W * 0.5,
    height: 4,
    backgroundColor: '#D1FAE5',
    borderRadius: 2,
    overflow: 'hidden',
  },
  barFill: {
    height: 4,
    backgroundColor: PRIMARY_DK,
    borderRadius: 2,
  },
});
