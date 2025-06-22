import { Card, Deck, Room } from "../types";

export function buildDeck() {
  let deck = [];
  let colors = ["blue", "red", "green", "yellow"];
  let values = [
    "one",
    "three",
    "four",
    "five",
    "six",
    "seven",
    "eight",
    "nine",
    "plus",
    "reverse",
    "draw_two",
    "skip",
  ];
  for (let color of colors) {
    for (let value of values) {
      deck.push({ color: color, value: value });
      deck.push({ color: color, value: value });
    }
  }
  for (let i = 0; i < 5; i++) {
    deck.push({ color: "none", value: "change_color" });
  }

  return deck;
}
export function Shuffle(deck: Deck) {
  let currentIndex = deck.length;
  console.log(deck.length);

  // While there remain elements to shuffle...
  while (currentIndex > 0) {
    // Pick a remaining element...
    let randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [deck[currentIndex], deck[randomIndex]] = [
      deck[randomIndex],
      deck[currentIndex],
    ];
  }
  return deck;
}
export function iterateTurn(room: Room) {
  if (room.turn != undefined) {
    switch (room.direction) {
      case "clockwise":
        if (room.turn === room.players.length - 1) {
          room.turn = 0;
        } else {
          room.turn = room.turn + 1;
        }

        break;
      case "counterClockwise":
        if (room.turn === 0) {
          room.turn = room.players.length - 1;
        } else {
          room.turn = room.turn - 1;
        }

        break;
      default:
    }
  }

  return room;
}

export function play(
  room: Room,
  socketId: string,
  card: Card,
  colorless: boolean
) {
  let [item] = room.hands[socketId].splice(
    room.hands[socketId].findIndex((i) =>
      colorless
        ? i.value == (card as Card).value
        : i.color == card.color && i.value == card.value
    ),

    1
  );
  if (colorless) {
    item.color = card.color;
  }
  room.discard!.push(item);
}

export function draw(room: Room, socketId: string, amount: number) {
  room.deck?.push(...room.discard!.splice(0, room.discard!.length - 1));
  if (room.deck?.length! <= amount) {
    room.deck?.push(...buildDeck());
    room.deck = Shuffle(room.deck!);
  }
  room.hands[socketId].push(...room.deck!.splice(0, amount));
}
