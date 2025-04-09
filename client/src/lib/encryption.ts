/**
 * Encryption utilities for end-to-end encrypted chat messages
 * Uses TweetNaCl.js for encryption/decryption and key management
 */

import nacl from 'tweetnacl';
import util from 'tweetnacl-util';
import sodium from 'libsodium-wrappers';

// Initialize sodium
const sodiumReady = sodium.ready;

// Generate a new key pair for a user
export const generateKeyPair = async (): Promise<{
  publicKey: string;
  privateKey: string;
}> => {
  await sodiumReady;
  const keyPair = nacl.box.keyPair();
  return {
    publicKey: util.encodeBase64(keyPair.publicKey),
    privateKey: util.encodeBase64(keyPair.secretKey),
  };
};

// Store keys securely in localStorage
export const storeKeyPair = (userId: string, keyPair: { publicKey: string; privateKey: string }) => {
  localStorage.setItem(`encryption_keypair_${userId}`, JSON.stringify(keyPair));
};

// Retrieve the key pair from localStorage
export const getKeyPair = (userId: string): { publicKey: string; privateKey: string } | null => {
  const stored = localStorage.getItem(`encryption_keypair_${userId}`);
  if (!stored) return null;
  
  try {
    return JSON.parse(stored);
  } catch (e) {
    console.error('Failed to parse stored key pair:', e);
    return null;
  }
};

// Generate a shared key between two users
export const getSharedKey = (myPrivateKey: string, theirPublicKey: string): Uint8Array => {
  const decodedPrivateKey = util.decodeBase64(myPrivateKey);
  const decodedPublicKey = util.decodeBase64(theirPublicKey);
  return nacl.box.before(decodedPublicKey, decodedPrivateKey);
};

// Encrypt a message using the shared key
export const encryptMessage = (message: string, sharedKey: Uint8Array): string => {
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const messageUint8 = util.decodeUTF8(message);
  const encrypted = nacl.box.after(messageUint8, nonce, sharedKey);
  
  const fullMessage = new Uint8Array(nonce.length + encrypted.length);
  fullMessage.set(nonce);
  fullMessage.set(encrypted, nonce.length);
  
  return util.encodeBase64(fullMessage);
};

// Decrypt a message using the shared key
export const decryptMessage = (encryptedMessage: string, sharedKey: Uint8Array): string | null => {
  try {
    const messageWithNonce = util.decodeBase64(encryptedMessage);
    const nonce = messageWithNonce.slice(0, nacl.box.nonceLength);
    const message = messageWithNonce.slice(nacl.box.nonceLength);
    
    const decrypted = nacl.box.open.after(message, nonce, sharedKey);
    if (!decrypted) return null;
    
    return util.encodeUTF8(decrypted);
  } catch (e) {
    console.error('Failed to decrypt message:', e);
    return null;
  }
};

// Encrypt message for initial key exchange (using recipient's public key directly)
export const encryptWithPublicKey = (message: string, myPrivateKey: string, theirPublicKey: string): string => {
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const messageUint8 = util.decodeUTF8(message);
  const decodedPrivateKey = util.decodeBase64(myPrivateKey);
  const decodedPublicKey = util.decodeBase64(theirPublicKey);
  
  const encrypted = nacl.box(messageUint8, nonce, decodedPublicKey, decodedPrivateKey);
  
  const fullMessage = new Uint8Array(nonce.length + encrypted.length);
  fullMessage.set(nonce);
  fullMessage.set(encrypted, nonce.length);
  
  return util.encodeBase64(fullMessage);
};

// Generate an ephemeral session key for a conversation
export const generateSessionKey = (): string => {
  const sessionKey = nacl.randomBytes(32);
  return util.encodeBase64(sessionKey);
};

// Check if the user has a stored key pair, or generate a new one
export const ensureUserHasKeyPair = async (userId: string): Promise<{ publicKey: string; privateKey: string }> => {
  let keyPair = getKeyPair(userId);
  
  if (!keyPair) {
    keyPair = await generateKeyPair();
    storeKeyPair(userId, keyPair);
  }
  
  return keyPair;
};