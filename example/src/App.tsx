import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
  type TextStyle,
} from 'react-native';
import {
  addControlEventListener,
  configure,
  getControlState,
  getInitialControlEvent,
  isSupported,
  reloadControls,
  setControlState,
  type ControlEvent,
  type ControlState,
} from 'react-native-ios-controls';
import { GLYPHS, Glyph, type GlyphName } from './Glyph';
import { TINTS, palettes, radius, space, type, type Palette } from './theme';

const APP_GROUP = 'group.ioscontrols.example';

type ControlDef = {
  kind: string;
  name: string;
  role: 'toggle' | 'button';
  blurb: string;
  fallback: Required<Pick<ControlState, 'title' | 'sfSymbol' | 'tint'>>;
};

const CONTROLS: ControlDef[] = [
  {
    kind: 'focus',
    name: 'Focus',
    role: 'toggle',
    blurb: 'A toggle. Flipping it in Control Center runs a SetValueIntent.',
    fallback: { title: 'Focus', sfSymbol: 'moon.fill', tint: '#7C5CFF' },
  },
  {
    kind: 'quickCapture',
    name: 'Quick Capture',
    role: 'button',
    blurb: 'A button. Pressing it opens this app and reports the press.',
    fallback: { title: 'Capture', sfSymbol: 'bolt.fill', tint: '#22D3A7' },
  },
];

