import React, { useCallback, useMemo, useState } from 'react';

import { ScreenBackground } from '../../components/ui/ScreenBackground';
import { VehicleType } from '../../data/vehicles';
import { navigate } from '../../navigation/router';
import { useAppStore } from '../../state/appStore';
import { VehicleProfile } from '../../state/types';

import { CaptureOutcome, CaptureStep } from './steps/CaptureStep';
import { ConnectionStep } from './steps/ConnectionStep';
import { ModelStep, VehicleDraft } from './steps/ModelStep';
import { ReadyStep } from './steps/ReadyStep';
import { VehicleTypeStep } from './steps/VehicleTypeStep';
import { WelcomeStep } from './steps/WelcomeStep';

const STEPS = ['welcome', 'type', 'model', 'capture', 'connection', 'ready'] as const;
type StepName = (typeof STEPS)[number];

/**
 * Onboarding: welcome → bike or car → model → photos → connection → look.
 *
 * The profile is built up across the steps and only committed to the garage at
 * the end, so backing out never leaves a half-made vehicle behind.
 */
export function OnboardingFlow() {
  const saveToGarage = useAppStore((s) => s.saveToGarage);
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);
  const patchSettings = useAppStore((s) => s.patchSettings);
  const existing = useAppStore((s) => s.vehicle);

  const [index, setIndex] = useState(0);
  const [type, setType] = useState<VehicleType | null>(existing?.type ?? null);
  const [draft, setDraft] = useState<VehicleDraft | null>(null);
  const [artwork, setArtwork] = useState<CaptureOutcome | null>(null);

  // Stable id for the whole flow so photos and cut-outs land in one folder.
  const vehicleId = useMemo(
    () => existing?.id ?? `vehicle-${Date.now().toString(36)}`,
    [existing?.id],
  );

  const step: StepName = STEPS[index];
  const go = useCallback(
    (next: number) => setIndex(Math.max(0, Math.min(STEPS.length - 1, next))),
    [],
  );

  const fallbackDraft = useCallback(
    (): VehicleDraft => ({
      type: type ?? 'motorcycle',
      make: 'Custom',
      model: type === 'car' ? 'Car' : 'Motorcycle',
      year: new Date().getFullYear(),
      redlineRpm: type === 'car' ? 6500 : 10_500,
      maxRpm: type === 'car' ? 7300 : 11_800,
      maxSpeedKph: 200,
      bodyStyle: type === 'car' ? 'hatch' : undefined,
    }),
    [type],
  );

  const buildProfile = useCallback((): VehicleProfile => {
    const base = draft ?? fallbackDraft();
    return {
      id: vehicleId,
      type: base.type,
      make: base.make,
      model: base.model,
      year: base.year,
      displacementCc: base.displacementCc,
      bodyStyle: base.bodyStyle,
      colorHint: base.colorHint,
      redlineRpm: base.redlineRpm,
      maxRpm: base.maxRpm,
      maxSpeedKph: base.maxSpeedKph,
      heroUri: artwork?.heroUri,
      angleUris: artwork?.angleUris?.length ? artwork.angleUris : undefined,
      photos: artwork?.photos ?? [],
      assetOrigin: artwork?.origin ?? 'vector-fallback',
      createdAt: Date.now(),
    };
  }, [artwork, draft, fallbackDraft, vehicleId]);

  const finish = useCallback(
    (startIgnition: boolean) => {
      const profile = buildProfile();
      saveToGarage(profile);
      // A car does not lean; a bike rarely wants a lateral-G tile.
      patchSettings(
        profile.type === 'car'
          ? { showLeanAngle: false, showGForce: true }
          : { showLeanAngle: true, showGForce: false },
      );
      completeOnboarding();
      navigate(startIgnition ? 'ignition' : 'dash');
    },
    [buildProfile, completeOnboarding, patchSettings, saveToGarage],
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
      case 'type':
        return (
          <VehicleTypeStep
            step={index}
            stepCount={STEPS.length}
            value={type}
            onBack={() => go(index - 1)}
            onNext={(next) => {
              if (next !== type) setDraft(null);
              setType(next);
              go(index + 1);
            }}
          />
        );
      case 'model':
        return (
          <ModelStep
            step={index}
            stepCount={STEPS.length}
            type={type ?? 'motorcycle'}
            initial={existing}
            onBack={() => go(index - 1)}
            onNext={(next) => {
              setDraft(next);
              go(index + 1);
            }}
          />
        );
      case 'capture':
        return (
          <CaptureStep
            step={index}
            stepCount={STEPS.length}
            vehicleId={vehicleId}
            draft={draft ?? fallbackDraft()}
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
            vehicleType={type ?? 'motorcycle'}
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
            vehicle={buildProfile()}
            onBack={() => go(index - 1)}
            onFinish={() => finish(true)}
          />
        );
    }
  })();

  return <ScreenBackground>{body}</ScreenBackground>;
}
