import React from 'react';
import { GameCard, type GameInfo } from '@/components/GameCard';
import { TicTacToePreview } from '@/components/TicTacToePreview';
import { CheckersPreview } from '@/components/CheckersPreview';
import { BattleshipPreview } from '@/components/BattleshipPreview';
import { Fonts, FontSize, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { StatusBar } from 'expo-status-bar';
import {
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

const games: GameInfo[] = [
  {
    slug: 'tic-tac-toe',
    name: 'Tic-Tac-Toe',
    description: 'The classic 3-in-a-row battle on paper',
    href: '/games/tic-tac-toe',
    preview: <TicTacToePreview />,
  },
  {
    slug: 'checkers',
    name: 'Checkers',
    description: 'Capture every piece on the wooden board',
    href: '/games/checkers',
    preview: <CheckersPreview />,
  },
  {
    slug: 'battleships',
    name: 'Battleships',
    description: 'Hunt down the enemy fleet on the high seas',
    href: '/games/battleships',
    preview: <BattleshipPreview />,
  },
];

function DoodleUnderline({ color }: { color: string }) {
  return (
    <Svg width={170} height={14} viewBox="0 0 170 14" style={styles.underline}>
      <Path
        d="M3,8 C25,3 45,10 68,7 C92,4 115,11 138,6 C152,4 162,7 167,5"
        stroke={color}
        strokeWidth="2.4"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M72,10 C95,6 120,12 142,8"
        stroke={color}
        strokeWidth="1"
        fill="none"
        strokeLinecap="round"
      />
    </Svg>
  );
}

export default function Home() {
  const theme = useTheme();
  const scheme = useColorScheme();


  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.background }]}
      edges={['top', 'bottom']}
    >
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text }]}>
              Bored <Text style={{ color: theme.accent }}>Games</Text>
            </Text>
            <DoodleUnderline color={theme.accent} />
          </View>

          <View style={styles.grid}>
            {games.map((game) => (
              <View key={game.slug} style={styles.cardWrapper}>
                <GameCard game={game} />
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: Spacing.six,
  },
  content: {
    maxWidth: 820,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: Spacing.five,
  },
  header: {
    marginBottom: Spacing.six,
  },
  title: {
    fontFamily: Fonts.title,
    fontSize: FontSize.hero,
    lineHeight: FontSize.hero * 1.05,
    letterSpacing: -0.5,
  },
  underline: {
    marginTop: Spacing.one,
    marginBottom: Spacing.two,
  },
  subtitle: {
    fontFamily: Fonts.hand,
    fontSize: FontSize.lg,
    lineHeight: FontSize.lg * 1.4,
    marginTop: Spacing.one,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.four,
  },
  cardWrapper: {
    flex: 1,
    paddingHorizontal: Spacing.half,
  },
});
