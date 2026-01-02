// Simple in-memory store for testing without MongoDB
class MemoryStore {
  constructor() {
    this.users = new Map();
    this.chats = new Map();
    this.loadFromLocalStorage();
  }

  // Load data from localStorage if available (for browser persistence)
  loadFromLocalStorage() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const savedChats = localStorage.getItem('ai-orb-chat-history');
        if (savedChats) {
          const parsedChats = JSON.parse(savedChats);
          Object.entries(parsedChats).forEach(([key, chat]) => {
            this.chats.set(key, chat);
          });
          console.log('📱 Loaded chat history from localStorage');
        }
      }
    } catch (error) {
      console.error('❌ Error loading from localStorage:', error);
    }
  }

  // Save data to localStorage for browser persistence
  saveToLocalStorage() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const chatsObj = Object.fromEntries(this.chats);
        localStorage.setItem('ai-orb-chat-history', JSON.stringify(chatsObj));
      }
    } catch (error) {
      console.error('❌ Error saving to localStorage:', error);
    }
  }

  // User methods
  async createUser(userData) {
    const user = {
      _id: Date.now().toString(),
      ...userData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.users.set(user._id, user);
    this.users.set(user.email, user); // Also index by email
    return user;
  }

  async findUserByEmail(email) {
    return this.users.get(email) || null;
  }

  async findUserById(id) {
    return this.users.get(id) || null;
  }

  async updateUser(id, updateData) {
    const user = this.users.get(id);
    if (user) {
      const updatedUser = { ...user, ...updateData, updatedAt: new Date() };
      this.users.set(id, updatedUser);
      this.users.set(user.email, updatedUser);
      return updatedUser;
    }
    return null;
  }

  // Chat methods
  async createChat(chatData) {
    const chat = {
      _id: Date.now().toString(),
      ...chatData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.chats.set(chat._id, chat);
    this.saveToLocalStorage();
    return chat;
  }

  async findChatByUserId(userId, chatId = null) {
    for (const chat of this.chats.values()) {
      if (chat.userId === userId) {
        if (chatId === null || chat.chatId === chatId) {
          return chat;
        }
      }
    }
    return null;
  }

  async updateChat(id, updateData) {
    const chat = this.chats.get(id);
    if (chat) {
      const updatedChat = { ...chat, ...updateData, updatedAt: new Date() };
      this.chats.set(id, updatedChat);
      this.saveToLocalStorage();
      return updatedChat;
    }
    return null;
  }

  async deleteChatByUserId(userId) {
    for (const [id, chat] of this.chats.entries()) {
      if (chat.userId === userId) {
        this.chats.delete(id);
        this.saveToLocalStorage();
        return { deletedCount: 1 };
      }
    }
    return { deletedCount: 0 };
  }

  async deleteChatByUserIdAndChatId(userId, chatId) {
    for (const [id, chat] of this.chats.entries()) {
      if (chat.userId === userId && chat.chatId === chatId) {
        this.chats.delete(id);
        this.saveToLocalStorage();
        return { deletedCount: 1 };
      }
    }
    return { deletedCount: 0 };
  }
}

export default new MemoryStore();
