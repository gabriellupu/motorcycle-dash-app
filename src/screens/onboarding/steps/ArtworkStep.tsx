import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';

import { VectorBike } from '../../../components/bike/VectorBike';
import { Button, Field, Segmented } from '../../../components/ui/Controls';
import { Panel } from '../../../components/ui/Panel';
import { Txt } from '../../../components/ui/Txt';
import { copyIntoBike, readAsBase64 } from '../../../services/ai/assetStore';
import {
  ArtworkProgress,
  createBikeArtwork,
  describeArtworkError,
  turntableAngles,
} from '../../../services/ai/bikeArtwork';
import { IMAGE_MODELS, isConfigured } from '../../../services/ai/gemini';
import { useAppStore } from '../../../state/appStore';
import { useTheme } from '../../../theme/ThemeProvider';
import { rgba } from '../../../utils/color';
import { OnboardingScaffold } from '../OnboardingScaffold';

import { BikeDraft } from './BikeStep';

export interface ArtworkOutcome {
  heroUri?: string;
  angleUris?: string[];
  sourcePhotoUri?: string;
  origin: 'ai-generated' | 'ai-cutout' | 'vector-fallback';
}

type Mode = 'render' | 'photo' | 'vector';

/**
 * Artwork step: generate the bike, cut out a photo of it, or keep the built-in
 * vector. Anything that fails falls back to the vector bike — the dash always
 * has a subject.
 */
