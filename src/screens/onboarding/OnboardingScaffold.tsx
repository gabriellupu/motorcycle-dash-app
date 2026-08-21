import React from 'react';
import { View } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInRight } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Txt } from '../../components/ui/Txt';
import { useLayout } from '../../hooks/useLayout';
import { useTheme } from '../../theme/ThemeProvider';

export interface ScaffoldProps {
  step: number;
  stepCount: number;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Rendered to the side in landscape, above the content in portrait. */
  aside?: React.ReactNode;
}

/** Shared frame for every onboarding step: progress, copy, content, actions. */
export function OnboardingScaffold({
  step,
  stepCount,
  title,
  subtitle,
  children,
  footer,
  aside,
}: ScaffoldProps) {
  const theme = useTheme();
  const layout = useLayout();
  const insets = useSafeAreaInsets();

  const header = (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
        {Array.from({ length: stepCount }, (_, i) => (
          <View
            key={i}
            style={{
              height: 3,
              flex: 1,
              borderRadius: 2,
              backgroundColor: i <= step ? theme.colors.accent : theme.colors.gaugeTrack,
            }}
          />
        ))}
      </View>
      <Txt variant="label" size={10} color={theme.colors.accent}>
        {`Step ${step + 1} of ${stepCount}`}
      </Txt>
      <Txt variant="title" size={layout.isTablet ? 34 : 27}>
        {title}
      </Txt>
      {subtitle ? (
        <Txt variant="body" dim size={14} style={{ lineHeight: 20 }}>
          {subtitle}
        </Txt>
      ) : null}
    </View>
  );

  return (
    <Animated.View
      entering={FadeIn.duration(260)}
      exiting={FadeOut.duration(160)}
      style={{
        flex: 1,
        paddingTop: insets.top + 14,
        paddingBottom: Math.max(insets.bottom, 14),
        paddingHorizontal: Math.max(insets.left, insets.right, 20),
        gap: 16,
      }}
    >
      {layout.isLandscape && aside ? (
        <View style={{ flex: 1, flexDirection: 'row', gap: 24 }}>
          <View style={{ flex: 1, justifyContent: 'center' }}>{aside}</View>
          <View style={{ flex: 1.15, gap: 16 }}>
            {header}
            <Animated.View entering={SlideInRight.duration(280)} style={{ flex: 1 }}>
              {children}
            </Animated.View>
            {footer}
          </View>
        </View>
      ) : (
        <>
          {header}
          {aside ? <View style={{ alignItems: 'center' }}>{aside}</View> : null}
          <View style={{ flex: 1 }}>{children}</View>
          {footer}
        </>
      )}
    </Animated.View>
  );
}
