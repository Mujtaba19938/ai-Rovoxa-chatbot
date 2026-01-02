import { v4 as uuidv4 } from 'uuid';

const USER_ID_KEY = 'ai-orb-chat-user-id';

export const getUserID = (): string => {
  if (typeof window === 'undefined') {
    // Server-side rendering - return a temporary ID
    return 'temp-' + Math.random().toString(36).substr(2, 9);
  }

  let userId = localStorage.getItem(USER_ID_KEY);
  
  if (!userId) {
    userId = uuidv4();
    localStorage.setItem(USER_ID_KEY, userId);
    console.log('🆔 Generated new user ID:', userId);
  } else {
    console.log('🆔 Using existing user ID:', userId);
  }
  
  return userId;
};

export const clearUserID = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(USER_ID_KEY);
    console.log('🗑️ Cleared user ID from localStorage');
  }
};

export const setUserID = (userId: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(USER_ID_KEY, userId);
    console.log('🆔 Set user ID:', userId);
  }
};
