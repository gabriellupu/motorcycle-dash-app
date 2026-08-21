import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, Path, Stop } from 'react-native-svg';

import { useTheme } from '../../theme/ThemeProvider';
import { rgba } from '../../utils/color';

/**
 * Built-in schematic motorcycle, drawn as vectors.
 *
 * Used before the AI artwork exists (no API key, generation failed, offline) so
 * the dash always has a bike on it. It is deliberately a clean side-profile
 * schematic rather than a bad photo imitation, and it inherits theme colours.
 */
export function VectorBike({
  size = 320,
  wireframe,
  opacity = 1,
}: {
  size?: number;
  wireframe?: boolean;
  opacity?: number;
}) {
  const theme = useTheme();
  const { colors } = theme;
  const accent = colors.accent;
  const body = wireframe ? 'none' : rgba(colors.accent, 0.16);
  const line = wireframe ? accent : rgba(colors.text, 0.85);
  const height = size * (260 / 420);

  return (
    <View style={{ width: size, height, opacity }}>
      <Svg width={size} height={height} viewBox="0 0 420 260">
        <Defs>
          <LinearGradient id="tank" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={accent} stopOpacity={wireframe ? 0 : 0.55} />
            <Stop offset="1" stopColor={accent} stopOpacity={wireframe ? 0 : 0.12} />
          </LinearGradient>
        </Defs>

        <G>
          {/* Tyres — fat, low, motorcycle proportions rather than bicycle ones */}
          <Circle cx={96} cy={178} r={46} stroke={line} strokeWidth={14} fill="none" />
          <Circle cx={96} cy={178} r={26} stroke={rgba(accent, 0.8)} strokeWidth={4} fill="none" />
          <Circle cx={96} cy={178} r={7} fill={line} />
          <Circle cx={330} cy={178} r={46} stroke={line} strokeWidth={13} fill="none" />
          <Circle cx={330} cy={178} r={26} stroke={rgba(accent, 0.8)} strokeWidth={4} fill="none" />
          <Circle cx={330} cy={178} r={7} fill={line} />

          {/* Cast-wheel spokes */}
          {[0, 60, 120].map((deg) => (
            <G key={`spokes-${deg}`}>
              <Path
                d={spoke(96, 178, 26, deg)}
                stroke={rgba(accent, 0.5)}
                strokeWidth={4}
                fill="none"
              />
              <Path
                d={spoke(330, 178, 26, deg + 30)}
                stroke={rgba(accent, 0.5)}
                strokeWidth={4}
                fill="none"
              />
            </G>
          ))}

          {/* Swingarm + chain run */}
          <Path d="M96 178 L204 160" stroke={line} strokeWidth={13} strokeLinecap="round" fill="none" />
          <Path
            d="M96 172 L198 156"
            stroke={rgba(accent, 0.5)}
            strokeWidth={2}
            strokeDasharray="5 4"
            fill="none"
          />

          {/* Exhaust header sweeping back to the can */}
          <Path
            d="M238 176 C 222 194 198 198 178 188"
            stroke={line}
            strokeWidth={8}
            strokeLinecap="round"
            fill="none"
          />
          <Path
            d="M188 184 L 146 166"
            stroke={line}
            strokeWidth={17}
            strokeLinecap="round"
            fill="none"
          />

          {/* Engine: crankcase plus a forward-canted cylinder block */}
          <Path
            d="M166 146 L214 136 L238 156 L232 182 L192 190 L162 172 Z"
            fill={wireframe ? 'none' : rgba(colors.text, 0.24)}
            stroke={line}
            strokeWidth={3}
            strokeLinejoin="round"
          />
          <Path
            d="M200 138 L244 122 L256 146 L216 158 Z"
            fill={wireframe ? 'none' : rgba(colors.text, 0.18)}
            stroke={line}
            strokeWidth={3}
            strokeLinejoin="round"
          />

          {/* Frame: spine to the headstock, downtube to the engine */}
          <Path d="M204 124 L280 112" stroke={line} strokeWidth={9} strokeLinecap="round" fill="none" />
          <Path d="M278 116 L246 150" stroke={line} strokeWidth={7} strokeLinecap="round" fill="none" />
          <Path d="M206 128 L212 152" stroke={line} strokeWidth={7} strokeLinecap="round" fill="none" />

          {/* Tank */}
          <Path
            d="M198 124 C 212 96 254 86 282 102 L 284 122 C 256 138 218 140 198 124 Z"
            fill={wireframe ? 'none' : 'url(#tank)'}
            stroke={line}
            strokeWidth={3}
            strokeLinejoin="round"
          />

          {/* Seat and tail unit */}
          <Path
            d="M128 122 C 152 110 186 108 202 120 L 200 132 L 134 138 Z"
            fill={body}
            stroke={line}
            strokeWidth={3}
            strokeLinejoin="round"
          />
          <Path
            d="M130 122 L 104 104 L 150 108 Z"
            fill={wireframe ? 'none' : rgba(accent, 0.3)}
            stroke={line}
            strokeWidth={3}
            strokeLinejoin="round"
          />

          {/* Forks, raked like a real front end */}
          <Path d="M330 178 L292 104" stroke={line} strokeWidth={10} strokeLinecap="round" fill="none" />
          <Path
            d="M342 172 L304 100"
            stroke={rgba(line, 0.5)}
            strokeWidth={6}
            strokeLinecap="round"
            fill="none"
          />
          <Path d="M288 106 L310 98" stroke={line} strokeWidth={9} strokeLinecap="round" fill="none" />
          {/* Front fender */}
          <Path
            d="M296 138 C 318 120 350 126 362 148"
            stroke={line}
            strokeWidth={8}
            strokeLinecap="round"
            fill="none"
          />

          {/* Headlight nose */}
          <Path
            d="M286 90 L 312 82 L 320 106 L 294 114 Z"
            fill={wireframe ? 'none' : rgba(accent, 0.35)}
            stroke={line}
            strokeWidth={3}
            strokeLinejoin="round"
          />
          {/* Bars */}
          <Path d="M290 94 L 258 80" stroke={line} strokeWidth={7} strokeLinecap="round" fill="none" />
          <Path d="M300 88 L 326 80" stroke={line} strokeWidth={7} strokeLinecap="round" fill="none" />
        </G>
      </Svg>
    </View>
  );
}

/** A single spoke chord across the rim, at `deg` degrees. */
function spoke(cx: number, cy: number, r: number, deg: number): string {
  const rad = (deg * Math.PI) / 180;
  const x = Math.cos(rad) * r;
  const y = Math.sin(rad) * r;
  return `M${cx - x} ${cy - y} L${cx + x} ${cy + y}`;
}
