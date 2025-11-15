import { Buffer } from 'buffer'
window.Buffer = Buffer

// Encryption utilities for client-side
export async function handleDecryptMarket(encryptedData, userId) {
  try {
    const keys = localStorage.getItem('predictionKeys')
    if (!keys) {
      throw new Error('No encryption keys found')
    }

    const parsedKeys = JSON.parse(keys)
    
    // In a real implementation, this would decrypt using ECDH shared secret
    // For demo purposes, we'll parse the non-encrypted data
    try {
      return JSON.parse(encryptedData)
    } catch {
      return { question: encryptedData, creator: userId }
    }
  } catch (error) {
    console.error('Decryption error:', error)
    return null
  }
}

export async function handlePrediction(marketId, choice, userId, authData) {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/prediction`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'tma ' + authData
      },
      body: JSON.stringify({
        marketId,
        encryptedData: choice // In real implementation, this would be encrypted
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to submit prediction')
    }

    const result = await response.json()
    
    alert('✅ Prediction submitted successfully!\n\nHash: ' + result.txHash.substring(0, 16) + '...')
    
    return true
  } catch (error) {
    console.error('Prediction submission error:', error)
    alert('Error: ' + error.message)
    return false
  }
}

// Generate Web Crypto API key pair (browser-compatible)
export async function generateEncryptionKeys() {
  try {
    // Generate ECDH key pair
    const keyPair = await crypto.subtle.generateKey(
      {
        name: 'ECDH',
        namedCurve: 'P-256'
      },
      true,
      ['deriveKey']
    )

    const publicKey = await crypto.subtle.exportKey('raw', keyPair.publicKey)
    const privateKey = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey)

    return {
      publicKey: Buffer.from(publicKey).toString('hex'),
      privateKey: Buffer.from(privateKey).toString('hex')
    }
  } catch (error) {
    console.error('Key generation error:', error)
    return null
  }
}

// AES-GCM encryption
export async function encryptData(data, sharedSecret) {
  const encoder = new TextEncoder()
  const dataBuffer = encoder.encode(JSON.stringify(data))
  
  const iv = crypto.getRandomValues(new Uint8Array(12))
  
  const encrypted = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv
    },
    sharedSecret,
    dataBuffer
  )

  return {
    iv: Buffer.from(iv).toString('hex'),
    data: Buffer.from(encrypted).toString('hex')
  }
}

// AES-GCM decryption
export async function decryptData(encryptedData, sharedSecret) {
  try {
    const decoder = new TextDecoder()
    const { iv, data } = JSON.parse(encryptedData)
    
    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: new Uint8Array(Buffer.from(iv, 'hex'))
      },
      sharedSecret,
      new Uint8Array(Buffer.from(data, 'hex'))
    )

    return JSON.parse(decoder.decode(decrypted))
  } catch (error) {
    console.error('Decryption error:', error)
    return null
  }
}

// ECDH shared secret derivation
export async function deriveSharedSecret(privateKeyHex, publicKeyHex) {
  try {
    const privateKey = await crypto.subtle.importKey(
      'pkcs8',
      new Uint8Array(Buffer.from(privateKeyHex, 'hex')),
      { name: 'ECDH', namedCurve: 'P-256' },
      true,
      ['deriveKey']
    )

    const publicKey = await crypto.subtle.importKey(
      'raw',
      new Uint8Array(Buffer.from(publicKeyHex, 'hex')),
      { name: 'ECDH', namedCurve: 'P-256' },
      true,
      []
    )

    return await crypto.subtle.deriveKey(
      { name: 'ECDH', public: publicKey },
      privateKey,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    )
  } catch (error) {
    console.error('Secret derivation error:', error)
    return null
  }
}

// WebSocket connection for real-time updates
export function setupWebSocket(userId) {
  const ws = new WebSocket(
    `${import.meta.env.VITE_WS_URL || 'ws://localhost:3000'}/ws?auth=${encodeURIComponent(window.Telegram.WebApp.initData)}`
  )

  ws.onopen = () => {
    console.log('WebSocket connected for user:', userId)
    ws.send(JSON.stringify({ type: 'subscribe', userId }))
  }

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data)
    console.log('WebSocket message:', data)
    
    if (data.type === 'market_update') {
      // Handle market updates
      console.log('Market updated:', data.marketId)
    }
  }

  ws.onclose = () => {
    console.log('WebSocket disconnected')
  }

  ws.onerror = (error) => {
    console.error('WebSocket error:', error)
  }

  return ws
}