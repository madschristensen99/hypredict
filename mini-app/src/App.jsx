import React, { useState, useEffect } from 'react'
import WebApp from '@twa-dev/sdk'
import MarketView from './components/MarketView'
import PredictionForm from './components/PredictionForm'
import { handleDecryptMarket, handlePrediction } from './utils/encryption'

function App() {
  const [user, setUser] = useState(null)
  const [market, setMarket] = useState(null)
  const [marketId, setMarketId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [action, setAction] = useState('view')

  useEffect(() => {
    // Initialize WebApp
    WebApp.ready()
    WebApp.isClosingConfirmationEnabled = true

    // Get user info
    setUser(WebApp.initDataUnsafe.user)

    // Extract market ID from URL
    const urlParams = new URLSearchParams(window.location.search)
    const startParam = urlParams.get('startapp') || urlParams.get('start_param')
    const tgWebAppStartParam = WebApp.initDataUnsafe.start_param
    
    const targetMarketId = startParam || tgWebAppStartParam
    
    if (targetMarketId) {
      setMarketId(targetMarketId)
      loadMarket(targetMarketId)
    } else {
      setLoading(false)
      setAction('create') // Show create market form if no market ID
    }
  }, [])

  const loadMarket = async (id) => {
    try {
      setLoading(true)
      
      const authData = WebApp.initData
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/markets/${id}?auth=${encodeURIComponent(authData)}`)
      
      if (!response.ok) throw new Error('Market not found')
      
      const data = await response.json()
      const decrypted = await handleDecryptMarket(data.encrypted_blob, WebApp.initDataUnsafe.user.id)
      
      setMarket(decrypted)
    } catch (error) {
      console.error('Error loading market:', error)
    } finally {
      setLoading(false)
    }
  }

  const createMarket = async (question) => {
    try {
      setLoading(true)
      
      const authData = WebApp.initData
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/market/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          userId: user.id,
          groupId: 0 // For individual creation
        })
      })
      
      if (!response.ok) throw new Error('Failed to create')
      
      const result = await response.json()
      
      // Navigate to the newly created market
      window.location.href = result.miniAppUrl
    } catch (error) {
      console.error('Error creating market:', error)
      alert('Error creating market')
    } finally {
      setLoading(false)
    }
  }

  const submitPrediction = async (choice) => {
    try {
      setLoading(true)
      
      const authData = WebApp.initData
      const success = await handlePrediction(marketId, choice, user.id, authData)
      
      if (success) {
        setAction('view')
        loadMarket(marketId) // Reload to show updated state
      }
    } catch (error) {
      console.error('Error submitting prediction:', error)
    } finally {
      setLoading(false)
    }
  }

  const goBack = () => {
    if (window.history.length > 1) {
      window.history.back()
    } else {
      WebApp.close()
    }
  }

  if (loading) {
    return (
      <div className="app">
        <div className="loading">Loading...</div>
      </div>
    )
  }

  return (
    <div className="app">
      <div className="app-header">
        <h1>🔮 Encrypted Prediction Market</h1>
        {user && <div>Welcome, {user.first_name || 'User'}</div>}
      </div>

      {action === 'view' && market ? (
        <MarketView 
          market={market} 
          marketId={marketId}
          onMakePrediction={() => setAction('predict')}
          onBack={goBack}
        />
      ) : action === 'predict' && market ? (
        <PredictionForm
          market={market}
          marketId={marketId}
          onSubmit={submitPrediction}
          onBack={() => setAction('view')}
        />
      ) : (
        <div>
          <h2>Create New Market</h2>
          <input
            type="text"
            placeholder="Enter your prediction question..."
            onKeyPress={(e) => {
              if (e.key === 'Enter' && e.target.value.trim()) {
                createMarket(e.target.value)
              }
            }}
            style={{
              width: '100%',
              padding: '10px',
              margin: '10px 0',
              border: '1px solid #ddd',
              borderRadius: '5px'
            }}
          />
          <p className="encryption-note">
            Questions and predictions are encrypted client-side
          </p>
        </div>
      )}
    </div>
  )
}

export default App