import { View, type ViewStyle } from 'react-native';

/**
 * Geometric stand-ins for the SF Symbols the real control renders.
 *
 * Control Center draws the actual SF Symbol; React Native has no built-in way
 * to render one, and the demo takes no image dependencies, so these are built
 * out of plain Views. The symbol's real name is always shown next to it.
 */
export type GlyphName =
  | 'moon.fill'
  | 'bolt.fill'
  | 'sparkles'
  | 'camera.fill'
  | 'mic.fill'
  | 'checkmark.circle.fill';

export const GLYPHS: GlyphName[] = [
  'moon.fill',
  'bolt.fill',
  'sparkles',
  'camera.fill',
  'mic.fill',
  'checkmark.circle.fill',
];

type Props = {
  name: GlyphName;
  size?: number;
  color: string;
  /** Colour used to "cut out" shapes, e.g. the moon's inner disc. */
  cutout: string;
};

export function Glyph({ name, size = 26, color, cutout }: Props) {
  const box: ViewStyle = {
    width: size,
    height: size,
    alignItems: 'center',
    justifyContent: 'center',
  };
  const u = size / 24;

  switch (name) {
    case 'moon.fill':
      return (
        <View style={box}>
          <View
            style={{
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: color,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                position: 'absolute',
                top: -size * 0.3,
                left: size * 0.22,
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: cutout,
              }}
            />
          </View>
        </View>
      );

    case 'bolt.fill':
      return (
        <View style={box}>
          <View
            style={{
              position: 'absolute',
              top: u * 1,
              left: size * 0.42,
              width: u * 7,
              height: u * 12,
              backgroundColor: color,
              borderRadius: u,
              transform: [{ rotate: '20deg' }, { skewX: '-16deg' }],
            }}
          />
          <View
            style={{
              position: 'absolute',
              bottom: u * 1,
              right: size * 0.42,
              width: u * 7,
              height: u * 12,
              backgroundColor: color,
              borderRadius: u,
              transform: [{ rotate: '20deg' }, { skewX: '-16deg' }],
            }}
          />
        </View>
      );

    case 'sparkles':
      return (
        <View style={box}>
          <View
            style={{
              position: 'absolute',
              width: u * 3,
              height: size,
              borderRadius: u * 1.5,
              backgroundColor: color,
            }}
          />
          <View
            style={{
              position: 'absolute',
              width: size,
              height: u * 3,
              borderRadius: u * 1.5,
              backgroundColor: color,
            }}
          />
          <View
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: u * 7,
              height: u * 7,
              borderRadius: u * 3.5,
              backgroundColor: color,
              opacity: 0.55,
              transform: [{ translateX: u * 2 }, { translateY: -u * 2 }],
            }}
          />
        </View>
      );

    case 'camera.fill':
      return (
        <View style={box}>
          <View
            style={{
              width: size,
              height: size * 0.74,
              borderRadius: u * 5,
              backgroundColor: color,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View
              style={{
                width: size * 0.34,
                height: size * 0.34,
                borderRadius: size * 0.17,
                backgroundColor: cutout,
              }}
            />
          </View>
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: size * 0.28,
              width: size * 0.3,
              height: u * 4,
              borderTopLeftRadius: u * 2,
              borderTopRightRadius: u * 2,
              backgroundColor: color,
            }}
          />
        </View>
      );

    case 'mic.fill':
      return (
        <View style={box}>
          <View
            style={{
              width: size * 0.42,
              height: size * 0.58,
              borderRadius: size * 0.21,
              backgroundColor: color,
              marginBottom: u * 1.5,
            }}
          />
          <View
            style={{
              width: size * 0.72,
              height: size * 0.3,
              borderBottomLeftRadius: size * 0.36,
              borderBottomRightRadius: size * 0.36,
              borderColor: color,
              borderWidth: u * 2.4,
              borderTopWidth: 0,
              position: 'absolute',
              bottom: u * 3,
            }}
          />
          <View
            style={{
              position: 'absolute',
              bottom: 0,
              width: size * 0.36,
              height: u * 2.4,
              borderRadius: u,
              backgroundColor: color,
            }}
          />
        </View>
      );

    case 'checkmark.circle.fill':
    default:
      return (
        <View style={box}>
          <View
            style={{
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: color,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View
              style={{
                width: u * 5,
                height: u * 2.6,
                backgroundColor: cutout,
                borderRadius: u,
                position: 'absolute',
                transform: [
                  { translateX: -u * 3.4 },
                  { translateY: u * 1.4 },
                  { rotate: '45deg' },
                ],
              }}
            />
            <View
              style={{
                width: u * 10,
                height: u * 2.6,
                backgroundColor: cutout,
                borderRadius: u,
                position: 'absolute',
                transform: [{ translateX: u * 0.8 }, { rotate: '-45deg' }],
              }}
            />
          </View>
        </View>
      );
  }
}
