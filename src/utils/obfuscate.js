/**
 * Created by caelondev
 * Licensed under the GNU AGPLv3
 * See LICENSE for details.
 */

const crypto = require('crypto');

const ENCRYPTION_KEY = crypto.randomBytes(32);
const IV_LENGTH = 16;

/**
 * @param {'aes-256-cbc' | 'aes-192-cbc' | 'aes-128-cbc' | 'aes-256-gcm' | 'aes-192-gcm' | 'aes-128-gcm'} method
 * @param {string} message
 * @returns {string}
 */
function encrypt(method, message) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(method, ENCRYPTION_KEY, iv);
  
  let encrypted = cipher.update(message, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  if (method.includes('gcm')) {
    const authTag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${encrypted}:${authTag.toString('hex')}`;
  }
  
  return `${iv.toString('hex')}:${encrypted}`;
}

/**
 * @param {'aes-256-cbc' | 'aes-192-cbc' | 'aes-128-cbc' | 'aes-256-gcm' | 'aes-192-gcm' | 'aes-128-gcm'} method
 * @param {string} encryptedMessage
 * @returns {string}
 */
function decrypt(method, encryptedMessage) {
  const parts = encryptedMessage.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encryptedData = parts[1];
  
  const decipher = crypto.createDecipheriv(method, ENCRYPTION_KEY, iv);
  
  if (method.includes('gcm')) {
    const authTag = Buffer.from(parts[2], 'hex');
    decipher.setAuthTag(authTag);
  }
  
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

module.exports = { encrypt, decrypt }
