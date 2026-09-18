export interface GameOverResult {
  winnerIndex: number | null;
  isDraw: boolean;
}

export interface GameEngine {
  playerCount: { min: number; max: number };
  createInitialState(playerCount: number): any;
  getPlayerSymbol(playerIndex: number): string;
  validateMove(state: any, moveData: any, playerIndex: number): boolean;
  applyMove(state: any, moveData: any, playerIndex: number, playerCount: number): any;
  checkGameOver(state: any): GameOverResult | null;
  getPublicState(state: any): any;
}