import React, { useState } from "react";
import { Pressable, Text, View, StyleSheet } from "react-native";

import { BOARD_COLORS } from "@/lib/checkers";
import type { CheckersBoard as Board, CheckersPiece } from "@/lib/checkers";

const FRAME_PAD = 6;

interface PieceViewProps {
  piece: CheckersPiece;
  size: number;
}

function PieceView({ piece, size }: PieceViewProps) {
  const palette = piece.owner === 0 ? BOARD_COLORS.darkPiece : BOARD_COLORS.lightPiece;
  return (
    <View
      style={styledPiece.outer(size, palette.rim)}
    >
      <View
        style={styledPiece.inner(size, palette.base, palette.innerBorder)}
      >
        {piece.king ? (
          <Text
            style={{
              fontSize: size * 0.48,
              lineHeight: size * 0.58,
              color: palette.crown,
              fontWeight: "700",
            }}
          >
            ♛
          </Text>
        ) : (
          <View
            style={{
              width: size * 0.22,
              height: size * 0.22,
              borderRadius: size * 0.11,
              backgroundColor: palette.rim,
              opacity: 0.85,
            }}
          />
        )}
      </View>
    </View>
  );
}

const styledPiece = {
  outer: (size: number, rim: string) => ({
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: rim,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: Math.max(1, size * 0.08) },
    shadowOpacity: 0.35,
    shadowRadius: size * 0.09,
    elevation: 4,
  }),
  inner: (size: number, base: string, innerBorder: string) => ({
    width: size * 0.78,
    height: size * 0.78,
    borderRadius: size * 0.39,
    backgroundColor: base,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderWidth: Math.max(1, size * 0.045),
    borderColor: innerBorder,
  }),
};

export interface CheckersBoardProps {
  board: Board;
  onSquarePress: (index: number) => void;
  sources?: number[];
  selected?: number | null;
  destinations?: number[];
  captureDestinations?: number[];
  lastMovePath?: number[] | null;
  disabled?: boolean;
}

export function CheckersBoard({
  board,
  onSquarePress,
  sources = [],
  selected = null,
  destinations = [],
  captureDestinations = [],
  lastMovePath = null,
  disabled = false,
}: CheckersBoardProps) {
  const [size, setSize] = useState(0);
  const gridSize = Math.max(0, size - FRAME_PAD * 2);
  const cellSize = gridSize / 8;
  const pieceSize = cellSize * 0.68;
  const markerSize = cellSize * 0.34;
  const captureMarkerSize = pieceSize * 0.78;

  const destSet = new Set(destinations);
  const captureSet = new Set(captureDestinations);
  const sourceSet = new Set(sources);
  const lastSet = new Set(lastMovePath ?? []);

  return (
    <View
      style={styles.frame}
      onLayout={(event) => setSize(event.nativeEvent.layout.width)}
    >
      <View
        style={[
          styles.grid,
          {
            width: gridSize,
            height: gridSize,
          },
        ]}
      >
        {Array.from({ length: 64 }, (_, index) => {
          const isDark = (Math.floor(index / 8) + (index % 8)) % 2 === 1;
          const piece = board[index];
          const isSource = sourceSet.has(index);
          const isSelected = selected === index;
          const isDest = destSet.has(index);
          const isCaptureDest = captureSet.has(index);
          const isLast = lastSet.has(index);
          return (
            <Pressable
              key={index}
              disabled={disabled}
              onPress={() => onSquarePress(index)}
              style={[
                styles.cell,
                {
                  backgroundColor: isDark ? BOARD_COLORS.dark : BOARD_COLORS.light,
                },
              ]}
            >
              <View style={styles.centerWrap} pointerEvents="none">
                {isLast && (
                  <View
                    style={[
                      StyleSheet.absoluteFill,
                      { backgroundColor: BOARD_COLORS.accent, opacity: 0.22 },
                    ]}
                  />
                )}
                {isDest && (
                  isCaptureDest ? (
                    <View
                      style={{
                        width: captureMarkerSize,
                        height: captureMarkerSize,
                        borderRadius: captureMarkerSize / 2,
                        borderWidth: Math.max(2, pieceSize * 0.08),
                        borderColor: BOARD_COLORS.accent,
                      }}
                    />
                  ) : (
                    <View
                      style={{
                        width: markerSize,
                        height: markerSize,
                        borderRadius: markerSize / 2,
                        backgroundColor: BOARD_COLORS.accent + "99",
                      }}
                    />
                  )
                )}
                {piece && (
                  <View style={styles.pieceWrap}>
                    {isSelected && (
                      <View
                        style={[
                          styles.selectionRing,
                          {
                            width: pieceSize * 0.92,
                            height: pieceSize * 0.92,
                            borderRadius: (pieceSize * 0.92) / 2,
                          },
                        ]}
                      />
                    )}
                    {isSource && !isSelected && (
                      <View
                        style={[
                          styles.sourceRing,
                          {
                            width: pieceSize * 0.92,
                            height: pieceSize * 0.92,
                            borderRadius: (pieceSize * 0.92) / 2,
                          },
                        ]}
                      />
                    )}
                    <PieceView piece={piece} size={pieceSize * 0.92} />
                  </View>
                )}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: "100%",
    backgroundColor: BOARD_COLORS.frame,
    borderWidth: 3,
    borderColor: BOARD_COLORS.frameShadow,
    borderRadius: 14,
    padding: FRAME_PAD,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderRadius: 8,
    overflow: "hidden",
  },
  cell: {
    width: "12.5%",
    height: "12.5%",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  centerWrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  pieceWrap: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: "100%",
  },
  selectionRing: {
    position: "absolute",
    borderWidth: 3,
    borderColor: BOARD_COLORS.accent,
    opacity: 0.95,
  },
  sourceRing: {
    position: "absolute",
    borderWidth: 2,
    borderColor: BOARD_COLORS.accent,
    opacity: 0.6,
  },
});