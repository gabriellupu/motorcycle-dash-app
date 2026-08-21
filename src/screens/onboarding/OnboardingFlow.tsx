import React, { useCallback, useMemo, useState } from 'react';

import { ScreenBackground } from '../../components/ui/ScreenBackground';
import { navigate } from '../../navigation/router';
import { useAppStore } from '../../state/appStore';
import { BikeProfile } from '../../state/types';

import { ArtworkOutcome, ArtworkStep } from './steps/ArtworkStep';
import { BikeDraft, BikeStep } from './steps/BikeStep';
import { ConnectionStep } from './steps/ConnectionStep';
import { ReadyStep } from './steps/ReadyStep';
import { WelcomeStep } from './steps/WelcomeStep';

const STEPS = ['welcome', 'bike', 'artwork', 'connection', 'ready'] as const;
type StepName = (typeof STEPS)[number];

/**
 * Onboarding: welcome → bike → artwork → connection → look.
 *
 * The bike profile is built up across the steps and only committed to the
 * garage at the end, so backing out never leaves a half-made bike behind.
 */
export function OnboardingFlow() {
  const saveToGarage = useAppStore((s) => s.saveToGarage);
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);
  const existingBike = useAppStore((s) => s.bike);

  const [index, setIndex] = useState(0);
  const [draft, setDraft] = useState<BikeDraft | null>(null);
  const [artwork, setArtwork] = useState<ArtworkOutcome | null>(null);

  // Stable id for the whole flow so artwork files land in one folder.
  const bikeId = useMemo(
    () => existingBike?.id ?? `bike-${Date.now().toString(36)}`,
    [existingBike?.id],
  );

  const step: StepName = STEPS[index];
  const go = useCallback((next: number) => setIndex(Math.max(0, Math.min(STEPS.length - 1, next))), []);

  const buildProfile = useCallback((): BikeProfile => {
    const base = draft ?? {
      make: 'Custom',
      model: 'Motorcycle',
      year: new Date().getFullYear(),
      redlineRpm: 10_500,
      maxRpm: 11_800,
      maxSpeedKph: 200,
    };
    return {
      id: bikeId,
      make: base.make,
      model: base.model,
      year: base.year,
      displacementCc: base.displacementCc,
      redlineRpm: base.redlineRpm,
      maxRpm: base.maxRpm,
      maxSpeedKph: base.maxSpeedKph,
      heroUri: artwork?.heroUri,
      angleUris: artwork?.angleUris,
      sourcePhotoUri: artwork?.sourcePhotoUri,
      assetOrigin: artwork?.origin ?? 'vector-fallback',
      createdAt: Date.now(),
    };
  }, [artwork, bikeId, draft]);

  const finish = useCallback(
    (startIgnition: boolean) => {
      const profile = buildProfile();
      saveToGarage(profile);
      completeOnboarding();
      navigate(startIgnition ? 'ignition' : 'dash');
    },
    [buildProfile, completeOnboarding, saveToGarage],
  );

  const body = (() => {
    switch (step) {
      case 'welcome':
        return (
          <WelcomeStep
            step={index}
            stepCount={STEPS.length}
            onNext={() => go(index + 1)}
            onSkip={() => finish(false)}
          />
        );
      case 'bike':
        return (
          <BikeStep
            step={index}
            stepCount={STEPS.length}
            initial={existingBike}
            onBack={() => go(index - 1)}
            onNext={(next) => {
              setDraft(next);
              go(index + 1);
            }}
          />
        );
      case 'artwork':
        return (
          <ArtworkStep
            step={index}
            stepCount={STEPS.length}
            bikeId={bikeId}
            draft={
              draft ?? {
                make: 'Custom',
                model: 'Motorcycle',
                year: new Date().getFullYear(),
                redlineRpm: 10_500,
                maxRpm: 11_800,
                maxSpeedKph: 200,
              }
            }
            onBack={() => go(index - 1)}
            onNext={(outcome) => {
              setArtwork(outcome);
              go(index + 1);
            }}
          />
        );
      case 'connection':
        return (
          <ConnectionStep
            step={index}
            stepCount={STEPS.length}
            onBack={() => go(index - 1)}
            onNext={() => go(index + 1)}
          />
        );
      case 'ready':
      default:
        return (
          <ReadyStep
            step={index}
            stepCount={STEPS.length}
            bike={buildProfile()}
            onBack={() => go(index - 1)}
            onFinish={() => finish(true)}
          />
        );
    }
  })();

  return <ScreenBackground>{body}</ScreenBackground>;
}
