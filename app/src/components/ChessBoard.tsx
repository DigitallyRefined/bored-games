import React, { useState } from "react";
import { Pressable, Text, View, StyleSheet } from "react-native";

import { Fonts } from "@/constants/theme";
import {
  BOARD_COLORS,
  PIECE_GLYPHS,
} from "@/lib/chess";
import type {
  ChessBoard as Board,
  ChessOwner,
  ChessPiece,
  ChessPieceType,
} from "@/lib/chess";

const FRAME_PAD = 6;

function paletteFor(owner: ChessOwner) {
  return owner === 0 ? BOARD_COLORS.darkPiece : BOARD_COLORS.lightPiece;
}

interface PieceViewProps {
  piece: ChessPiece;
  size: number;
}

function PieceView({ piece, size }: PieceViewProps) {
  const palette = paletteFor(piece.owner);
  return (
    <Text
      style={{
        fontSize: size * 0.76,
        lineHeight: size * 0.9,
        textAlign: "center",
        color: palette.base,
        fontWeight: "600",
        textShadowColor: palette.outline,
        textShadowOffset: { width: Math.max(1, size * 0.02), height: Math.max(1, size * 0.045) },
        textShadowRadius: Math.max(1, size * 0.03),
      }}
    >
      {PIECE_GLYPHS[piece.type]}
    </Text>
  );
}

export interface ChessBoardProps {
  board: Board;
  onSquarePress: (index: number) => void;
  sources?: number[];
  selected?: number | null;
  destinations?: number[];
  lastMove?: { from: number; to: number } | null;
  checkSquare?: number | null;
  disabled?: boolean;
  flipped?: boolean;
  promoting?: boolean;
  promotingOwner?: ChessOwner | null;
  onPromotionPick?: (type: ChessPieceType) => void;
}

