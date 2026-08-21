import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';

import { Button, Field, Segmented } from '../../../components/ui/Controls';
import { Panel } from '../../../components/ui/Panel';
import { Txt } from '../../../components/ui/Txt';
import { AngleDiagram } from '../../../components/vehicle/AngleDiagram';
import { useLayout } from '../../../hooks/useLayout';
import { copyIntoVehicle } from '../../../services/ai/assetStore';
import { IMAGE_MODELS, isConfigured } from '../../../services/ai/gemini';
import { ANGLE_GUIDE, ANGLE_LABEL, captureAngles } from '../../../services/ai/prompts';
import {
  ArtworkProgress,
  ArtworkResult,
  CaptureInput,
  createVehicleArtwork,
  describeArtworkError,
} from '../../../services/ai/vehicleArtwork';
import { useAppStore } from '../../../state/appStore';
import { VehicleAngle } from '../../../state/types';
import { useTheme } from '../../../theme/ThemeProvider';
import { rgba } from '../../../utils/color';
import { OnboardingScaffold } from '../OnboardingScaffold';

import { VehicleDraft } from './ModelStep';

export interface CaptureOutcome {
  photos: ArtworkResult['photos'];
  heroUri?: string;
  angleUris: string[];
  origin: 'ai-generated' | 'ai-cutout' | 'vector-fallback';
}

/**
 * Photograph the actual vehicle, from several angles.
 *
 * This is the step that makes the dash *yours*: a catalogue render draws a
 * factory-standard vehicle, but almost nobody rides or drives one — wheels,
 * paint, exhausts, light bars and stickers all differ. The side shot is
 * required because it is what the dash renders; the other angles feed the 3D
 * intro and give the model more of the vehicle to work from.
 */