export default function App() {
  const scheme = useColorScheme();
  const c = scheme === 'light' ? palettes.light : palettes.dark;
  const s = useMemo(() => makeStyles(c), [c]);

  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [states, setStates] = useState<Record<string, ControlState>>({});
  const [events, setEvents] = useState<ControlEvent[]>([]);
  const [busy, setBusy] = useState(false);

  const readAll = useCallback(async () => {
    const next: Record<string, ControlState> = {};
    for (const control of CONTROLS) {
      next[control.kind] = (await getControlState(control.kind)) ?? {};
    }
    setStates(next);
  }, []);

  useEffect(() => {
    let alive = true;

    const subscription = addControlEventListener((event) => {
      if (!alive) return;
      setEvents((prev) =>
        prev.some((seen) => seen.id === event.id)
          ? prev
          : [event, ...prev].slice(0, 40)
      );
      readAll();
    });

    (async () => {
      try {
        await configure({ appGroup: APP_GROUP });
        // Seed each control so the gallery has something to show before the
        // user has ever touched the editor.
        for (const control of CONTROLS) {
          const existing = await getControlState(control.kind);
          if (existing == null || existing.title == null) {
            await setControlState(control.kind, control.fallback);
          }
        }
        await reloadControls();
        await readAll();
        // A press that launches the app is reported twice on purpose: once
        // here, and once through the listener when the queue drains. They
        // carry the same id, so keep whichever arrived first.
        const launch = await getInitialControlEvent();
        if (launch && alive) {
          setEvents((prev) =>
            prev.some((event) => event.id === launch.id)
              ? prev
              : [launch, ...prev]
          );
        }
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (alive) setReady(true);
      }
    })();

    return () => {
      alive = false;
      subscription.remove();
    };
  }, [readAll]);

  const patch = useCallback(async (kind: string, next: ControlState) => {
    setStates((prev) => ({ ...prev, [kind]: { ...prev[kind], ...next } }));
    await setControlState(kind, next);
    await reloadControls(kind);
  }, []);

  const reloadEverything = useCallback(async () => {
    setBusy(true);
    try {
      await reloadControls();
      await readAll();
    } finally {
      setBusy(false);
    }
  }, [readAll]);

  return (
    <View style={s.root}>
      <StatusBar
        barStyle={scheme === 'light' ? 'dark-content' : 'light-content'}
        backgroundColor="transparent"
        translucent
      />
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.header}>
          <View style={s.eyebrowRow}>
            <View style={s.dot} />
            <Text style={s.eyebrow}>react-native-ios-controls</Text>
          </View>
          <Text style={s.display}>Controls, from JavaScript</Text>
          <Text style={s.lede}>
            Drive iOS 18 Control Center, Lock Screen and Action Button controls
            without leaving your React Native app.
          </Text>
        </View>

        {!isSupported && (
          <Notice
            palette={c}
            tone="warn"
            title="Controls are unavailable here"
            body={
              Platform.OS === 'ios'
                ? 'Controls need iOS 18 or newer. Every call below resolves as a no-op.'
                : 'This is an iOS-only feature. Every call below resolves as a no-op on Android.'
            }
          />
        )}

        {error != null && (
          <Notice palette={c} tone="error" title="Setup failed" body={error} />
        )}

        {!ready ? (
          <View style={s.loading}>
            <ActivityIndicator color={c.accent} />
          </View>
        ) : (
          <>
            <Section title="Your controls" palette={c}>
              {CONTROLS.map((control) => (
                <ControlCard
                  key={control.kind}
                  palette={c}
                  def={control}
                  state={states[control.kind] ?? {}}
                  onPatch={(next) => patch(control.kind, next)}
                />
              ))}

              <Pressable
                accessibilityRole="button"
                testID="reload-all"
                onPress={reloadEverything}
                style={({ pressed }) => [
                  s.primary,
                  pressed && s.primaryPressed,
                ]}
              >
                {busy ? (
                  <ActivityIndicator color={c.onAccent} />
                ) : (
                  <Text style={s.primaryLabel}>Reload controls</Text>
                )}
              </Pressable>
              <Text style={s.footnote}>
                Writes state to the App Group, then asks WidgetKit to re-render.
              </Text>
            </Section>

            <Section title="Event stream" palette={c}>
              <EventStream palette={c} events={events} />
            </Section>

            <Section title="Add it to Control Center" palette={c}>
              <Guide palette={c} />
            </Section>

            <Text style={s.colophon}>
              App Group{'  '}
              <Text style={s.mono}>{APP_GROUP}</Text>
            </Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}

/* ------------------------------------------------------------------ pieces */

function Section({
  title,
  palette,
  children,
}: {
  title: string;
  palette: Palette;
  children: React.ReactNode;
}) {
  const s = makeStyles(palette);
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Notice({
  palette,
  tone,
  title,
  body,
}: {
  palette: Palette;
  tone: 'warn' | 'error';
  title: string;
  body: string;
}) {
  const s = makeStyles(palette);
  const accent = tone === 'error' ? '#FF5C8A' : '#F5A524';
  return (
    <View style={[s.notice, { borderColor: accent }]}>
      <View style={[s.noticeBar, { backgroundColor: accent }]} />
      <View style={s.noticeBody}>
        <Text style={s.noticeTitle}>{title}</Text>
        <Text style={s.noticeText}>{body}</Text>
      </View>
    </View>
  );
}

function ControlCard({
  palette,
  def,
  state,
  onPatch,
}: {
  palette: Palette;
  def: ControlDef;
  state: ControlState;
  onPatch: (next: ControlState) => void;
}) {
  const s = makeStyles(palette);
  const title = state.title ?? def.fallback.title;
  const symbol = (state.sfSymbol ?? def.fallback.sfSymbol) as GlyphName;
  const tint = state.tint ?? def.fallback.tint;
  const on = state.value === true;

  const [draft, setDraft] = useState(title);
  const lastTitle = useRef(title);
  useEffect(() => {
    if (lastTitle.current !== title) {
      lastTitle.current = title;
      setDraft(title);
    }
  }, [title]);

  const plateOn = def.role === 'toggle' && on;

  return (
    <View style={s.card}>
      <View style={s.cardHead}>
        <View
          style={[
            s.plate,
            {
              backgroundColor: plateOn
                ? palette.glyphPlateOn
                : palette.glyphPlate,
            },
          ]}
        >
          <Glyph
            name={symbol}
            color={plateOn ? tint : palette.text}
            cutout={plateOn ? palette.glyphPlateOn : palette.glyphPlate}
          />
        </View>

        <View style={s.cardHeadText}>
          <Text style={s.cardTitle}>{def.name}</Text>
          <Text style={s.cardKind}>
            <Text style={s.mono}>{def.kind}</Text>
            {'  ·  '}
            {def.role}
          </Text>
        </View>

        {def.role === 'toggle' && (
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: on }}
            testID={`toggle-${def.kind}`}
            onPress={() => onPatch({ value: !on })}
            style={[
              s.switchTrack,
              { backgroundColor: on ? tint : palette.hairline },
            ]}
          >
            <View style={[s.switchThumb, on && s.switchThumbOn]} />
          </Pressable>
        )}
      </View>

      <Text style={s.cardBlurb}>{def.blurb}</Text>

      <View style={s.divider} />

      <Field label="Title" palette={palette}>
        <TextInput
          testID={`title-${def.kind}`}
          value={draft}
          onChangeText={setDraft}
          onEndEditing={() =>
            onPatch({ title: draft.trim() || def.fallback.title })
          }
          onSubmitEditing={() =>
            onPatch({ title: draft.trim() || def.fallback.title })
          }
          returnKeyType="done"
          placeholder={def.fallback.title}
          placeholderTextColor={palette.textTertiary}
          style={s.input}
        />
      </Field>

      <Field label="SF Symbol" palette={palette}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.chipRow}
        >
          {GLYPHS.map((name) => {
            const active = name === symbol;
            return (
              <Pressable
                key={name}
                testID={`symbol-${def.kind}-${name}`}
                onPress={() => onPatch({ sfSymbol: name })}
                style={[
                  s.symbolChip,
                  active && {
                    borderColor: tint,
                    // Must stay opaque: the glyphs carve shapes out with a
                    // solid fill, and a translucent plate shows through them.
                    backgroundColor: palette.surfaceRaised,
                  },
                ]}
              >
                <Glyph
                  name={name}
                  size={18}
                  color={active ? tint : palette.textSecondary}
                  cutout={palette.surfaceRaised}
                />
                <Text
                  style={[s.symbolChipLabel, active && { color: palette.text }]}
                >
                  {name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </Field>

      <Field label="Tint" palette={palette}>
        <View style={s.chipRow}>
          {TINTS.map((swatch) => {
            const active = swatch.value.toLowerCase() === tint.toLowerCase();
            return (
              <Pressable
                key={swatch.value}
                testID={`tint-${def.kind}-${swatch.name}`}
                accessibilityLabel={swatch.name}
                onPress={() => onPatch({ tint: swatch.value })}
                style={[s.swatch, active && { borderColor: palette.text }]}
              >
                <View
                  style={[s.swatchFill, { backgroundColor: swatch.value }]}
                />
              </Pressable>
            );
          })}
        </View>
      </Field>
    </View>
  );
}

function Field({
  label,
  palette,
  children,
}: {
  label: string;
  palette: Palette;
  children: React.ReactNode;
}) {
  const s = makeStyles(palette);
  return (
    <View style={s.field}>
      <Text style={s.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function EventStream({
  palette,
  events,
}: {
  palette: Palette;
  events: ControlEvent[];
}) {
  const s = makeStyles(palette);

  if (events.length === 0) {
    return (
      <View style={[s.card, s.empty]}>
        <View style={s.emptyPulse} />
        <Text style={s.emptyTitle}>Waiting for a press</Text>
        <Text style={s.emptyBody}>
          Open Control Center and tap one of your controls. Events queue in the
          App Group and arrive the moment this app is active again.
        </Text>
      </View>
    );
  }

  return (
    <View style={s.card}>
      {events.map((event, index) => (
        <View
          key={event.id}
          style={[s.eventRow, index > 0 && s.eventRowDivided]}
        >
          <View
            style={[
              s.eventBadge,
              {
                backgroundColor:
                  event.action === 'toggle'
                    ? palette.accentSoft
                    : 'rgba(34, 211, 167, 0.16)',
              },
            ]}
          >
            <Text
              style={[
                s.eventBadgeText,
                {
                  color:
                    event.action === 'toggle'
                      ? palette.accent
                      : palette.positive,
                },
              ]}
            >
              {event.action}
            </Text>
          </View>
          <View style={s.eventBody}>
            <Text style={s.eventKind}>{event.kind}</Text>
            <Text style={s.eventMeta}>
              {event.value === undefined
                ? 'no value'
                : event.value
                  ? 'value: on'
                  : 'value: off'}
              {'  ·  '}
              {new Date(event.timestamp).toLocaleTimeString()}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function Guide({ palette }: { palette: Palette }) {
  const s = makeStyles(palette);
  const steps = [
    'Swipe down from the top-right corner to open Control Center.',
    'Press and hold anywhere, then tap “Add a Control”.',
    'Search for Focus or Capture and tap it to place it.',
    'Tap outside the grid, then press your new control.',
  ];
  return (
    <View style={s.card}>
      {steps.map((step, index) => (
        <View key={step} style={[s.step, index > 0 && s.stepDivided]}>
          <View style={s.stepNumber}>
            <Text style={s.stepNumberText}>{index + 1}</Text>
          </View>
          <Text style={s.stepText}>{step}</Text>
        </View>
      ))}
    </View>
  );
}

/* ------------------------------------------------------------------ styles */

function makeStyles(c: Palette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.canvas },
    scroll: {
      paddingTop:
        Platform.OS === 'ios' ? 72 : (StatusBar.currentHeight ?? 24) + 24,
      paddingBottom: space.xxxl,
      paddingHorizontal: space.lg,
    },

    header: { marginBottom: space.xl },
    eyebrowRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.sm,
      marginBottom: space.md,
    },
    dot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: c.accent,
    },
    eyebrow: {
      ...(type.caption as TextStyle),
      color: c.textTertiary,
      letterSpacing: 0.4,
    },
    display: {
      ...(type.display as TextStyle),
      color: c.text,
      letterSpacing: -0.6,
      marginBottom: space.sm,
    },
    lede: {
      ...(type.body as TextStyle),
      color: c.textSecondary,
      maxWidth: 340,
    },

    section: { marginBottom: space.xl },
    sectionTitle: {
      ...(type.label as TextStyle),
      color: c.textTertiary,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginBottom: space.md,
      marginLeft: space.xs,
    },

    card: {
      backgroundColor: c.surface,
      borderRadius: radius.xl,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.hairline,
      padding: space.lg,
      marginBottom: space.md,
    },
    cardHead: { flexDirection: 'row', alignItems: 'center', gap: space.md },
    plate: {
      width: 52,
      height: 52,
      borderRadius: 26,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardHeadText: { flex: 1 },
    cardTitle: { ...(type.title as TextStyle), color: c.text },
    cardKind: {
      ...(type.caption as TextStyle),
      color: c.textTertiary,
      marginTop: 2,
    },
    cardBlurb: {
      ...(type.body as TextStyle),
      color: c.textSecondary,
      marginTop: space.md,
    },

    switchTrack: {
      width: 50,
      height: 30,
      borderRadius: radius.pill,
      padding: 3,
      justifyContent: 'center',
    },
    switchThumb: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: '#FFFFFF',
    },
    switchThumbOn: { transform: [{ translateX: 20 }] },

    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: c.hairline,
      marginVertical: space.lg,
    },

    field: { marginBottom: space.lg },
    fieldLabel: {
      ...(type.caption as TextStyle),
      color: c.textTertiary,
      marginBottom: space.sm,
    },
    input: {
      ...(type.body as TextStyle),
      color: c.text,
      backgroundColor: c.surfaceRaised,
      borderRadius: radius.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      paddingHorizontal: space.md,
      paddingVertical: space.md,
    },

    chipRow: { flexDirection: 'row', gap: space.sm, alignItems: 'center' },
    symbolChip: {
      backgroundColor: c.surfaceRaised,
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.sm,
      paddingVertical: space.sm,
      paddingHorizontal: space.md,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: c.border,
    },
    symbolChipLabel: { ...(type.caption as TextStyle), color: c.textSecondary },

    swatch: {
      width: 36,
      height: 36,
      borderRadius: 18,
      borderWidth: 2,
      borderColor: 'transparent',
      alignItems: 'center',
      justifyContent: 'center',
    },
    swatchFill: { width: 26, height: 26, borderRadius: 13 },

    primary: {
      backgroundColor: c.accent,
      borderRadius: radius.lg,
      paddingVertical: space.lg,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 54,
    },
    primaryPressed: { opacity: 0.82 },
    primaryLabel: { ...(type.heading as TextStyle), color: c.onAccent },
    footnote: {
      ...(type.caption as TextStyle),
      color: c.textTertiary,
      textAlign: 'center',
      marginTop: space.md,
    },

    empty: { alignItems: 'center', paddingVertical: space.xl },
    emptyPulse: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: c.accent,
      marginBottom: space.md,
    },
    emptyTitle: {
      ...(type.heading as TextStyle),
      color: c.text,
      marginBottom: space.xs,
    },
    emptyBody: {
      ...(type.body as TextStyle),
      color: c.textSecondary,
      textAlign: 'center',
      maxWidth: 280,
    },

    eventRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.md,
      paddingVertical: space.md,
    },
    eventRowDivided: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.hairline,
    },
    eventBadge: {
      paddingHorizontal: space.md,
      paddingVertical: space.xs + 2,
      borderRadius: radius.sm,
      minWidth: 62,
      alignItems: 'center',
    },
    eventBadgeText: { ...(type.caption as TextStyle) },
    eventBody: { flex: 1 },
    eventKind: { ...(type.heading as TextStyle), color: c.text },
    eventMeta: {
      ...(type.caption as TextStyle),
      color: c.textTertiary,
      marginTop: 2,
    },

    step: { flexDirection: 'row', gap: space.md, paddingVertical: space.md },
    stepDivided: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.hairline,
    },
    stepNumber: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: c.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepNumberText: { ...(type.caption as TextStyle), color: c.accent },
    stepText: { ...(type.body as TextStyle), color: c.textSecondary, flex: 1 },

    notice: {
      flexDirection: 'row',
      borderRadius: radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      backgroundColor: c.surface,
      overflow: 'hidden',
      marginBottom: space.lg,
    },
    noticeBar: { width: 3 },
    noticeBody: { flex: 1, padding: space.lg },
    noticeTitle: {
      ...(type.heading as TextStyle),
      color: c.text,
      marginBottom: space.xs,
    },
    noticeText: { ...(type.body as TextStyle), color: c.textSecondary },

    loading: { paddingVertical: space.xxxl, alignItems: 'center' },

    mono: { ...(type.mono as TextStyle), color: c.textSecondary },
    colophon: {
      ...(type.caption as TextStyle),
      color: c.textTertiary,
      textAlign: 'center',
      marginTop: space.sm,
    },
  });
}
