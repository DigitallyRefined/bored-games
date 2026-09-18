import { useTheme } from '@/hooks/useTheme';
import { StyleSheet, Text, View } from 'react-native';

export function TicTacToePreview() {
  const theme = useTheme();
  const stroke = theme.border;

  return (
    <View style={styles.container}>
      <View style={[styles.cell, { borderColor: stroke }]}>
        <Text style={[styles.x, { color: theme.accent }]}>X</Text>
      </View>
      <View style={[styles.cell, { borderColor: stroke }]} />
      <View style={[styles.cell, { borderColor: stroke }]}>
        <Text style={[styles.o, { color: theme.danger }]}>O</Text>
      </View>
      <View style={[styles.cell, { borderColor: stroke }]} />
      <View style={[styles.cell, { borderColor: stroke }]}>
        <Text style={[styles.x, { color: theme.accent }]}>X</Text>
      </View>
      <View style={[styles.cell, { borderColor: stroke }]} />
      <View style={[styles.cell, { borderColor: stroke }]} />
      <View style={[styles.cell, { borderColor: stroke }]} />
      <View style={[styles.cell, { borderColor: stroke }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 64,
    height: 64,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: '33.33%',
    height: '33.33%',
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    boxSizing: 'border-box',
  },
  x: {
    fontFamily: 'Caveat_400Regular',
    fontSize: 20,
    lineHeight: 20,
  },
  o: {
    fontFamily: 'Caveat_400Regular',
    fontSize: 18,
    lineHeight: 18,
  },
});