export function ChessBoard({
  board,
  onSquarePress,
  sources = [],
  selected = null,
  destinations = [],
  lastMove = null,
  checkSquare = null,
  disabled = false,
  flipped = false,
  promoting = false,
  promotingOwner = null,
  onPromotionPick,
}: ChessBoardProps) {
  const [size, setSize] = useState(0);
  const gridSize = Math.max(0, size - FRAME_PAD * 2);
  const cellSize = gridSize / 8;
  const markerSize = cellSize * 0.3;
  const captureMarkerSize = cellSize * 0.4;
  const coordSize = cellSize * 0.22;

  const sourceSet = new Set(sources);
  const destSet = new Set(destinations);

  const fileLabel = (col: number) =>
    String.fromCharCode((flipped ? "h" : "a").charCodeAt(0) + (flipped ? -col : col));
  const rankLabel = (row: number) => (flipped ? 8 - row : row + 1);

  const promotionPalette = promotingOwner === null ? paletteFor(0) : paletteFor(promotingOwner);

  return (
    <View
      style={styles.frame}
      onLayout={(event) => setSize(event.nativeEvent.layout.width)}
    >
      <View style={[styles.grid, { width: gridSize, height: gridSize }]}>
        {Array.from({ length: 64 }, (_, index) => {
          const row = Math.floor(index / 8);
          const col = index % 8;
          const isDark = (row + col) % 2 === 1;
          const piece = board[index];
          const isSource = sourceSet.has(index);
          const isSelected = selected === index;
          const isDest = destSet.has(index);
          const isCaptureDest = isDest && piece !== null;
          const showCoord = row === 7 || col === 0;
          const coordColor = isDark
            ? BOARD_COLORS.coordinateDark
            : BOARD_COLORS.coordinate;

          const isLast =
            lastMove !== null && (lastMove.from === index || lastMove.to === index);
          const isCheck = checkSquare === index;

          return (
            <Pressable
              key={index}
              disabled={disabled}
              onPress={() => onSquarePress(index)}
              style={[
                styles.cell,
                { backgroundColor: isDark ? BOARD_COLORS.dark : BOARD_COLORS.light },
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
                {isCheck && (
                  <View
                    style={[
                      StyleSheet.absoluteFill,
                      { backgroundColor: "#E5533D", opacity: 0.35 },
                    ]}
                  />
                )}
                {showCoord && (
                  <Text
                    style={[
                      styles.coord,
                      {
                        color: coordColor,
                        fontSize: coordSize,
                        top: row === 7 ? undefined : 1,
                        bottom: row === 7 ? 1 : undefined,
                        left: col === 0 ? 1 : undefined,
                        right: col === 0 ? undefined : 1,
                        textAlign: row === 7 ? "right" : "left",
                      },
                    ]}
                  >
                    {row === 7 ? fileLabel(col) : rankLabel(row)}
                  </Text>
                )}
                {piece && (
                  <View style={styles.pieceWrap}>
                    {isSelected && (
                      <View
                        style={[
                          styles.selectionRing,
                          {
                            width: cellSize * 0.88,
                            height: cellSize * 0.88,
                            borderRadius: (cellSize * 0.88) / 2,
                          },
                        ]}
                      />
                    )}
                    {isSource && !isSelected && (
                      <View
                        style={[
                          styles.sourceRing,
                          {
                            width: cellSize * 0.88,
                            height: cellSize * 0.88,
                            borderRadius: (cellSize * 0.88) / 2,
                          },
                        ]}
                      />
                    )}
                    <PieceView piece={piece} size={cellSize * 0.92} />
                  </View>
                )}
                {isDest && (
                  <View style={styles.destMarker} pointerEvents="none">
                    {isCaptureDest ? (
                      <View
                        style={{
                          width: captureMarkerSize,
                          height: captureMarkerSize,
                          borderRadius: captureMarkerSize / 2,
                          borderWidth: Math.max(2, pieceSize(cellSize) * 0.1),
                          borderColor: BOARD_COLORS.accent,
                          backgroundColor: BOARD_COLORS.accent + "33",
                          opacity: 0.85,
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
                    )}
                  </View>
                )}
              </View>
            </Pressable>
          );
        })}
        {promoting && (
          <View style={styles.promotionOverlay}>
            <View style={styles.promotionCard}>
              {([0, 2, 3, 1] as const).map((typeIndex) => {
                const type = (["queen", "rook", "bishop", "knight"] as const)[
                  typeIndex
                ];
                return (
                  <Pressable
                    key={type}
                    onPress={() => onPromotionPick?.(type)}
                    style={({ pressed }) => [
                      styles.promotionCell,
                      {
                        backgroundColor: BOARD_COLORS.light,
                        width: cellSize * 0.58,
                        height: cellSize * 0.58,
                      },
                      pressed && styles.promotionCellPressed,
                    ]}
                  >
                    <Text
                      style={{
                        fontSize: cellSize * 0.4,
                        lineHeight: cellSize * 0.48,
                        textAlign: "center",
                        color: promotionPalette.base,
                        fontWeight: "600",
                        textShadowColor: promotionPalette.outline,
                        textShadowOffset: { width: 1, height: 2 },
                        textShadowRadius: 2,
                      }}
                    >
                      {PIECE_GLYPHS[type]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

function pieceSize(cellSize: number): number {
  return cellSize * 0.92;
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
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  destMarker: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
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
  coord: {
    position: "absolute",
    fontFamily: Fonts.hand,
    opacity: 0.9,
  },
  promotionOverlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BOARD_COLORS.promotionBackdrop,
    zIndex: 10,
  },
  promotionCard: {
    flexDirection: "row",
    backgroundColor: BOARD_COLORS.frame,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: BOARD_COLORS.frameShadow,
    padding: 4,
    gap: 4,
  },
  promotionCell: {
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  promotionCellPressed: {
    opacity: 0.6,
    transform: [{ scale: 0.95 }],
  },
});