export interface UserProfile {
  uid: string;
  username: string;
  displayName: string;
  photoURL?: string;
  bio?: string;
  lastSeen?: string;
  status?: 'online' | 'offline' | 'away';
}

export interface ChatRoom {
  id: string;
  name?: string;
  description?: string;
  type: 'private' | 'group' | 'channel';
  createdBy: string;
  createdAt: any;
  members: string[];
  lastMessage?: Message;
  lastActivity?: any;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  content: string;
  replyTo?: string;
  edited?: boolean;
  deleted?: boolean;
  createdAt: any;
  reactions?: Record<string, string[]>;
  type: 'text' | 'game_invite';
  gameData?: any;
}