export function ArtworkStep({
  step,
  stepCount,
  bikeId,
  draft,
  onBack,
  onNext,
}: {
  step: number;
  stepCount: number;
  bikeId: string;
  draft: BikeDraft;
  onBack: () => void;
  onNext: (outcome: ArtworkOutcome) => void;
}) {
  const theme = useTheme();
  const settings = useAppStore((s) => s.settings);
  const patchSettings = useAppStore((s) => s.patchSettings);

  const [mode, setMode] = useState<Mode>('render');
  const [apiKey, setApiKey] = useState(settings.geminiApiKey);
  const [showKeyField, setShowKeyField] = useState(!isConfigured(settings.geminiApiKey));
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [keepPhotoLook, setKeepPhotoLook] = useState(true);
  const [progress, setProgress] = useState<ArtworkProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ArtworkOutcome | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const busy = progress != null && progress.stage !== 'done' && progress.stage !== 'failed';

  const pickPhoto = useCallback(async (fromCamera: boolean) => {
    setError(null);
    const permission = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError(
        fromCamera
          ? 'Camera permission is needed to photograph your bike.'
          : 'Photo library permission is needed to pick a photo.',
      );
      return;
    }
    const picked = fromCamera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.9 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
    if (picked.canceled || !picked.assets?.length) return;
    setPhotoUri(picked.assets[0].uri);
    setMode('photo');
  }, []);

  const generate = useCallback(async () => {
    setError(null);
    setResult(null);

    if (mode === 'vector') {
      onNext({ origin: 'vector-fallback' });
      return;
    }

    const key = apiKey.trim();
    if (!isConfigured(key)) {
      setError('Add a Gemini API key to generate artwork, or use the built-in vector bike.');
      setShowKeyField(true);
      return;
    }
    if (key !== settings.geminiApiKey) patchSettings({ geminiApiKey: key });

    const controller = new AbortController();
    abortRef.current = controller;
    setProgress({ stage: 'prompting', progress: 0, message: 'Starting…' });

    try {
      let photoBase64: string | undefined;
      let storedPhotoUri: string | undefined;
      if (mode === 'photo' && photoUri) {
        storedPhotoUri = await copyIntoBike(bikeId, 'source-photo', photoUri);
        photoBase64 = await readAsBase64(storedPhotoUri);
      }

      const outcome = await createBikeArtwork({
        bike: { id: bikeId, make: draft.make, model: draft.model, year: draft.year },
        apiKey: key,
        model: settings.geminiModel,
        mode: mode === 'photo' ? (keepPhotoLook ? 'photo-cutout' : 'photo-restyle') : 'render',
        angles: turntableAngles(settings.aiTurntable && mode !== 'photo'),
        photoBase64,
        photoMimeType: 'image/jpeg',
        onProgress: setProgress,
        signal: controller.signal,
      });

      setResult({
        heroUri: outcome.heroUri,
        angleUris: outcome.angleUris,
        sourcePhotoUri: storedPhotoUri,
        origin: outcome.origin,
      });
      setProgress({ stage: 'done', progress: 1, message: 'Artwork ready.' });
    } catch (err) {
      setError(describeArtworkError(err));
      setProgress({ stage: 'failed', progress: 0, message: 'Generation failed.' });
    } finally {
      abortRef.current = null;
    }
  }, [
    apiKey,
    bikeId,
    draft,
    keepPhotoLook,
    mode,
    onNext,
    patchSettings,
    photoUri,
    settings.aiTurntable,
    settings.geminiApiKey,
    settings.geminiModel,
  ]);

  const preview = result?.heroUri ? (
    <Panel style={{ alignItems: 'center', gap: 10 }}>
      <Checkerboard>
        <Image
          source={{ uri: result.heroUri }}
          style={{ width: '100%', height: 170 }}
          contentFit="contain"
        />
      </Checkerboard>
      <Txt variant="caption" dim>
        Transparent cut-out saved for this bike.
      </Txt>
    </Panel>
  ) : null;

  return (
    <OnboardingScaffold
      step={step}
      stepCount={stepCount}
      title="Now the artwork."
      subtitle={`${draft.year} ${draft.make} ${draft.model} — generate a studio render, cut out a photo of your own bike, or keep the built-in vector.`}
      footer={
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button label="Back" variant="ghost" onPress={onBack} style={{ flex: 0.5 }} />
          {result ? (
            <>
              <Button
                label="Redo"
                variant="secondary"
                onPress={() => {
                  setResult(null);
                  setProgress(null);
                }}
                style={{ flex: 0.6 }}
              />
              <Button label="Use this" size="lg" onPress={() => onNext(result)} style={{ flex: 1 }} />
            </>
          ) : (
            <Button
              label={
                mode === 'vector'
                  ? 'Use the vector bike'
                  : busy
                    ? 'Generating…'
                    : mode === 'photo'
                      ? 'Cut out my photo'
                      : 'Generate artwork'
              }
              size="lg"
              loading={busy}
              disabled={busy || (mode === 'photo' && !photoUri)}
              onPress={generate}
              style={{ flex: 1 }}
            />
          )}
        </View>
      }
    >
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 14, paddingBottom: 12 }}>
        <Segmented
          value={mode}
          onChange={(next) => {
            setMode(next);
            setResult(null);
            setError(null);
          }}
          options={[
            { value: 'render', label: 'AI render' },
            { value: 'photo', label: 'My photo' },
            { value: 'vector', label: 'Vector' },
          ]}
        />

        {progress && busy ? (
          <Panel style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <ActivityIndicator color={theme.colors.accent} />
              <Txt variant="body" size={14} style={{ flex: 1 }}>
                {progress.message}
              </Txt>
              {progress.frameCount && progress.frameCount > 1 ? (
                <Txt variant="mono" dim size={11}>
                  {`${progress.frame}/${progress.frameCount}`}
                </Txt>
              ) : null}
            </View>
            <View
              style={{
                height: 3,
                borderRadius: 2,
                backgroundColor: theme.colors.gaugeTrack,
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  height: 3,
                  width: `${Math.round(progress.progress * 100)}%`,
                  backgroundColor: theme.colors.accent,
                }}
              />
            </View>
          </Panel>
        ) : null}

        {preview}

        {error ? (
          <Panel style={{ borderColor: theme.colors.danger }}>
            <Txt variant="body" size={13} color={theme.colors.danger}>
              {error}
            </Txt>
          </Panel>
        ) : null}

        {mode === 'render' && !result ? (
          <View style={{ gap: 10 }}>
            <Txt variant="caption" dim style={{ lineHeight: 17 }}>
              The model is asked for a side-profile studio render on a flat chroma background; the
              app then keys that background out on device, so the bike lands on the dash with real
              transparency.
            </Txt>
            {settings.aiTurntable ? (
              <Txt variant="caption" dim>
                Turntable is on: three angles will be rendered for the 3D intro.
              </Txt>
            ) : null}
          </View>
        ) : null}

        {mode === 'photo' && !result ? (
          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button
                label="Take photo"
                variant="secondary"
                onPress={() => void pickPhoto(true)}
                style={{ flex: 1 }}
              />
              <Button
                label="Choose photo"
                variant="secondary"
                onPress={() => void pickPhoto(false)}
                style={{ flex: 1 }}
              />
            </View>
            {photoUri ? (
              <Panel style={{ gap: 10 }}>
                <Image
                  source={{ uri: photoUri }}
                  style={{ width: '100%', height: 150, borderRadius: theme.shape.radiusSm }}
                  contentFit="cover"
                />
                <Segmented
                  compact
                  value={keepPhotoLook ? 'cutout' : 'restyle'}
                  onChange={(next) => setKeepPhotoLook(next === 'cutout')}
                  options={[
                    { value: 'cutout', label: 'Keep my bike exactly' },
                    { value: 'restyle', label: 'Clean studio render' },
                  ]}
                />
                <Txt variant="caption" dim>
                  Side-on shots with the whole bike in frame cut out best.
                </Txt>
              </Panel>
            ) : (
              <Txt variant="caption" dim>
                Shoot the bike side-on, whole bike in frame. The AI removes the background and the
                app keys it to true transparency.
              </Txt>
            )}
          </View>
        ) : null}

        {mode === 'vector' ? (
          <Panel style={{ alignItems: 'center', gap: 8 }}>
            <VectorBike size={240} />
            <Txt variant="caption" dim>
              No API key needed. You can generate artwork any time from Settings.
            </Txt>
          </Panel>
        ) : null}

        {mode !== 'vector' ? (
          <View style={{ gap: 8 }}>
            {showKeyField ? (
              <>
                <Txt variant="label" dim>
                  Gemini API key
                </Txt>
                <Field
                  value={apiKey}
                  onChangeText={setApiKey}
                  placeholder="AIza…"
                  secure
                  autoCapitalize="none"
                />
                <Txt variant="caption" faint style={{ lineHeight: 16 }}>
                  Create a key at aistudio.google.com. It is stored on this device only and used
                  just for generating your bike artwork. Model: {modelLabel(settings.geminiModel)}.
                </Txt>
              </>
            ) : (
              <Button
                label="Change API key"
                variant="ghost"
                size="sm"
                onPress={() => setShowKeyField(true)}
              />
            )}
          </View>
        ) : null}
      </ScrollView>
    </OnboardingScaffold>
  );
}

function modelLabel(id: string): string {
  return IMAGE_MODELS.find((m) => m.id === id)?.label ?? id;
}

/** Checkerboard so a transparent cut-out is obviously transparent. */
function Checkerboard({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  const cell = 14;
  return (
    <View
      style={{
        width: '100%',
        borderRadius: theme.shape.radiusSm,
        overflow: 'hidden',
        backgroundColor: rgba(theme.colors.text, 0.06),
      }}
    >
      <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, flexDirection: 'row', flexWrap: 'wrap' }}>
        {Array.from({ length: 200 }, (_, i) => (
          <View
            key={i}
            style={{
              width: cell,
              height: cell,
              backgroundColor: i % 2 === 0 ? rgba(theme.colors.text, 0.04) : 'transparent',
            }}
          />
        ))}
      </View>
      {children}
    </View>
  );
}
