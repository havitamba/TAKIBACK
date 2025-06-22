import { Player, Room } from "../types";
import { Server, Socket } from "socket.io";
import { v4 as uuidv4 } from "uuid";
import { startGame } from "./gameController";

export const rooms: Record<string, Room> = {};
export const refreshRooms = (io: any) => {
  console.log("emitting to all players");
  io.emit(
    "refreshRooms",
    Object.values(rooms)
      .filter((room) => !room.gameStarted)
      .map((room) => {
        return {
          name: room.name,
          players: room.players.length,
          maxPlayers: room.maxPlayers,
          id: room.id,
        };
      })
  );
};
export const refreshWaitingRoom = (io: any, roomId: string) => {
  console.log("emitting to specific room");
  const room = rooms[roomId];
  io.to(roomId).emit("refreshWaitingRoom", {
    id: room.id,
    name: room.name,
    maxPlayers: room.maxPlayers,
    players: room.players,
  });
};

export const createRoom = (
  io: Server,
  socket: Socket,
  {
    playerName,
    roomName,
    maxPlayers,
    profile,
  }: {
    playerName: string;
    roomName: string;
    maxPlayers: number;
    profile: string;
  }
) => {
  const roomId = uuidv4();
  const room = {
    id: roomId,
    name: roomName,
    maxPlayers: maxPlayers,
    players: [{ name: playerName, id: socket.id, profile: profile }],
    gameStarted: false,
    deleteTimeout: null, // Initialize delete timeout to null

    hands: {},
    combo: 0,
  };
  rooms[roomId] = room;
  socket.join(roomId);
  socket.emit("joinedRoom", {
    roomId,
    room: {
      id: room.id,
      name: room.name,
      maxPlayers: room.maxPlayers,
      players: room.players,
    },
    playerId: socket.id,
  });

  refreshRooms(io);
  refreshWaitingRoom(io, roomId);
};

export const joinRoom = (
  io: Server,
  socket: Socket,
  {
    roomId,
    playerName,
    profile,
  }: { roomId: string; playerName: string; profile: string }
) => {
  console.log("aaaa join room", profile);
  const room = rooms[roomId];

  if (!room) {
    socket.emit("joinRoomError", "Room not found");
    return;
  }

  if (room.gameStarted) {
    socket.emit("joinRoomError", "Game has already started");
    return;
  }

  if (room.players.length >= room.maxPlayers) {
    socket.emit("joinRoomError", "Room is full");
    return;
  }

  // Check if player is already in room
  if (room.players.some((p) => p.id === socket.id)) {
    socket.emit("joinRoomError", "You are already in this room");
    return;
  }

  const player: Player = {
    id: socket.id,
    name: playerName,
    profile: profile,
  };

  room.players.push(player);
  socket.join(roomId);
  if (room.deleteTimeout) {
    clearTimeout(room.deleteTimeout);
    room.deleteTimeout = null; // Reset delete timeout since the room is active again
  }

  // Send success response to the joining player
  socket.emit("joinedRoom", {
    roomId,
    room: {
      id: room.id,
      name: room.name,
      maxPlayers: room.maxPlayers,
      players: room.players,
    },
    playerId: socket.id,
  });

  // Check if room is full and start game
  if (room.players.length === room.maxPlayers) {
    startGame(io, room);
  }

  refreshRooms(io);
  refreshWaitingRoom(io, roomId);
};

export const leaveRoom = (io: Server, socket: Socket) => {
  // Find which room the player is in
  for (const roomId in rooms) {
    const room = rooms[roomId];
    const playerIndex = room.players.findIndex((p) => p.id === socket.id);

    if (playerIndex !== -1) {
      const player = room.players[playerIndex];
      room.players.splice(playerIndex, 1);

      // If room is empty, delete it

      if (room.players.length === 0 && !room.deleteTimeout) {
        console.log(`Room ${roomId} is empty, starting countdown to delete`);
        room.deleteTimeout = setTimeout(() => {
          delete rooms[roomId];
          refreshRooms(io);
          console.log(`Room ${roomId} deleted due to inactivity.`);
        }, 10000);
      } else {
        // Notify remaining players
        // io.to(roomId).emit("playerLeft", {
        //   player,
        //   room: room,
        // });
      }
      socket.leave(roomId);
      refreshWaitingRoom(io, roomId);
      refreshRooms(io);
      break;
    }
  }
};
