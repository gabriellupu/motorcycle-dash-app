import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { VehicleCatalogEntry, VehicleType, searchVehicles } from '../../data/vehicles';
import { useTheme } from '../../theme/ThemeProvider';

import { Field } from './Controls';
import { Txt } from './Txt';

interface Props {
  type: VehicleType;
  onSelect: (entry: VehicleCatalogEntry) => void;
  /** Called when the rider's vehicle is not in the catalogue. */
  onManual: (query: string) => void;
  placeholder?: string;
  maxHeight?: number;
}

/**
 * Make/model search over the bundled catalogue, scoped to the chosen vehicle
 * type.
 *
 * Matching is forgiving — "mt09", "yam mt", "Yamaha MT-09" all land on the same
 * vehicle — and there is always an escape hatch for something we do not list.
 */
export function VehicleAutocomplete({
  type,
  onSelect,
  onManual,
  placeholder,
  maxHeight = 260,
}: Props) {
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const results = useMemo(() => searchVehicles(query, type, 14), [query, type]);
  const showManual = query.trim().length > 2;

  return (
    <View style={{ gap: 10 }}>
      <Field
        value={query}
        onChangeText={setQuery}
        placeholder={placeholder ?? 'Search make and model…'}
        autoCapitalize="words"
      />

      {query.trim().length === 0 ? null : (
        <View
          style={{
            borderRadius: theme.shape.radiusSm,
            borderWidth: theme.shape.borderWidth,
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.surface,
            maxHeight,
            overflow: 'hidden',
          }}
        >
          <ScrollView keyboardShouldPersistTaps="handled">
            {results.map((entry) => (
              <Pressable
                key={`${entry.make}-${entry.model}`}
                accessibilityRole="button"
                onPress={() => onSelect(entry)}
                style={({ pressed }) => ({
                  paddingVertical: 12,
                  paddingHorizontal: 14,
                  backgroundColor: pressed ? theme.colors.surfaceAlt : 'transparent',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                })}
              >
                <View style={{ flex: 1 }}>
                  <Txt variant="body" size={15}>
                    {entry.label}
                  </Txt>
                  <Txt variant="caption" dim>
                    {entry.displacementCc ? `${entry.displacementCc} cc · ` : 'Electric · '}
                    {entry.bodyStyle ? `${entry.bodyStyle} · ` : ''}
                    {entry.firstYear}–
                    {entry.lastYear > new Date().getFullYear() ? 'now' : entry.lastYear}
                  </Txt>
                </View>
                <Txt variant="label" size={10} color={theme.colors.accent}>
                  Select
                </Txt>
              </Pressable>
            ))}

            {results.length === 0 ? (
              <View style={{ padding: 16 }}>
                <Txt variant="body" dim>
                  No match in the catalogue.
                </Txt>
              </View>
            ) : null}

            {showManual ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => onManual(query.trim())}
                style={({ pressed }) => ({
                  paddingVertical: 12,
                  paddingHorizontal: 14,
                  borderTopWidth: theme.shape.borderWidth,
                  borderTopColor: theme.colors.border,
                  backgroundColor: pressed ? theme.colors.surfaceAlt : 'transparent',
                })}
              >
                <Txt variant="body" color={theme.colors.accent}>
                  Use “{query.trim()}” anyway
                </Txt>
                <Txt variant="caption" dim>
                  Enter the details by hand
                </Txt>
              </Pressable>
            ) : null}
          </ScrollView>
        </View>
      )}
    </View>
  );
}
