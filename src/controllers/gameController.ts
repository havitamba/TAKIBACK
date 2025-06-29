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
export const startGame = (io: Server, room: Room) => {
  setTimeout(() => {
    room.gameStarted = true;
    room.deck = Shuffle(buildDeck());
    room.discard = room.deck.splice(
      room.deck.findIndex((itemd) =>
        [
          "one",
          "three",
          "four",
          "five",
          "six",
          "seven",
          "eight",
          "nine",
        ].includes(itemd.value)
      ),
      1
    );
    room.turn = 0;
    room.direction = "clockwise";
    // deal initial hands
    for (let player of room.players) {
      room.hands[player.id] = room.deck.splice(0, 7);
    }
    //send each player the data from their own POV
    updateGame(io, room);
    // io.to(room.id).emit("startGame",{room:room});

    console.log("GAME STARTED");
    console.log(room.deck);
    console.log(room.hands);
  }, 100);
};

export const playCard = (
  io: Server,
  socket: Socket,
  id: string,
  card: Card | string
) => {
  console.log("card played", card);
  let room = rooms[id];

  if (room.discard && room.players[room.turn!].id === socket.id) {
    const matching =
      (card as Card).color ===
        (room.discard[room.discard.length - 1] as Card).color ||
      (card as Card).value ===
        (room.discard[room.discard.length - 1] as Card).value;

    if (room.combo > 0) {
      console.log(`COMBO IS ${room.combo}`);
      if ((card as Card).value == "draw_two") {
        play(room, socket.id, card as Card, false);
        room.combo += 2;
        room = iterateTurn(room);
        updateGame(io, room);
      } else {
        console.log(`BUSTED, DRAW ${room.combo} cards`);
        draw(room, socket.id, room.combo);
        room.combo = 0;
        room = iterateTurn(room);
        updateGame(io, room);
      }
    } else if (matching && (card as Card).value == "draw_two") {
      play(room, socket.id, card as Card, false);
      room.combo += 2;
      room = iterateTurn(room);
      updateGame(io, room);
    } else if (card === "draw") {
      draw(room, socket.id, 1);
      room = iterateTurn(room);
      updateGame(io, room);
    } else if ((card as Card).value === "change_color") {
      play(room, socket.id, card as Card, true);
      room = iterateTurn(room);
      updateGame(io, room);
    } else if (matching && (card as Card).value == "reverse") {
      room.direction =
        room.direction == "clockwise" ? "counterClockwise" : "clockwise";
      play(room, socket.id, card as Card, false);
      room = iterateTurn(room);
      updateGame(io, room);
    } else if (matching && (card as Card).value == "skip") {
      play(room, socket.id, card as Card, false);
      room = iterateTurn(room);
      room = iterateTurn(room);
      updateGame(io, room);
    } else if (matching) {
      play(room, socket.id, card as Card, false);
      if ((card as Card).value != "plus") {
        room = iterateTurn(room);
      }
      updateGame(io, room);
    }

    //check if anyone played all their cards
    if (room.hands[socket.id].length == 0) {
      gameOver(io, room, socket);
    }
  } else {
    console.log("BRUH");
  }
};
export const gameOver = (io: Server, room: Room, socket: Socket) => {
  for (let destinedPlayer of room.players) {
    const winner = room.players.find((player) => player.id == socket.id)?.name;
    const result = room.hands[destinedPlayer.id].length == 0 ? "win" : "lose";
    io.to(destinedPlayer.id).emit("gameOver", {
      result: result,
      winner: winner,
    });
  }
};
export const updateGame = (io: Server, room: Room) => {
  for (let destinedPlayer of room.players) {
    let players = [];
    for (let player of room.players) {
      players.push({
        name: player.name,
        hand: room.hands[player.id].length,
        id: player.id,
        profile: player.profile,
      });
    }

    io.to(destinedPlayer.id).emit("updateGame", {
      room: {
        id: room.id,
        name: room.name,
        myId: destinedPlayer.id,
        players: players,
        hand: room.hands[destinedPlayer.id],
        discard: room.discard![room.discard!.length - 1],
        turn: room.turn,
        //   direction:room.direction,
      },
    });
  }
};
