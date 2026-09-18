import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";

import { authTokenFor } from "@/lib/api";
import { generateUsername } from "@/lib/words";

const USERNAME_KEY = "bored-games:username";
const TOKEN_CACHE_KEY = "bored-games:token";
const USER_ID_KEY = "bored-games:userId";

export type ClientAuth = {
  username: string;
  token: string;
};

async function generateToken(username: string): Promise<string> {
  // Must match api/src/auth.ts generateToken (SHA-256 of "username:secret")
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    authTokenFor(username)
  );
}

export async function getOrCreateAuth(): Promise<ClientAuth> {
  let username = await AsyncStorage.getItem(USERNAME_KEY);
  if (!username) {
    username = generateUsername();
    await AsyncStorage.setItem(USERNAME_KEY, username);
  }
  let token = await AsyncStorage.getItem(TOKEN_CACHE_KEY);
  if (!token) {
    token = await generateToken(username);
    await AsyncStorage.setItem(TOKEN_CACHE_KEY, token);
  }
  return { username, token };
}

export async function saveUserId(userId: string): Promise<void> {
  await AsyncStorage.setItem(USER_ID_KEY, userId);
}

export async function getUserId(): Promise<string | null> {
  return AsyncStorage.getItem(USER_ID_KEY);
}