export function CaptureStep({
  step,
  stepCount,
  vehicleId,
  draft,
  onBack,
  onNext,
}: {
  step: number;
  stepCount: number;
  vehicleId: string;
  draft: VehicleDraft;
  onBack: () => void;
  onNext: (outcome: CaptureOutcome) => void;
}) {
  const theme = useTheme();
  const layout = useLayout();
  const settings = useAppStore((s) => s.settings);
  const patchSettings = useAppStore((s) => s.patchSettings);

  const angles = useMemo(() => captureAngles(draft.type), [draft.type]);
  const [photos, setPhotos] = useState<Partial<Record<VehicleAngle, string>>>({});
  const [mode, setMode] = useState<'photo-cutout' | 'photo-restyle'>('photo-cutout');
  const [apiKey, setApiKey] = useState(settings.geminiApiKey);
  const [showKeyField, setShowKeyField] = useState(!isConfigured(settings.geminiApiKey));
  const [progress, setProgress] = useState<ArtworkProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ArtworkResult | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const busy = progress != null && progress.stage !== 'done' && progress.stage !== 'failed';
  const captured = angles.filter((angle) => photos[angle]);
  const hasSide = !!photos.side;
  const noun = draft.type === 'car' ? 'car' : 'bike';

  const pick = useCallback(
    async (angle: VehicleAngle, fromCamera: boolean) => {
      setError(null);
      const permission = fromCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setError(
          fromCamera
            ? 'Camera permission is needed to photograph your vehicle.'
            : 'Photo library permission is needed to pick a photo.',
        );
        return;
      }
      const picked = fromCamera
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.9 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
      if (picked.canceled || !picked.assets?.length) return;

      try {
        const stored = await copyIntoVehicle(vehicleId, `photo-${angle}`, picked.assets[0].uri);
        setPhotos((current) => ({ ...current, [angle]: stored }));
        setResult(null);
      } catch (err) {
        setError(describeArtworkError(err));
      }
    },
    [vehicleId],
  );

  const process = useCallback(
    async (fallbackToRender: boolean) => {
      setError(null);
      const key = apiKey.trim();
      if (!isConfigured(key)) {
        setError('Add a Gemini API key to process your photos, or use the built-in silhouette.');
        setShowKeyField(true);
        return;
      }
      if (key !== settings.geminiApiKey) patchSettings({ geminiApiKey: key });

      const controller = new AbortController();
      abortRef.current = controller;
      setProgress({ stage: 'reading', progress: 0, message: 'Starting…' });

      try {
        const inputs: CaptureInput[] = angles
          .filter((angle) => photos[angle])
          .map((angle) => ({ angle, sourceUri: photos[angle]! }));

        const outcome = await createVehicleArtwork({
          vehicle: { ...draft, id: vehicleId },
          apiKey: key,
          model: settings.geminiModel,
          mode: fallbackToRender ? 'render' : mode,
          photos: inputs,
          angles: fallbackToRender ? ['side', 'frontQuarter', 'front'] : undefined,
          onProgress: setProgress,
          signal: controller.signal,
        });

        setResult(outcome);
        setProgress({ stage: 'done', progress: 1, message: 'Artwork ready.' });
      } catch (err) {
        setError(describeArtworkError(err));
        setProgress({ stage: 'failed', progress: 0, message: 'Processing failed.' });
      } finally {
        abortRef.current = null;
      }
    },
    [
      angles,
      apiKey,
      draft,
      mode,
      patchSettings,
      photos,
      settings.geminiApiKey,
      settings.geminiModel,
      vehicleId,
    ],
  );

  const columns = layout.isLandscape || layout.isTablet ? 3 : 2;
  const slotWidth = `${100 / columns}%`;

  return (
    <OnboardingScaffold
      step={step}
      stepCount={stepCount}
      title={`Photograph your ${noun}.`}
      subtitle={`Yours is not a showroom ${noun} — wheels, paint, exhaust and every other change should show up on the dash. Shoot it from a few angles and the AI cuts it out to real transparency.`}
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
              <Button
                label="Use these"
                size="lg"
                onPress={() =>
                  onNext({
                    photos: result.photos,
                    heroUri: result.heroUri,
                    angleUris: result.angleUris,
                    origin: result.origin,
                  })
                }
                style={{ flex: 1 }}
              />
            </>
          ) : (
            <Button
              label={
                busy
                  ? 'Processing…'
                  : hasSide
                    ? `Process ${captured.length} photo${captured.length === 1 ? '' : 's'}`
                    : 'Add the side photo'
              }
              size="lg"
              loading={busy}
              disabled={busy || !hasSide}
              onPress={() => void process(false)}
              style={{ flex: 1 }}
            />
          )}
        </View>
      }
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ gap: 14, paddingBottom: 12 }}
      >
        {busy && progress ? (
          <Panel style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <ActivityIndicator color={theme.colors.accent} />
              <Txt variant="body" size={14} style={{ flex: 1 }}>
                {progress.message}
              </Txt>
              {progress.frameCount ? (
                <Txt variant="mono" dim size={11}>
                  {`${progress.frame}/${progress.frameCount}`}
                </Txt>
              ) : null}
            </View>
            {progress.angle ? (
              <Txt variant="label" size={9} faint>
                {ANGLE_LABEL[progress.angle]}
              </Txt>
            ) : null}
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

        {result ? (
          <ResultGrid
            result={result}
            columns={columns}
            onRetry={() => {
              setResult(null);
              setProgress(null);
            }}
          />
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {angles.map((angle) => (
              <View key={angle} style={{ width: slotWidth as unknown as number, padding: 4 }}>
                <CaptureSlot
                  angle={angle}
                  uri={photos[angle]}
                  required={angle === 'side'}
                  vehicleType={draft.type}
                  disabled={busy}
                  onCamera={() => void pick(angle, true)}
                  onLibrary={() => void pick(angle, false)}
                  onClear={() =>
                    setPhotos((current) => {
                      const next = { ...current };
                      delete next[angle];
                      return next;
                    })
                  }
                />
              </View>
            ))}
          </View>
        )}

        {error ? (
          <Panel style={{ borderColor: theme.colors.danger }}>
            <Txt variant="body" size={13} color={theme.colors.danger}>
              {error}
            </Txt>
          </Panel>
        ) : null}

        {!result ? (
          <>
            <View style={{ gap: 8 }}>
              <Txt variant="label" dim>
                What should the AI do with them?
              </Txt>
              <Segmented
                compact
                value={mode}
                onChange={(next) => setMode(next)}
                options={[
                  { value: 'photo-cutout', label: `Keep my ${noun} exactly` },
                  { value: 'photo-restyle', label: 'Clean studio render' },
                ]}
              />
              <Txt variant="caption" faint style={{ lineHeight: 16 }}>
                {mode === 'photo-cutout'
                  ? 'Your photo, background removed. Every modification survives — this is the honest option.'
                  : 'A studio render built from your photos: cleaner light, same colour and mods.'}
              </Txt>
            </View>

            <View style={{ gap: 8 }}>
              {showKeyField ? (
                <>
                  <Txt variant="label" dim>
                    Gemini API key
                  </Txt>
                  <Field value={apiKey} onChangeText={setApiKey} placeholder="AIza…" secure />
                  <Txt variant="caption" faint style={{ lineHeight: 16 }}>
                    Create one at aistudio.google.com. It stays on this device and is used only for
                    your vehicle artwork. Model: {modelLabel(settings.geminiModel)}.
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

            <Panel alt style={{ gap: 10 }}>
              <Txt variant="heading" size={14}>
                No photos right now?
              </Txt>
              <Txt variant="caption" dim style={{ lineHeight: 17 }}>
                You can come back to this from Settings → Artwork at any time. Until then the dash
                can use a catalogue render of a standard {draft.year} {draft.make} {draft.model}, or
                the built-in silhouette.
              </Txt>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Button
                  label="Stock render"
                  size="sm"
                  variant="secondary"
                  disabled={busy || !isConfigured(apiKey)}
                  onPress={() => void process(true)}
                  style={{ flex: 1 }}
                />
                <Button
                  label="Built-in silhouette"
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  onPress={() => onNext({ photos: [], angleUris: [], origin: 'vector-fallback' })}
                  style={{ flex: 1 }}
                />
              </View>
            </Panel>
          </>
        ) : null}
      </ScrollView>
    </OnboardingScaffold>
  );
}

/* --------------------------------------------------------------- one slot */

function CaptureSlot({
  angle,
  uri,
  required,
  vehicleType,
  disabled,
  onCamera,
  onLibrary,
  onClear,
}: {
  angle: VehicleAngle;
  uri?: string;
  required: boolean;
  vehicleType: VehicleDraft['type'];
  disabled?: boolean;
  onCamera: () => void;
  onLibrary: () => void;
  onClear: () => void;
}) {
  const theme = useTheme();

  return (
    <View
      style={{
        borderRadius: theme.shape.radiusSm,
        borderWidth: uri ? theme.shape.borderWidth : 1,
        borderColor: uri ? theme.colors.accent : theme.colors.border,
        borderStyle: uri ? 'solid' : 'dashed',
        backgroundColor: theme.colors.surface,
        overflow: 'hidden',
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${ANGLE_LABEL[angle]} photo`}
        disabled={disabled}
        onPress={uri ? onClear : onLibrary}
        style={{ height: 104, alignItems: 'center', justifyContent: 'center' }}
      >
        {uri ? (
          <Image source={{ uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
        ) : (
          <AngleDiagram angle={angle} type={vehicleType} size={84} />
        )}
        {required && !uri ? (
          <View
            style={{
              position: 'absolute',
              top: 6,
              right: 6,
              paddingHorizontal: 6,
              paddingVertical: 2,
              borderRadius: 4,
              backgroundColor: rgba(theme.colors.accent, 0.2),
            }}
          >
            <Txt variant="label" size={8} color={theme.colors.accent}>
              Required
            </Txt>
          </View>
        ) : null}
      </Pressable>

      <View style={{ padding: 8, gap: 6 }}>
        <Txt variant="label" size={9}>
          {ANGLE_LABEL[angle]}
        </Txt>
        <Txt variant="caption" size={10} faint numberOfLines={2} style={{ lineHeight: 13 }}>
          {ANGLE_GUIDE[angle]}
        </Txt>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <SlotAction label={uri ? 'Retake' : 'Camera'} onPress={onCamera} disabled={disabled} />
          <SlotAction label={uri ? 'Replace' : 'Library'} onPress={onLibrary} disabled={disabled} />
        </View>
      </View>
    </View>
  );
}

function SlotAction({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        paddingVertical: 6,
        borderRadius: theme.shape.radiusSm,
        borderWidth: theme.shape.borderWidth,
        borderColor: theme.colors.border,
        alignItems: 'center',
        opacity: disabled ? 0.4 : pressed ? 0.6 : 1,
      })}
    >
      <Txt variant="label" size={9} dim>
        {label}
      </Txt>
    </Pressable>
  );
}

/* ------------------------------------------------------------- the result */

function ResultGrid({
  result,
  columns,
  onRetry,
}: {
  result: ArtworkResult;
  columns: number;
  onRetry: () => void;
}) {
  const theme = useTheme();
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {result.photos.map((photo) => (
          <View
            key={photo.angle}
            style={{ width: `${100 / columns}%` as unknown as number, padding: 4 }}
          >
            <View
              style={{
                borderRadius: theme.shape.radiusSm,
                borderWidth: theme.shape.borderWidth,
                borderColor: photo.error ? theme.colors.danger : theme.colors.border,
                overflow: 'hidden',
              }}
            >
              <Checkerboard height={100}>
                {photo.assetUri ? (
                  <Image
                    source={{ uri: photo.assetUri }}
                    style={{ width: '100%', height: 100 }}
                    contentFit="contain"
                  />
                ) : (
                  <View style={{ height: 100, alignItems: 'center', justifyContent: 'center' }}>
                    <Txt variant="label" size={9} color={theme.colors.danger}>
                      Failed
                    </Txt>
                  </View>
                )}
              </Checkerboard>
              <View style={{ padding: 8, gap: 2 }}>
                <Txt variant="label" size={9}>
                  {ANGLE_LABEL[photo.angle]}
                </Txt>
                {photo.error ? (
                  <Txt variant="caption" size={10} color={theme.colors.danger} numberOfLines={2}>
                    {photo.error}
                  </Txt>
                ) : (
                  <Txt variant="caption" size={10} faint>
                    Transparent cut-out saved
                  </Txt>
                )}
              </View>
            </View>
          </View>
        ))}
      </View>

      {result.failed.length ? (
        <Panel style={{ gap: 8, borderColor: theme.colors.warn }}>
          <Txt variant="caption" color={theme.colors.warn}>
            {`${result.failed.length} angle${result.failed.length === 1 ? '' : 's'} did not process. The dash works with what succeeded — you can retry the rest now or from Settings.`}
          </Txt>
          <Button label="Try again" size="sm" variant="secondary" onPress={onRetry} />
        </Panel>
      ) : null}

      {!result.keyed ? (
        <Txt variant="caption" faint style={{ lineHeight: 16 }}>
          Background keying ran on the server image only — edges may be softer than usual because
          the on-device cut-out engine was unavailable.
        </Txt>
      ) : null}
    </View>
  );
}

/** Checkerboard so a transparent cut-out is obviously transparent. */
function Checkerboard({ children, height }: { children: React.ReactNode; height: number }) {
  const theme = useTheme();
  const cell = 12;
  return (
    <View style={{ height, backgroundColor: rgba(theme.colors.text, 0.06) }}>
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          flexDirection: 'row',
          flexWrap: 'wrap',
        }}
      >
        {Array.from({ length: 220 }, (_, i) => (
          <View
            key={i}
            style={{
              width: cell,
              height: cell,
              backgroundColor: i % 2 === 0 ? rgba(theme.colors.text, 0.05) : 'transparent',
            }}
          />
        ))}
      </View>
      {children}
    </View>
  );
}

function modelLabel(id: string): string {
  return IMAGE_MODELS.find((m) => m.id === id)?.label ?? id;
}
