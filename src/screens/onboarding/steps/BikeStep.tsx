import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { BikeAutocomplete } from '../../../components/ui/Autocomplete';
import { Button, Field } from '../../../components/ui/Controls';
import { Panel } from '../../../components/ui/Panel';
import { Txt } from '../../../components/ui/Txt';
import { BikeCatalogEntry, findEntry, yearsFor } from '../../../data/motorcycles';
import { useTheme } from '../../../theme/ThemeProvider';
import { BikeProfile } from '../../../state/types';
import { OnboardingScaffold } from '../OnboardingScaffold';

export interface BikeDraft {
  make: string;
  model: string;
  year: number;
  displacementCc?: number;
  redlineRpm: number;
  maxRpm: number;
  maxSpeedKph: number;
}

/** Make/model/year selection, with a hand-entry path for anything exotic. */
export function BikeStep({
  step,
  stepCount,
  initial,
  onBack,
  onNext,
}: {
  step: number;
  stepCount: number;
  initial?: BikeProfile | null;
  onBack: () => void;
  onNext: (draft: BikeDraft) => void;
}) {
  const theme = useTheme();
  const currentYear = new Date().getFullYear();

  const [entry, setEntry] = useState<BikeCatalogEntry | null>(() =>
    initial ? (findEntry(initial.make, initial.model) ?? null) : null,
  );
  const [manual, setManual] = useState<{ make: string; model: string } | null>(() =>
    initial && !findEntry(initial.make, initial.model)
      ? { make: initial.make, model: initial.model }
      : null,
  );
  const [year, setYear] = useState<number>(initial?.year ?? currentYear);

  const years = useMemo(() => {
    if (entry) return yearsFor(entry);
    const out: number[] = [];
    for (let y = currentYear + 1; y >= 1970; y--) out.push(y);
    return out;
  }, [entry, currentYear]);

  const chosen = entry
    ? { make: entry.make, model: entry.model }
    : manual
      ? manual
      : null;

  const submit = () => {
    if (!chosen) return;
    const redline = entry?.redlineRpm || 10_500;
    onNext({
      make: chosen.make,
      model: chosen.model,
      year,
      displacementCc: entry?.displacementCc,
      redlineRpm: redline || 10_500,
      maxRpm: Math.round((redline || 10_500) * 1.12),
      maxSpeedKph: entry?.topSpeedKph || 200,
    });
  };

  return (
    <OnboardingScaffold
      step={step}
      stepCount={stepCount}
      title="Which bike is this?"
      subtitle="It sets the tach scale, the redline and what the AI draws. You can change any of it later."
      footer={
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button label="Back" variant="ghost" onPress={onBack} style={{ flex: 0.5 }} />
          <Button
            label={chosen ? `Continue with ${chosen.model}` : 'Pick a bike'}
            onPress={submit}
            disabled={!chosen}
            size="lg"
            style={{ flex: 1 }}
          />
        </View>
      }
    >
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 16, paddingBottom: 12 }}>
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
                    ? `${entry.displacementCc ? `${entry.displacementCc} cc · ` : 'Electric · '}redline ${entry.redlineRpm.toLocaleString()} rpm`
                    : 'Custom entry — check the tach limits in Settings'}
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
          <BikeAutocomplete
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
              placeholder="e.g. Bimota"
            />
            <Txt variant="label" dim>
              Model
            </Txt>
            <Field
              value={manual.model}
              onChangeText={(value) => setManual({ ...manual, model: value })}
              autoCapitalize="words"
              placeholder="e.g. Tesi H2"
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
                  <Txt
                    variant="value"
                    size={15}
                    color={active ? theme.colors.bg : theme.colors.text}
                  >
                    {String(option)}
                  </Txt>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </ScrollView>
    </OnboardingScaffold>
  );
}
