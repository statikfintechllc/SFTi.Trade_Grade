/**
 * SFTi P.R.E.P - Encrypted Token Vault
 * Persistent, encrypted storage for tokens using IndexedDB + AES-GCM
 * 
 * SECURITY MODEL:
 * - sessionStorage = cleared on tab close = extractive for OAuth providers
 * - IndexedDB = persists across sessions = user convenience
 * - AES-GCM encryption = immune to XSS unless attacker has passphrase
 * - Key derived from user passphrase via PBKDF2
 * 
 * @version 3.0.0
 * @author SFTi LLC
 * @license MIT
 */

const EncryptedVault = {
    config: {
        dbName: 'sfti_encrypted_vault',
        dbVersion: 1,
        storeName: 'tokens',
        
        // PBKDF2 config for key derivation
        pbkdf2: {
            iterations: 100000,
            hash: 'SHA-256'
        },
        
        // AES-GCM config
        aes: {
            name: 'AES-GCM',
            length: 256
        }
    },

    state: {
        db: null,
        masterKey: null,
        salt: null
    },

    /**
     * Initialize vault
     */
    async init() {
        try {
            console.log('[EncryptedVault] Initializing encrypted token vault');
            
            // Open IndexedDB
            this.state.db = await this.openDatabase();
            
            // Load or generate salt
            await this.loadSalt();
            
            console.log('[EncryptedVault] Vault ready for encrypted storage');
            return true;
        } catch (error) {
            console.error('[EncryptedVault] Initialization failed:', error);
            return false;
        }
    },

    /**
     * Open IndexedDB
     */
    openDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.config.dbName, this.config.dbVersion);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Create object store if it doesn't exist
                if (!db.objectStoreNames.contains(this.config.storeName)) {
                    const store = db.createObjectStore(this.config.storeName, { keyPath: 'key' });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                }
            };
        });
    },

    /**
     * Load or generate salt for key derivation
     */
    async loadSalt() {
        const stored = localStorage.getItem('sfti_vault_salt');
        if (stored) {
            this.state.salt = new Uint8Array(JSON.parse(stored));
            console.log('[EncryptedVault] Loaded existing salt');
        } else {
            // Generate new salt
            this.state.salt = crypto.getRandomValues(new Uint8Array(16));
            localStorage.setItem('sfti_vault_salt', JSON.stringify(Array.from(this.state.salt)));
            console.log('[EncryptedVault] Generated new salt');
        }
    },

    /**
     * Derive encryption key from passphrase
     * @param {string} passphrase - User passphrase
     * @returns {Promise<CryptoKey>}
     */
    async deriveKey(passphrase) {
        const encoder = new TextEncoder();
        const passphraseKey = await crypto.subtle.importKey(
            'raw',
            encoder.encode(passphrase),
            'PBKDF2',
            false,
            ['deriveBits', 'deriveKey']
        );
        
        return await crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: this.state.salt,
                iterations: this.config.pbkdf2.iterations,
                hash: this.config.pbkdf2.hash
            },
            passphraseKey,
            this.config.aes,
            false,
            ['encrypt', 'decrypt']
        );
    },

    /**
     * Encrypt data using AES-GCM
     * @param {CryptoKey} key - Encryption key
     * @param {string} data - Data to encrypt
     * @returns {Promise<object>}
     */
    async encrypt(key, data) {
        const encoder = new TextEncoder();
        const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for GCM
        
        const encrypted = await crypto.subtle.encrypt(
            {
                name: this.config.aes.name,
                iv: iv
            },
            key,
            encoder.encode(data)
        );
        
        return {
            iv: Array.from(iv),
            data: Array.from(new Uint8Array(encrypted))
        };
    },

    /**
     * Decrypt data using AES-GCM
     * @param {CryptoKey} key - Decryption key
     * @param {object} encrypted - Encrypted data object
     * @returns {Promise<string>}
     */
    async decrypt(key, encrypted) {
        const decrypted = await crypto.subtle.decrypt(
            {
                name: this.config.aes.name,
                iv: new Uint8Array(encrypted.iv)
            },
            key,
            new Uint8Array(encrypted.data)
        );
        
        const decoder = new TextDecoder();
        return decoder.decode(decrypted);
    },

    /**
     * Store token with encryption
     * @param {string} tokenKey - Token identifier
     * @param {string} tokenValue - Token value
     * @param {string} passphrase - User passphrase for encryption
     * @param {object} metadata - Optional metadata
     */
    async storeToken(tokenKey, tokenValue, passphrase, metadata = {}) {
        try {
            const key = await this.deriveKey(passphrase);
            const encrypted = await this.encrypt(key, tokenValue);
            
            const transaction = this.state.db.transaction([this.config.storeName], 'readwrite');
            const store = transaction.objectStore(this.config.storeName);
            
            const record = {
                key: tokenKey,
                encrypted: encrypted,
                timestamp: Date.now(),
                metadata: metadata
            };
            
            await new Promise((resolve, reject) => {
                const request = store.put(record);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
            
            console.log(`[EncryptedVault] 🔐 Stored encrypted token: ${tokenKey}`);
            return true;
        } catch (error) {
            console.error('[EncryptedVault] Failed to store token:', error);
            return false;
        }
    },

    /**
     * Retrieve and decrypt token
     * @param {string} tokenKey - Token identifier
     * @param {string} passphrase - User passphrase for decryption
     * @returns {Promise<string|null>}
     */
    async retrieveToken(tokenKey, passphrase) {
        try {
            const transaction = this.state.db.transaction([this.config.storeName], 'readonly');
            const store = transaction.objectStore(this.config.storeName);
            
            const record = await new Promise((resolve, reject) => {
                const request = store.get(tokenKey);
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
            
            if (!record) {
                console.log(`[EncryptedVault] Token not found: ${tokenKey}`);
                return null;
            }
            
            const key = await this.deriveKey(passphrase);
            const decrypted = await this.decrypt(key, record.encrypted);
            
            console.log(`[EncryptedVault] 🔓 Retrieved token: ${tokenKey}`);
            return decrypted;
        } catch (error) {
            console.error('[EncryptedVault] Failed to retrieve token:', error);
            console.error('[EncryptedVault] Possible incorrect passphrase');
            return null;
        }
    },

    /**
     * Delete token
     * @param {string} tokenKey - Token identifier
     */
    async deleteToken(tokenKey) {
        try {
            const transaction = this.state.db.transaction([this.config.storeName], 'readwrite');
            const store = transaction.objectStore(this.config.storeName);
            
            await new Promise((resolve, reject) => {
                const request = store.delete(tokenKey);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
            
            console.log(`[EncryptedVault] 🗑️  Deleted token: ${tokenKey}`);
            return true;
        } catch (error) {
            console.error('[EncryptedVault] Failed to delete token:', error);
            return false;
        }
    },

    /**
     * List all stored token keys
     * @returns {Promise<Array<string>>}
     */
    async listTokens() {
        try {
            const transaction = this.state.db.transaction([this.config.storeName], 'readonly');
            const store = transaction.objectStore(this.config.storeName);
            
            const keys = await new Promise((resolve, reject) => {
                const request = store.getAllKeys();
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
            
            return keys;
        } catch (error) {
            console.error('[EncryptedVault] Failed to list tokens:', error);
            return [];
        }
    },

    /**
     * Clear all tokens
     */
    async clearAll() {
        try {
            const transaction = this.state.db.transaction([this.config.storeName], 'readwrite');
            const store = transaction.objectStore(this.config.storeName);
            
            await new Promise((resolve, reject) => {
                const request = store.clear();
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
            
            console.log('[EncryptedVault] 🧹 Cleared all tokens');
            return true;
        } catch (error) {
            console.error('[EncryptedVault] Failed to clear tokens:', error);
            return false;
        }
    },

    /**
     * Export vault (for backup)
     * Note: Exports encrypted data, still requires passphrase
     */
    async exportVault() {
        try {
            const transaction = this.state.db.transaction([this.config.storeName], 'readonly');
            const store = transaction.objectStore(this.config.storeName);
            
            const records = await new Promise((resolve, reject) => {
                const request = store.getAll();
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
            
            const exportData = {
                version: this.config.dbVersion,
                salt: Array.from(this.state.salt),
                records: records,
                exported: new Date().toISOString()
            };
            
            console.log('[EncryptedVault] 📦 Exported vault');
            return exportData;
        } catch (error) {
            console.error('[EncryptedVault] Failed to export vault:', error);
            return null;
        }
    },

    /**
     * Import vault (from backup)
     */
    async importVault(exportData) {
        try {
            // Validate export data
            if (!exportData.version || !exportData.salt || !exportData.records) {
                throw new Error('Invalid export data');
            }
            
            // Restore salt
            this.state.salt = new Uint8Array(exportData.salt);
            localStorage.setItem('sfti_vault_salt', JSON.stringify(exportData.salt));
            
            // Import records
            const transaction = this.state.db.transaction([this.config.storeName], 'readwrite');
            const store = transaction.objectStore(this.config.storeName);
            
            for (const record of exportData.records) {
                await new Promise((resolve, reject) => {
                    const request = store.put(record);
                    request.onsuccess = () => resolve();
                    request.onerror = () => reject(request.error);
                });
            }
            
            console.log('[EncryptedVault] 📥 Imported vault');
            return true;
        } catch (error) {
            console.error('[EncryptedVault] Failed to import vault:', error);
            return false;
        }
    }
};

// Auto-initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        EncryptedVault.init();
    });
} else {
    EncryptedVault.init();
}

// Export for use in other modules
window.EncryptedVault = EncryptedVault;
