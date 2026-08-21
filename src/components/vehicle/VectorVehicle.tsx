import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, Path, Stop } from 'react-native-svg';

import { CarBodyStyle, VehicleType } from '../../data/vehicles';
import { useTheme } from '../../theme/ThemeProvider';
import { rgba } from '../../utils/color';

const RATIO = 260 / 420;

interface CommonProps {
  size?: number;
  wireframe?: boolean;
  opacity?: number;
}

/**
 * Built-in schematic vehicle, drawn as vectors.
 *
 * Used until the AI cut-outs exist (no API key, generation failed, photos not
 * taken yet) so the dash always has a subject. Deliberately a clean side-profile
 * schematic rather than a bad photo imitation, and it inherits theme colours.
 */
export function VectorVehicle({
  type,
  bodyStyle,
  ...rest
}: CommonProps & { type: VehicleType; bodyStyle?: CarBodyStyle }) {
  return type === 'car' ? (
    <VectorCar bodyStyle={bodyStyle} {...rest} />
  ) : (
    <VectorMotorcycle {...rest} />
  );
}

/* ------------------------------------------------------------- motorcycle */

export function VectorMotorcycle({ size = 320, wireframe, opacity = 1 }: CommonProps) {
  const theme = useTheme();
  const { colors } = theme;
  const accent = colors.accent;
  const body = wireframe ? 'none' : rgba(colors.accent, 0.16);
  const line = wireframe ? accent : rgba(colors.text, 0.85);

  return (
    <View style={{ width: size, height: size * RATIO, opacity }}>
      <Svg width={size} height={size * RATIO} viewBox="0 0 420 260">
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
              <Path d={spoke(96, 178, 26, deg)} stroke={rgba(accent, 0.5)} strokeWidth={4} fill="none" />
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
          <Path d="M188 184 L 146 166" stroke={line} strokeWidth={17} strokeLinecap="round" fill="none" />

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

/* --------------------------------------------------------------------- car */

interface CarShape {
  /** Body outline. */
  body: string;
  /** Glasshouse. */
  glass: string;
  /** Extra detail lines (door shut, bed line…). */
  details: string[];
  rearWheelX: number;
  frontWheelX: number;
  wheelR: number;
  wheelY: number;
}

/**
 * Side profiles per body style. Same ground line and wheelbase throughout so a
 * hatch and an SUV sit at the same scale on the dash.
 */
function carShape(style: CarBodyStyle): CarShape {
  const wheelY = 186;
  const base = { rearWheelX: 112, frontWheelX: 318, wheelR: 34, wheelY };

  switch (style) {
    case 'suv':
      return {
        ...base,
        wheelR: 40,
        body:
          'M44 190 L44 140 C 46 126 60 120 78 116 L 140 106 L 168 78 C 176 68 190 64 206 64 ' +
          'L 268 64 C 286 66 296 74 308 90 L 330 118 C 362 124 388 136 392 152 L 394 190 Z',
        glass:
          'M152 104 L 176 76 C 181 70 190 68 200 68 L 262 68 C 274 70 281 76 289 88 L 300 106 Z',
        details: ['M226 68 L 226 106', 'M394 156 L 358 158', 'M44 158 L 78 158'],
      };
    case 'coupe':
      return {
        ...base,
        body:
          'M46 194 L 44 152 C 46 140 58 134 78 130 L 130 122 L 176 92 C 190 84 208 82 228 82 ' +
          'L 262 84 C 278 88 288 96 300 112 L 322 132 C 358 138 388 146 392 160 L 393 194 Z',
        glass: 'M160 118 L 190 96 C 200 90 212 88 226 88 L 258 90 C 268 94 276 102 284 116 Z',
        details: ['M224 90 L 222 120', 'M393 164 L 356 166'],
      };
    case 'estate':
      return {
        ...base,
        body:
          'M42 192 L 42 148 C 42 132 52 124 70 118 L 84 96 C 90 88 102 84 116 84 L 262 84 ' +
          'C 280 86 292 94 302 110 L 324 130 C 360 136 388 144 392 158 L 393 192 Z',
        glass:
          'M92 114 L 104 92 C 108 88 114 86 122 86 L 258 88 C 268 92 276 98 284 112 Z',
        details: ['M170 88 L 168 114', 'M226 88 L 224 114', 'M393 162 L 356 164'],
      };
    case 'sedan':
      return {
        ...base,
        body:
          'M42 192 L 42 150 C 44 136 56 130 76 126 L 128 118 L 168 88 C 178 82 192 80 208 80 ' +
          'L 258 82 C 274 86 284 94 296 110 L 322 130 C 358 136 388 144 392 158 L 393 192 Z',
        glass: 'M152 114 L 182 90 C 190 86 200 84 212 84 L 254 86 C 266 90 274 98 282 112 Z',
        details: ['M214 84 L 212 114', 'M393 162 L 356 164', 'M42 160 L 78 160'],
      };
    case 'pickup':
      return {
        ...base,
        wheelR: 38,
        rearWheelX: 100,
        frontWheelX: 328,
        body:
          'M38 190 L 38 128 L 186 128 L 190 92 C 194 78 206 72 222 72 L 268 72 ' +
          'C 284 74 294 82 304 98 L 324 122 C 360 128 388 138 392 154 L 393 190 Z',
        glass: 'M198 118 L 204 92 C 208 82 216 78 226 78 L 264 78 C 274 82 282 90 290 104 L 296 118 Z',
        details: ['M38 128 L 186 128', 'M236 78 L 234 118', 'M393 158 L 356 160'],
      };
    case 'van':
      return {
        ...base,
        wheelR: 36,
        rearWheelX: 104,
        frontWheelX: 330,
        body:
          'M36 192 L 36 76 C 36 68 44 64 56 64 L 286 64 C 306 66 320 78 332 96 ' +
          'L 356 130 C 380 136 392 144 393 158 L 393 192 Z',
        glass: 'M252 74 L 288 74 C 300 78 310 88 320 104 L 330 120 L 252 120 Z',
        details: ['M240 64 L 240 192', 'M120 100 L 220 100', 'M393 162 L 356 164'],
      };
    case 'hatch':
    default:
      return {
        ...base,
        body:
          'M50 192 L 48 148 C 50 134 60 126 78 122 L 96 96 C 104 84 118 80 134 80 L 254 82 ' +
          'C 272 86 284 94 296 110 L 322 130 C 358 136 388 144 392 158 L 393 192 Z',
        glass: 'M104 116 L 118 92 C 124 86 132 84 142 84 L 250 86 C 262 90 270 98 280 112 Z',
        details: ['M186 84 L 184 116', 'M393 162 L 356 164', 'M48 158 L 80 158'],
      };
  }
}

export function VectorCar({
  size = 320,
  wireframe,
  opacity = 1,
  bodyStyle = 'hatch',
}: CommonProps & { bodyStyle?: CarBodyStyle }) {
  const theme = useTheme();
  const { colors } = theme;
  const accent = colors.accent;
  const line = wireframe ? accent : rgba(colors.text, 0.85);
  const shape = carShape(bodyStyle);

  return (
    <View style={{ width: size, height: size * RATIO, opacity }}>
      <Svg width={size} height={size * RATIO} viewBox="0 0 420 260">
        <Defs>
          <LinearGradient id="carBody" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={accent} stopOpacity={wireframe ? 0 : 0.42} />
            <Stop offset="1" stopColor={accent} stopOpacity={wireframe ? 0 : 0.1} />
          </LinearGradient>
        </Defs>

        <G>
          {/* Body */}
          <Path
            d={shape.body}
            fill={wireframe ? 'none' : 'url(#carBody)'}
            stroke={line}
            strokeWidth={3.5}
            strokeLinejoin="round"
          />
          {/* Glasshouse */}
          <Path
            d={shape.glass}
            fill={wireframe ? 'none' : rgba(colors.text, 0.2)}
            stroke={line}
            strokeWidth={2.5}
            strokeLinejoin="round"
          />
          {/* Shut lines and lamps */}
          {shape.details.map((d, index) => (
            <Path key={index} d={d} stroke={rgba(line, 0.65)} strokeWidth={2.2} fill="none" />
          ))}

          {/* Wheels sit on top of the body, which reads as an arch cut-out */}
          {[shape.rearWheelX, shape.frontWheelX].map((cx, index) => (
            <G key={cx}>
              <Circle
                cx={cx}
                cy={shape.wheelY}
                r={shape.wheelR}
                fill={wireframe ? 'none' : colors.bg}
                stroke={line}
                strokeWidth={10}
              />
              <Circle
                cx={cx}
                cy={shape.wheelY}
                r={shape.wheelR - 15}
                stroke={rgba(accent, 0.8)}
                strokeWidth={4}
                fill="none"
              />
              <Circle cx={cx} cy={shape.wheelY} r={5} fill={line} />
              {[0, 60, 120].map((deg) => (
                <Path
                  key={`${cx}-${deg}`}
                  d={spoke(cx, shape.wheelY, shape.wheelR - 15, deg + index * 30)}
                  stroke={rgba(accent, 0.45)}
                  strokeWidth={3}
                  fill="none"
                />
              ))}
            </G>
          ))}
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
