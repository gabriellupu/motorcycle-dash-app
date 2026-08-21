import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { VehicleAutocomplete } from '../../../components/ui/Autocomplete';
import { Button, Field } from '../../../components/ui/Controls';
import { Panel } from '../../../components/ui/Panel';
import { Txt } from '../../../components/ui/Txt';
import {
  CarBodyStyle,
  VehicleCatalogEntry,
  VehicleType,
  findEntry,
  yearsFor,
} from '../../../data/vehicles';
import { VehicleProfile } from '../../../state/types';
import { useTheme } from '../../../theme/ThemeProvider';
import { OnboardingScaffold } from '../OnboardingScaffold';

export interface VehicleDraft {
  type: VehicleType;
  make: string;
  model: string;
  year: number;
  displacementCc?: number;
  bodyStyle?: CarBodyStyle;
  colorHint?: string;
  redlineRpm: number;
  maxRpm: number;
  maxSpeedKph: number;
}

/** Make/model/year selection, with a hand-entry path for anything exotic. */
export function ModelStep({
  step,
  stepCount,
  type,
  initial,
  onBack,
  onNext,
}: {
  step: number;
  stepCount: number;
  type: VehicleType;
  initial?: VehicleProfile | null;
  onBack: () => void;
  onNext: (draft: VehicleDraft) => void;
}) {
  const theme = useTheme();
  const currentYear = new Date().getFullYear();
  const isCar = type === 'car';

  const [entry, setEntry] = useState<VehicleCatalogEntry | null>(() =>
    initial && initial.type === type ? (findEntry(type, initial.make, initial.model) ?? null) : null,
  );
  const [manual, setManual] = useState<{ make: string; model: string } | null>(() =>
    initial && initial.type === type && !findEntry(type, initial.make, initial.model)
      ? { make: initial.make, model: initial.model }
      : null,
  );
  const [year, setYear] = useState<number>(initial?.year ?? currentYear);
  const [colorHint, setColorHint] = useState(initial?.colorHint ?? '');

  const years = useMemo(() => {
    if (entry) return yearsFor(entry);
    const out: number[] = [];
    for (let y = currentYear + 1; y >= 1960; y--) out.push(y);
    return out;
  }, [entry, currentYear]);

  const chosen = entry ? { make: entry.make, model: entry.model } : manual;

  const submit = () => {
    if (!chosen) return;
    const redline = entry?.redlineRpm || (isCar ? 6500 : 10_500);
    onNext({
      type,
      make: chosen.make,
      model: chosen.model,
      year,
      displacementCc: entry?.displacementCc,
      bodyStyle: entry?.bodyStyle ?? (isCar ? 'hatch' : undefined),
      colorHint: colorHint.trim() || undefined,
      redlineRpm: redline,
      maxRpm: Math.round(redline * 1.12),
      maxSpeedKph: entry?.topSpeedKph || (isCar ? 200 : 200),
    });
  };

  return (
    <OnboardingScaffold
      step={step}
      stepCount={stepCount}
      title={isCar ? 'Which car is this?' : 'Which bike is this?'}
      subtitle="It sets the tach scale, the redline and what the AI knows about your vehicle. All of it is editable later."
      footer={
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button label="Back" variant="ghost" onPress={onBack} style={{ flex: 0.5 }} />
          <Button
            label={chosen ? `Continue with ${chosen.model}` : 'Pick a model'}
            onPress={submit}
            disabled={!chosen}
            size="lg"
            style={{ flex: 1 }}
          />
        </View>
      }
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ gap: 16, paddingBottom: 12 }}
      >
        {chosen ? (
          <Panel>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Txt variant="label" size={10} color={theme.colors.accent}>
                  Selected
                </Txt>
                <Txt variant="title" size={22}>
                  {`${chosen.make} ${chosen.model}`}
                </Txt>
                <Txt variant="caption" dim>
                  {entry
                    ? `${entry.displacementCc ? `${entry.displacementCc} cc · ` : 'Electric · '}${
                        entry.redlineRpm ? `redline ${entry.redlineRpm.toLocaleString()} rpm` : 'no tach'
                      }`
                    : 'Custom entry — check the gauge limits in Settings'}
                </Txt>
              </View>
              <Button
                label="Change"
                variant="secondary"
                size="sm"
                onPress={() => {
                  setEntry(null);
                  setManual(null);
                }}
              />
            </View>
          </Panel>
        ) : (
          <VehicleAutocomplete
            type={type}
            onSelect={(selected) => {
              setEntry(selected);
              setManual(null);
              setYear(Math.min(selected.lastYear, Math.max(selected.firstYear, year)));
            }}
            onManual={(query) => {
              const [make, ...rest] = query.split(' ');
              setManual({ make, model: rest.join(' ') || query });
              setEntry(null);
            }}
          />
        )}

        {manual ? (
          <View style={{ gap: 10 }}>
            <Txt variant="label" dim>
              Make
            </Txt>
            <Field
              value={manual.make}
              onChangeText={(value) => setManual({ ...manual, make: value })}
              autoCapitalize="words"
              placeholder={isCar ? 'e.g. Koenigsegg' : 'e.g. Bimota'}
            />
            <Txt variant="label" dim>
              Model
            </Txt>
            <Field
              value={manual.model}
              onChangeText={(value) => setManual({ ...manual, model: value })}
              autoCapitalize="words"
              placeholder={isCar ? 'e.g. Jesko' : 'e.g. Tesi H2'}
            />
          </View>
        ) : null}

        <View style={{ gap: 8 }}>
          <Txt variant="label" dim>
            Year
          </Txt>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingVertical: 2 }}
          >
            {years.map((option) => {
              const active = option === year;
              return (
                <Pressable
                  key={option}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => setYear(option)}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: theme.shape.radiusSm,
                    borderWidth: theme.shape.borderWidth,
                    borderColor: active ? theme.colors.accent : theme.colors.border,
                    backgroundColor: active ? theme.colors.accent : theme.colors.surface,
                  }}
                >
                  <Txt variant="value" size={15} color={active ? theme.colors.bg : theme.colors.text}>
                    {String(option)}
                  </Txt>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <View style={{ gap: 8 }}>
          <Txt variant="label" dim>
            Colour and modifications (optional)
          </Txt>
          <Field
            value={colorHint}
            onChangeText={setColorHint}
            autoCapitalize="sentences"
            placeholder={
              isCar ? 'Nardo grey, black wheels, lowered' : 'Matte black, Akrapovič, tail tidy'
            }
          />
          <Txt variant="caption" faint style={{ lineHeight: 16 }}>
            Your photos do most of the work, but anything you note here goes into the AI prompt too.
          </Txt>
        </View>
      </ScrollView>
    </OnboardingScaffold>
  );
}
