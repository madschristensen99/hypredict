import React, { useState, useEffect } from 'react'

export default function MarketView({ market, marketId, onMakePrediction, onBack }) {
  const [userKeys, setUserKeys] = useState(null)
  const [userPositions, setUserPositions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadKeys()
    loadPositions()
  }, [])

  const loadKeys = () => {
    const keys = localStorage.getItem('predictionKeys')
    if (keys) {
      setUserKeys(JSON.parse(keys))
    }
  }

  const loadPositions = async () => {
    try {
      const WebApp = await import('@twa-dev/sdk')
      const authData = WebApp.default.initData
      
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/positions/${user?.id || 0}?auth=${encodeURIComponent(authData)}`
      )
      
      if (response.ok) {
        const positions = await response.json()
        setUserPositions(positions)
      }
    } catch (error) {
      console.error('Error loading positions:', error)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    alert('Market ID copied to clipboard!')
  }

  const shareMarket = () => {
    if (window.Telegram?.WebApp) {
      const url = window.location.href
      const encoded = encodeURIComponent(`Check out this prediction: ${market.question}\n${url}`)
      window.open(`tg://msg_url?url=${encoded}`, '_blank')
    } else {
      if (navigator.share) {
        navigator.share({
          title: 'Encrypted Prediction Market',
          text: market.question,
          url: window.location.href
        })
      }
    }
  }

  const hasPrediction = () => {
    return userPositions.some(p => p.marketId === marketId)
  }

  return (
    <div>
      <div className="market-card">
        <div className="market-question">
          {market.question}
        </div>
        
        <div className="market-info">
          <div style={{ marginBottom: '10px', fontSize: '14px', color: '#666' }}>
            Market ID: <code>{marketId}</code>
          </div>
          
          {market.creator && (
            <div style={{ marginBottom: '15px', fontSize: '14px', color: '#666' }}>
              Created by: User {market.creator}
            </div>
          )}
          
          <div style={{ marginBottom: '15px', fontSize: '14px', color: '#666' }}>
            Status: <span style={{ color: '#28a745' }}>Active</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
          <button 
            className="choice-btn"
            style={{ opacity: 0.7, cursor: 'not-allowed' }}
            disabled
          >
            YES
          </button>
          <button 
            className="choice-btn"
            style={{ opacity: 0.7, cursor: 'not-allowed' }}
            disabled
          >
            NO
          </button>
        </div>
      </div>

      {loading && <div className="loading">Loading prediction...</div>}
      
      {!hasPrediction() && (
        <button 
          className="submit-btn"
          onClick={onMakePrediction}
        >
          Make Prediction
        </button>
      )}
      
      {hasPrediction() && (
        <div className="success">
          ✅ You have already placed a prediction on this market
        </div>
      )}

      <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
        <button 
          className="choice-btn"
          onClick={shareMarket}
          style={{ background: '#f8f9fa' }}
        >
          Share 📤
        </button>
        <button 
          className="choice-btn"
          onClick={() => copyToClipboard(marketId)}
          style={{ background: '#f8f9fa' }}
        >
          Copy ID 📋
        </button>
      </div>

      <button 
        onClick={onBack}
        className="choice-btn"
        style={{ 
          width: '100%', 
          marginTop: '10px', 
          background: '#6c757d', 
          color: 'white' 
        }}
      >
        Back
      </button>

      <p className="encryption-note">
        All predictions are encrypted client-side and completely anonymous
      </p>
    </div>
  )
}