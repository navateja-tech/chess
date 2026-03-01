import { v4 as uuidv4 } from "uuid";

// Simple in-memory queues and rooms for demo purposes.
const blitzQueue = [];
const bulletQueue = [];
const unlimitedQueue = [];
const checkraceQueue = [];
const friendRooms = new Map(); // roomId -> { hostId, hostSocketId, guestId, guestSocketId }

function getQueue(gameType) {
  switch (gameType) {
    case "blitz": return blitzQueue;
    case "bullet": return bulletQueue;
    case "unlimited": return unlimitedQueue;
    case "checkrace": return checkraceQueue;
    default: return blitzQueue;
  }
}

export function enqueuePlayer(userId, gameType, socketId) {
  const queue = getQueue(gameType);
  // Try to find opponent
  if (queue.length > 0) {
    const opponent = queue.shift();
    const gameId = uuidv4();
    return { matched: true, gameId, whiteId: opponent.userId, blackId: userId, opponentSocketId: opponent.socketId };
  }
  queue.push({ userId, socketId });
  return { matched: false };
}

export function createFriendRoom(userId, socketId) {
  const gameId = uuidv4();
  friendRooms.set(gameId, { hostId: userId, hostSocketId: socketId, guestId: null, guestSocketId: null });
  return gameId;
}

export function joinFriendRoom(userId, gameId, socketId) {
  const room = friendRooms.get(gameId);
  if (!room || room.guestId) {
    return null;
  }
  room.guestId = userId;
  room.guestSocketId = socketId;
  friendRooms.set(gameId, room);
  return room;
}

