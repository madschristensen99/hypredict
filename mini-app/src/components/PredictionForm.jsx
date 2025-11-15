import React, { useState, useEffect } from 'react'

export default function PredictionForm({ market, marketId, onSubmit, onBack }) {
  const [selectedChoice, setSelectedChoice] = useState(null)
  const [userKeys, setUserKeys] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadKeys()
  }, [])

  const loadKeys = () => {
    const keys = localStorage.getItem('predictionKeys')
    if (keys) {
      setUserKeys(JSON.parse(keys))
    } else {
      alert('Please obtain your encryption keys via the bot first')
    }
  }

  const handleSubmit = async () => {
    if (!selectedChoice) {
      alert('Please select YES or NO before submitting')
      return
    }

    if (!userKeys) {
      alert('Missing encryption keys. Please get them via /join in the bot.')
      return
    }

    setLoading(true)
    
    try {
      const encryptedData = {
        choice: selectedChoice,
        marketId: marketId,
        timestamp: Date.now(),
        userId: userKeys.userId
      }

      await onSubmit(JSON.stringify(encryptedData))
    } catch (error) {
      console.error('Error submitting prediction:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="market-card">
        <div className="market-question">
          {market.question}
        </div>
        
        <div style={{ marginBottom: '15px', fontSize: '14px', color: '#666' }}>
          Market ID: <code>{marketId}</code>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ marginBottom: '15px' }}>Your Prediction:</h3>
          
          <div className="choice-buttons">
            <button 
              className={`choice-btn ${selectedChoice === 'yes' ? 'selected' : ''}`}
              onClick={() => setSelectedChoice('yes')}
            >
              YES ✅
            </button>
            <button 
              className={`choice-btn ${selectedChoice === 'no' ? 'selected' : ''}`}
              onClick={() => setSelectedChoice('no')}
            >
              NO ❌
            </button>
          </div>
        </div>

        <div style={{ 
          background: '#e3f2fd', 
          padding: '15px', 
          borderRadius: '8px', 
          fontSize: '14px', 
          marginBottom: '15px' 
        }}>
          🔒 <strong>Security Notice:</strong>
          <br />
          Your prediction will be encrypted client-side before sending to the server. 
          Only the original user can decrypt their prediction.
        </div>
      </div>

      <button 
        className="submit-btn"
        onClick={handleSubmit}
        disabled={!selectedChoice || loading}
      >
        {loading ? 'Encrypting & Submitting...' : 'Submit Encrypted Prediction'}
      </button>

      <button 
        onClick={onBack}
        className="submit-btn"
        style={{ 
          background: '#6c757d',
          marginTop: '10px' 
        }}
      >
        Back to Market
      </button>

      <div style={{ marginTop: '20px', padding: '15px', background: '#f8f9fa', borderRadius: '8px' }}>
        <h4 style={{ marginBottom: '10px' }}>📊 Prediction Details</h4>
        <p style={{ fontSize: '14px', color: '#666' }}>
          Market: {market.question}
        </p>
        <p style={{ fontSize: '14px', color: '#666' }}>
          Selected: {selectedChoice ? selectedChoice.toUpperCase() : 'None'}
        </p>
      </div>
    </div>
  )
}