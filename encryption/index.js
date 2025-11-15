const crypto = require('crypto');

// Generate secp256k1 key pair
function generateKeyPair() {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
        namedCurve: 'secp256k1',
        publicKeyEncoding: {
            type: 'spki',
            format: 'der'
        },
        privateKeyEncoding: {
            type: 'pkcs8',
            format: 'der'
        }
    });

    return {
        publicKey: publicKey.toString('hex'),
        privateKey: privateKey.toString('hex')
    };
}

// Derive shared secret using ECDH
function deriveSharedSecret(privateKeyHex, publicKeyHex) {
    const privateKey = crypto.createPrivateKey({
        key: Buffer.from(privateKeyHex, 'hex'),
        type: 'pkcs8',
        format: 'der'
    });

    const publicKey = crypto.createPublicKey({
        key: Buffer.from(publicKeyHex, 'hex'),
        type: 'spki',
        format: 'der'
    });

    const ecdh = crypto.createECDH('secp256k1');
    ecdh.setPrivateKey(privateKey.export({ type: 'pkcs8', format: 'der' }));

    const sharedSecret = ecdh.computeSecret(publicKey.export({ type: 'spki', format: 'der' }));
    
    // Derive a 256-bit key using SHA256
    return crypto.createHash('sha256').update(sharedSecret).digest();
}

// Encrypt using AES-256-GCM
function encrypt(plaintext, secret) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-gcm', secret);
    cipher.setAAD(Buffer.from('prediction-market'));
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
        iv: iv.toString('hex'),
        encrypted: encrypted,
        authTag: authTag.toString('hex')
    };
}

// Decrypt using AES-256-GCM
function decrypt(ciphertextObj, secret) {
    const { iv, encrypted, authTag } = ciphertextObj;
    const decipher = crypto.createDecipher('aes-256-gcm', secret);
    decipher.setAAD(Buffer.from('prediction-market'));
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
}

module.exports = {
    generateKeyPair,
    deriveSharedSecret,
    encrypt,
    decrypt
};