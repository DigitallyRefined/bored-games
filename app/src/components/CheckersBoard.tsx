import React, { useEffect, useState } from "react";
import {
  Animated,
  Easing,
  Pressable,
  Text,
  View,
  StyleSheet,
} from "react-native";

import { BOARD_COLORS, colOf, rowOf } from "@/lib/checkers";
import type { CheckersBoard as Board, CheckersPiece } from "@/lib/checkers";

const FRAME_PAD = 6;
const HOP_ANIM_DURATION = 260;
// Fraction of the total animation spent travelling the path; the remaining
// fraction is a brief cross-fade between the sliding ghost and the settled
// destination checker. Keeps exactly one piece visible at all times.
const SLIDE_FADE_START = 0.78;

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

// A checker that slides along a move path (a plain step or a whole capture
// chain). Rendering is purely local: the sliding ghost and a settled copy at
// the last square cross-fade as the ghost lands, so exactly one piece is
// visible. The board hides the destination square for as long as the move is
// "recent".
function AnimatedCheckersPiece({
  piece,
  path,
  cellSize,
  pieceDim,
}: {
  piece: CheckersPiece;
  path: number[];
  cellSize: number;
  pieceDim: number;
}) {
  const [progress] = useState(() => new Animated.Value(0));
  const steps = path.length - 1;
  const slideEnd = steps * SLIDE_FADE_START;

  const centers = path.map((index) => ({
    x: colOf(index) * cellSize + (cellSize - pieceDim) / 2,
    y: rowOf(index) * cellSize + (cellSize - pieceDim) / 2,
  }));
  const start = centers[0];
  const end = centers[centers.length - 1];
  const inputRange = path.map((_, i) => i);
  const translateX = progress.interpolate({
    inputRange,
    outputRange: centers.map((c) => c.x - start.x),
  });
  const translateY = progress.interpolate({
    inputRange,
    outputRange: centers.map((c) => c.y - start.y),
  });
  const ghostOpacity = progress.interpolate({
    inputRange: [0, slideEnd, steps],
    outputRange: [1, 1, 0],
    extrapolate: "clamp",
  });
  const restOpacity = progress.interpolate({
    inputRange: [0, slideEnd, steps],
    outputRange: [0, 0, 1],
    extrapolate: "clamp",
  });

  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: steps,
      duration: (steps * HOP_ANIM_DURATION) / SLIDE_FADE_START,
      easing: Easing.linear,
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [progress, steps]);

  return (
    <>
      <Animated.View
        style={[
          styles.animPiece,
          {
            width: pieceDim,
            height: pieceDim,
            left: end.x,
            top: end.y,
            opacity: restOpacity,
          },
        ]}
      >
        <PieceView piece={piece} size={pieceDim} />
      </Animated.View>
      <Animated.View
        style={[
          styles.animPiece,
          {
            width: pieceDim,
            height: pieceDim,
            left: start.x,
            top: start.y,
            opacity: ghostOpacity,
            transform: [{ translateX }, { translateY }],
          },
        ]}
      >
        <PieceView piece={piece} size={pieceDim} />
      </Animated.View>
    </>
  );
}

// Rendered whenever a fresh move path lands (keyed by that path), so the board
// animates the checker travelling along the whole path — including the capture
// chains of multi-jump moves.
function CheckersMoveLayer({
  board,
  path,
  cellSize,
  pieceDim,
}: {
  board: Board;
  path: number[];
  cellSize: number;
  pieceDim: number;
}) {
  const moving = board[path[path.length - 1]];
  if (!moving) return null;

  return (
    <View style={styles.animOverlay} pointerEvents="none">
      <AnimatedCheckersPiece
        piece={moving}
        path={path}
        cellSize={cellSize}
        pieceDim={pieceDim}
      />
    </View>
  );
}

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
  const ringSize = pieceSize * 1.14;

  const destSet = new Set(destinations);
  const captureSet = new Set(captureDestinations);
  const sourceSet = new Set(sources);
  const lastSet = new Set(lastMovePath ?? []);
  const animHiddenSquare = lastMovePath ? lastMovePath[lastMovePath.length - 1] : null;
  const isAnimDestination = animHiddenSquare !== null && board[animHiddenSquare] !== null;

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
                {piece && gridSize > 0 && !(isAnimDestination && index === animHiddenSquare) && (
                  <View style={styles.pieceWrap}>
                    {isSelected && (
                      <View
                        style={[
                          styles.selectionRing,
                          {
                            width: ringSize,
                            height: ringSize,
                            borderRadius: ringSize / 2,
                          },
                        ]}
                      />
                    )}
                    {isSource && !isSelected && (
                      <View
                        style={[
                          styles.sourceRing,
                          {
                            width: ringSize,
                            height: ringSize,
                            borderRadius: ringSize / 2,
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
        {lastMovePath && lastMovePath.length > 1 && cellSize > 0 && (
          <CheckersMoveLayer
            key={lastMovePath.join("-")}
            board={board}
            path={lastMovePath}
            cellSize={cellSize}
            pieceDim={pieceSize * 0.92}
          />
        )}
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
    position: "relative",
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
  animOverlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 20,
    elevation: 20,
  },
  animPiece: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
});