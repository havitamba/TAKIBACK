import { Server, Socket } from "socket.io";
import { Card, Room } from "../types";
import {
  buildDeck,
  draw,
  iterateTurn,
  play,
  Shuffle,
} from "../functions/deckFuncs";
import { rooms } from "./roomControllers";

// Constants for better maintainability
const INITIAL_HAND_SIZE = 7;
const GAME_START_DELAY = 100;
const DRAW_CARDS_COUNT = 1;

// Valid card values for initial discard
const VALID_INITIAL_CARDS = [
  "one",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
];

// Special card values
const SPECIAL_CARDS = {
  TAKI: "taki",
  DRAW_TWO: "draw_two",
  CHANGE_COLOR: "change_color",
  REVERSE: "reverse",
  SKIP: "skip",
  PLUS: "plus",
} as const;

export const startGame = (io: Server, room: Room): void => {
  setTimeout(() => {
    try {
      initializeGame(room);
      dealInitialHands(room);
      updateGame(io, room);
    } catch (error) {
      console.error("Error starting game:", error);
      io.to(room.id).emit("gameError", { message: "Failed to start game" });
    }
  }, GAME_START_DELAY);
};

const initializeGame = (room: Room): void => {
  room.gameStarted = true;
  room.deck = Shuffle(buildDeck());

  // Find and remove initial discard card
  const initialCardIndex = room.deck.findIndex((card) =>
    VALID_INITIAL_CARDS.includes(card.value)
  );

  if (initialCardIndex === -1) {
    throw new Error("No valid initial card found in deck");
  }

  room.discard = room.deck.splice(initialCardIndex, 1);
  room.turn = 0;
  room.direction = "clockwise";
  room.combo = 0;
  room.openTaki = false;
};

const dealInitialHands = (room: Room): void => {
  for (const player of room.players) {
    if (room.deck!.length < INITIAL_HAND_SIZE) {
      throw new Error("Not enough cards to deal initial hands");
    }
    room.hands[player.id] = room.deck!.splice(0, INITIAL_HAND_SIZE);
  }
};

export const playCard = (
  io: Server,
  socket: Socket,
  roomId: string,
  card: Card | string
): void => {
  console.log("Card played:", card);

  const room = rooms[roomId];
  if (!room || !room.discard || !isPlayerTurn(room, socket.id)) {
    console.log("Invalid play attempt");
    return;
  }

  try {
    if (card === "draw") {
      handleDrawCard(room, socket.id);
    } else {
      handlePlayCard(room, socket.id, card as Card);
    }

    updateGame(io, room);

    // Check for game over
    if (room.hands[socket.id].length === 0) {
      gameOver(io, room, socket);
    }
  } catch (error) {
    console.error("Error playing card:", error);
    socket.emit("playError", { message: "Invalid move" });
  }
};

const isPlayerTurn = (room: Room, playerId: string): boolean => {
  return room.turn !== undefined && room.players[room.turn].id === playerId;
};

const handleDrawCard = (room: Room, playerId: string): void => {
  if (room.combo > 0) {
    draw(room, playerId, room.combo);
    room.combo = 0;
    room = iterateTurn(room);
  } else if (room.openTaki) {
    room.openTaki = false;
    executeCardEffect(room, room.discard![room.discard!.length - 1] as Card);
  } else {
    draw(room, playerId, DRAW_CARDS_COUNT);
    room = iterateTurn(room);
  }
};

const handlePlayCard = (room: Room, playerId: string, card: Card): void => {
  const topCard = room.discard![room.discard!.length - 1] as Card;

  if (room.combo > 0) {
    handleComboPlay(room, playerId, card);
  } else if (room.openTaki) {
    handleTakiPlay(room, playerId, card, topCard);
  } else {
    handleNormalPlay(room, playerId, card, topCard);
  }
};

const handleComboPlay = (room: Room, playerId: string, card: Card): void => {
  if (card.value === SPECIAL_CARDS.DRAW_TWO) {
    play(room, playerId, card, false);
    room.combo += 2;
    room = iterateTurn(room);
    console.log("combo is ", room.combo);
  } else {
    console.log(`Player must draw ${room.combo} cards`);
    draw(room, playerId, room.combo);
    room.combo = 0;
    room = iterateTurn(room);
  }
};

const handleTakiPlay = (
  room: Room,
  playerId: string,
  card: Card,
  topCard: Card
): void => {
  if (card.color === topCard.color) {
    play(room, playerId, card, false);
  } else if (card.value === SPECIAL_CARDS.CHANGE_COLOR) {
    play(room, playerId, card, true);
    room.openTaki = false;
    room = iterateTurn(room);
  } else {
    // End taki sequence
    room.openTaki = false;
    executeCardEffect(room, topCard);
  }
};

const handleNormalPlay = (
  room: Room,
  playerId: string,
  card: Card,
  topCard: Card
): void => {
  const isMatching =
    card.color === topCard.color || card.value === topCard.value;

  if (card.value === SPECIAL_CARDS.CHANGE_COLOR) {
    play(room, playerId, card, true);
    room = iterateTurn(room);
  } else if (isMatching) {
    play(room, playerId, card, false);
    executeCardEffect(room, card);
  } else {
    throw new Error("Card doesn't match");
  }
};

const executeCardEffect = (room: Room, card: Card): void => {
  switch (card.value) {
    case SPECIAL_CARDS.TAKI:
      room.openTaki = true;
      break;
    case SPECIAL_CARDS.DRAW_TWO:
      room.combo += 2;
      room = iterateTurn(room);
      break;
    case SPECIAL_CARDS.REVERSE:
      room.direction =
        room.direction === "clockwise" ? "counterClockwise" : "clockwise";
      room = iterateTurn(room);
      break;
    case SPECIAL_CARDS.SKIP:
      room = iterateTurn(room);
      room = iterateTurn(room);
      break;
    case SPECIAL_CARDS.PLUS:
      // Plus card doesn't advance turn
      break;
    default:
      room = iterateTurn(room);
      break;
  }
};

export const gameOver = (io: Server, room: Room, socket: Socket): void => {
  const winner = room.players.find((player) => player.id === socket.id);

  if (!winner) {
    console.error("Winner not found");
    return;
  }

  room.players.forEach((player) => {
    const result = room.hands[player.id].length === 0 ? "win" : "lose";
    io.to(player.id).emit("gameOver", {
      result,
      winner: winner.name,
    });
  });

  // Clean up room state
  room.gameStarted = false;
  console.log(`Game over. Winner: ${winner.name}`);
};

export const updateGame = (io: Server, room: Room): void => {
  if (!room.discard || room.discard.length === 0) {
    console.error("No discard pile to update");
    return;
  }

  const gameState = createGameState(room);

  room.players.forEach((player) => {
    const playerGameState = {
      ...gameState,
      myId: player.id,
      hand: room.hands[player.id] || [],
    };

    io.to(player.id).emit("updateGame", { room: playerGameState });
  });
};

const createGameState = (room: Room) => {
  return {
    id: room.id,
    name: room.name,
    players: room.players.map((player) => ({
      name: player.name,
      hand: room.hands[player.id]?.length || 0,
      id: player.id,
      profile: player.profile,
    })),
    discard: room.discard![room.discard!.length - 1],
    turn: room.turn,
    direction: room.direction,
    combo: room.combo,
    openTaki: room.openTaki,
  };
};
