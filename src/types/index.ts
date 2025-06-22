// export interface roomsinterface {
//   [key: string]: roominterface;
// }
// export interface roominterface {
//   players: string[];
//     deck: cardinterface[];
//     hands: { [key: string]: cardinterface[] };
//     discard: cardinterface[];
//     turn: number;
// }
// export interface cardinterface {
//   value: string;
//   color: string;
// }
export interface Player {
  id: string;
  name: string;
  profile: string;
}

export interface Room {
  id: string;
  name: string;
  maxPlayers: number;
  players: Player[];
  gameStarted: boolean;
  deleteTimeout: NodeJS.Timeout | null;

  deck?: Card[];
  discard?: Card[];
  turn?: number;
  direction?: string;
  hands: { [key: string]: Card[] };
  combo: number;
}
export interface Card {
  color: string;
  value: string;
}
export type Deck = Card[];
