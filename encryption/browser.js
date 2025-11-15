// Browser-compatible encryption module
class EncryptionModule {
    static async generateKeyPair() {
        const keyPair = await window.crypto.subtle.generateKey(
            {
                name: 'ECDH',
                namedCurve: 'P-256'
            },
            true,
            ['deriveKey']
        );

        const publicKey = await window.crypto.subtle.exportKey('raw', keyPair.publicKey);
        const privateKey = await window.crypto.subtle.exportKey('pkcs8', keyPair.privateKey);

        return {
            publicKey: Buffer.from(publicKey).toString('hex'),
            privateKey: Buffer.from(privateKey).toString('hex')
        };
    }

    static async deriveSharedSecret(privateKeyHex, publicKeyHex) {
        const privateKey = await window.crypto.subtle.importKey(
            'pkcs8',
            new Uint8Array(Buffer.from(privateKeyHex, 'hex')),
            { name: 'ECDH', namedCurve: 'P-256' },
            true,
            ['deriveKey']
        );

        const publicKey = await window.crypto.subtle.importKey(
            'raw',
            new Uint8Array(Buffer.from(publicKeyHex, 'hex')),
            { name: 'ECDH', namedCurve: 'P-256' },
            true,
            []
        );

        const sharedSecret = await window.crypto.subtle.deriveKey(
            { name: 'ECDH', public: publicKey },
            privateKey,
            { name: 'AES-GCM', length: 256 },
            true,
            ['encrypt', 'decrypt']
        );

        return sharedSecret;
    }

    static async encrypt(plaintext, secret) {
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const encoded = new TextEncoder().encode(plaintext);

        const ciphertext = await window.crypto.subtle.encrypt(
            { name: 'AES-GCM', iv: iv },
            secret,
            encoded
        );

        return {
            iv: Buffer.from(iv).toString('hex'),
            encrypted: Buffer.from(ciphertext).toString('hex'),
            authTag: '' // Not needed for AES-GCM in Web Crypto API
        };
    }

    static async decrypt(ciphertextObj, secret) {
        const { iv, encrypted } = ciphertextObj;
        const decrypted = await window.crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: new Uint8Array(Buffer.from(iv, 'hex')) },
            secret,
            new Uint8Array(Buffer.from(encrypted, 'hex'))
        );

        return new TextDecoder().decode(decrypted);
    }
}

export default EncryptionModule;