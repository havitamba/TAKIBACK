import { Server, Socket } from "socket.io";
import {
  createRoom,
  joinRoom,
  leaveRoom,
  refreshRooms,
} from "../controllers/roomControllers";
import { playCard } from "../controllers/gameController";

const router = (io: Server) => {
  io.on("connection", (socket: Socket) => {
    console.log("A user connected:", socket.id);
    refreshRooms(io);
    socket.on(
      "createRoom",
      (data: {
        playerName: string;
        roomName: string;
        maxPlayers: number;
        profile: string;
      }) => {
        createRoom(io, socket, data);
      }
    );
    socket.on(
      "joinRoom",
      (data: { roomId: string; playerName: string; profile: string }) => {
        joinRoom(io, socket, data);
      }
    );
    socket.on("playCard", (id, card) => {
      playCard(io, socket, id, card);
    });
    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
      leaveRoom(io, socket);
    });
    socket.on("enteredLobby", () => {
      console.log("User entered lobby:", socket.id);
      leaveRoom(io, socket);
    });
    // You can add more event listeners and route them to different handlers here
  });
};

export { router };
