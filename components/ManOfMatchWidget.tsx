// components/ManOfMatchWidget.tsx - Version compacte et moderne
import { useState, useEffect } from 'react'
import { Trophy, Star, Users, Eye, EyeOff, MessageCircle, Crown, Award, Medal, ChevronDown, ChevronUp, X } from 'lucide-react'
import axios from 'axios'

interface ManOfMatchWidgetProps {
  matchId: string
  homeTeam: string
  awayTeam: string
  sport: 'FOOTBALL' | 'BASKETBALL' | 'RUGBY' | 'MMA' | 'F1'
  players: Array<{
    id: string
    name: string
    position?: string
    number?: number
    team: string
  }>
  currentUserId?: string
}

interface Vote {
  id: string
  userId: string
  playerId: string
  comment?: string
  createdAt: string
  user: {
    id: string
    name?: string
    username?: string
    image?: string
  }
  player: {
    id: string
    name: string
    position?: string
    number?: number
    team: string
  }
}

interface PlayerVoteStats {
  player: {
    id: string
    name: string
    position?: string
    number?: number
    team: string
  }
  votes: Vote[]
  count: number
  percentage: number
  recentVoters?: Array<{
    id: string
    name?: string
    username?: string
  }>
}

export default function ManOfMatchWidget({ 
  matchId, 
  homeTeam, 
  awayTeam, 
  sport,
  players, 
  currentUserId 
}: ManOfMatchWidgetProps) {
  const [loading, setLoading] = useState(true)
  const [voting, setVoting] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [showVoteModal, setShowVoteModal] = useState(false)
  const [selectedPlayer, setSelectedPlayer] = useState<string>('')
  const [comment, setComment] = useState('')
  const [expanded, setExpanded] = useState(false)
  
  // States pour les données
  const [votes, setVotes] = useState<Vote[]>([])
  const [playerVotes, setPlayerVotes] = useState<Record<string, PlayerVoteStats>>({})
  const [userVote, setUserVote] = useState<Vote | null>(null)
  const [stats, setStats] = useState<{
    totalVotes: number
    uniquePlayers: number
    leader: PlayerVoteStats | null
    topThree: PlayerVoteStats[]
  } | null>(null)

  useEffect(() => {
    if (matchId) {
      fetchVotes()
    }
  }, [matchId, showComments])

  const fetchVotes = async () => {
    try {
      setLoading(true)
      const response = await axios.get(`/api/man-of-match?matchId=${matchId}&includeComments=${showComments}`)
      
      if (response.data.success) {
        setVotes(response.data.votes || [])
        setPlayerVotes(response.data.playerVotes || {})
        setUserVote(response.data.userVote || null)
        setStats(response.data.stats || null)
      }
    } catch (error) {
      console.error('Erreur chargement votes:', error)
    } finally {
      setLoading(false)
    }
  }

  const submitVote = async () => {
    if (!selectedPlayer) return

    try {
      setVoting(true)
      
      // Trouver les données du joueur sélectionné
      const selectedPlayerData = players.find(p => p.id === selectedPlayer)
      
      if (!selectedPlayerData) {
        showNotification('error', 'Joueur non trouvé dans la liste')
        return
      }
      
      const response = await axios.post('/api/man-of-match', {
        playerId: selectedPlayer,
        playerData: {
          name: selectedPlayerData.name,
          position: selectedPlayerData.position,
          number: selectedPlayerData.number,
          team: selectedPlayerData.team,
          sport: sport
        },
        matchId,
        comment: comment.trim() || null
      })

      if (response.data.success) {
        // Notification de succès avec animation
        showNotification('success', response.data.message)
        
        // Réinitialiser le formulaire
        setShowVoteModal(false)
        setSelectedPlayer('')
        setComment('')
        
        // Recharger les votes
        await fetchVotes()
      }
    } catch (error: any) {
      console.error('Erreur vote:', error)
      showNotification('error', error.response?.data?.error || 'Erreur lors du vote')
    } finally {
      setVoting(false)
    }
  }

  const deleteVote = async () => {
    try {
      const response = await axios.delete(`/api/man-of-match?matchId=${matchId}`)
      
      if (response.data.success) {
        showNotification('success', 'Vote supprimé')
        await fetchVotes()
      }
    } catch (error: any) {
      console.error('Erreur suppression vote:', error)
      showNotification('error', error.response?.data?.error || 'Erreur lors de la suppression')
    }
  }

  const showNotification = (type: 'success' | 'error', message: string) => {
    // Notification compacte
    const notification = document.createElement('div')
    notification.className = `fixed top-4 left-4 right-4 md:top-4 md:left-auto md:right-4 md:max-w-sm px-4 py-3 rounded-xl shadow-xl z-50 transform translate-y-[-60px] transition-all duration-400 ${
      type === 'success' 
        ? 'bg-green-500 text-white' 
        : 'bg-red-500 text-white'
    }`
    
    notification.innerHTML = `
      <div class="flex items-center space-x-2">
        <span class="text-lg">${type === 'success' ? '✅' : '❌'}</span>
        <span class="font-medium text-sm">${message}</span>
      </div>
    `
    
    document.body.appendChild(notification)
    
    // Animation d'entrée
    setTimeout(() => {
      notification.style.transform = 'translate-y-0'
    }, 100)
    
    // Animation de sortie
    setTimeout(() => {
      notification.style.transform = 'translate-y-[-60px]'
      notification.style.opacity = '0'
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification)
        }
      }, 400)
    }, 3000)
  }

  const getSportEmoji = () => {
    const emojis = {
      'FOOTBALL': '⚽',
      'BASKETBALL': '🏀',
      'RUGBY': '🏉',
      'MMA': '🥊',
      'F1': '🏎️'
    }
    return emojis[sport] || '🏆'
  }

  const getSportTitle = () => {
    const titles = {
      'FOOTBALL': 'Homme du Match',
      'BASKETBALL': 'MVP du Match',
      'RUGBY': 'Homme du Match',
      'MMA': 'Fighter of the Night',
      'F1': 'Driver of the Day'
    }
    return titles[sport] || 'Joueur du Match'
  }

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0: return <Crown className="w-4 h-4 text-yellow-500" />
      case 1: return <Award className="w-4 h-4 text-gray-400" />
      case 2: return <Medal className="w-4 h-4 text-orange-500" />
      default: return <span className="text-xs font-bold text-gray-600">#{index + 1}</span>
    }
  }

  const getRankGradient = (index: number) => {
    switch (index) {
      case 0: return 'from-yellow-400 to-amber-500'
      case 1: return 'from-gray-300 to-slate-500'
      case 2: return 'from-orange-400 to-red-500'
      default: return 'from-blue-400 to-indigo-500'
    }
  }

  // Filtrer uniquement les joueurs (pas les coachs)
  const eligiblePlayers = players.filter(p => p.position !== 'COACH')

  if (loading) {
    return (
      <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 p-4">
        <div className="animate-pulse space-y-3">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gray-200 rounded-lg"></div>
            <div className="flex-1 space-y-1">
              <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              <div className="h-2 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (eligiblePlayers.length === 0) {
    return (
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 text-center">
        <Trophy className="w-6 h-6 text-gray-400 mx-auto mb-2" />
        <p className="text-gray-600 text-sm">Aucun joueur éligible</p>
      </div>
    )
  }

  return (
    <>
      {/* Widget principal - VERSION COMPACTE */}
      <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl shadow-lg border border-yellow-200/50 overflow-hidden">
        {/* Header compact mais moderne */}
        <div className="bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 p-4 text-white relative overflow-hidden">
          {/* Background pattern moderne */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-1 right-1 w-16 h-16 rounded-full bg-white/30 blur-xl"></div>
            <div className="absolute bottom-1 left-1 w-12 h-12 rounded-full bg-white/20 blur-lg"></div>
          </div>
          
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/30 shadow-lg">
                <Trophy className="w-5 h-5 text-white drop-shadow-sm" />
              </div>
              <div>
                <h4 className="font-black text-base flex items-center space-x-2 tracking-tight">
                  <span className="text-lg">{getSportEmoji()}</span>
                  <span className="bg-gradient-to-r from-white to-yellow-100 bg-clip-text text-transparent">
                    {getSportTitle()}
                  </span>
                </h4>
                <p className="text-white/90 text-sm font-medium">Qui a été le meilleur ?</p>
              </div>
            </div>
            
            {/* Stats en header - moderne */}
            {stats && stats.totalVotes > 0 && (
              <div className="flex items-center space-x-4">
                <div className="text-center bg-white/15 backdrop-blur-sm rounded-xl px-3 py-2 border border-white/20">
                  <div className="font-black text-lg">{stats.totalVotes}</div>
                  <div className="text-white/80 text-xs font-semibold uppercase tracking-wider">votes</div>
                </div>
                <button
                  onClick={() => setShowComments(!showComments)}
                  className="bg-white/15 backdrop-blur-sm p-2.5 rounded-xl hover:bg-white/25 transition-all duration-300 border border-white/20 group shadow-lg"
                >
                  {showComments ? (
                    <Eye className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  ) : (
                    <EyeOff className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Leader actuel - moderne et compact */}
          {stats && stats.leader && (
            <div className="bg-gradient-to-r from-yellow-100 via-yellow-50 to-orange-100 rounded-2xl p-4 border border-yellow-200/50 relative overflow-hidden shadow-md">
              {/* Accent moderne */}
              <div className="absolute top-2 right-2">
                <span className="text-xl animate-pulse"></span>
              </div>
              
              <div className="flex items-center space-x-4 relative z-10">
                <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 via-yellow-500 to-amber-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <Crown className="w-6 h-6 text-white drop-shadow-md" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <h5 className="font-black text-gray-900 text-base truncate tracking-tight">{stats.leader.player.name}</h5>
                    <span className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-2.5 py-1 rounded-full text-xs font-black shadow-sm">
                      👑 LEADER
                    </span>
                  </div>
                  <p className="text-gray-700 text-sm font-semibold">{stats.leader.player.position} • {stats.leader.player.team}</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
                    {stats.leader.count}
                  </div>
                  <div className="text-sm text-gray-600 font-bold">{stats.leader.percentage}%</div>
                </div>
              </div>
            </div>
          )}

          {/* Bouton de vote - compact */}
          {currentUserId && (
            <div>
              {userVote ? (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-4 border border-green-200 relative overflow-hidden shadow-md">
                  <div className="absolute top-2 right-2">
                    <span className="text-lg text-green-500">✅</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl flex items-center justify-center shadow-lg">
                        <span className="text-white font-black text-lg">✓</span>
                      </div>
                      <div>
                        <span className="font-black text-green-800 text-base tracking-tight">{userVote.player.name}</span>
                        <p className="text-green-700 text-sm font-semibold">{userVote.player.position}</p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setShowVoteModal(true)}
                        className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-3 py-2 rounded-xl text-sm font-bold hover:from-green-600 hover:to-emerald-700 transition-all shadow-md hover:shadow-lg transform hover:scale-105"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={deleteVote}
                        className="bg-gradient-to-r from-red-500 to-pink-600 text-white px-3 py-2 rounded-xl text-sm font-bold hover:from-red-600 hover:to-pink-700 transition-all shadow-md hover:shadow-lg transform hover:scale-105"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowVoteModal(true)}
                  className="w-full bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 text-white py-3 px-6 rounded-2xl font-black text-base hover:from-yellow-600 hover:via-orange-600 hover:to-red-600 transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:scale-105 relative overflow-hidden group"
                >
                  {/* Animation background */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                  
                  <div className="relative z-10 flex items-center justify-center space-x-3">
                    <span className="text-xl">🗳️</span>
                    <span className="tracking-tight">Voter pour l'{getSportTitle().toLowerCase()}</span>
                    <span className="text-lg animate-pulse">✨</span>
                  </div>
                </button>
              )}
            </div>
          )}

          {/* Classement - compact */}
          {stats && stats.topThree && stats.topThree.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h5 className="font-black text-gray-800 text-base flex items-center space-x-2 tracking-tight">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  <span className="bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">Classement</span>
                </h5>
                {stats.topThree.length > 3 && (
                  <button
                    onClick={() => setExpanded(!expanded)}
                    className="bg-gray-100 hover:bg-gray-200 p-2 rounded-xl transition-colors border border-gray-200"
                  >
                    {expanded ? <ChevronUp className="w-4 h-4 text-gray-600" /> : <ChevronDown className="w-4 h-4 text-gray-600" />}
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {stats.topThree.slice(0, expanded ? stats.topThree.length : 3).map((playerStats: PlayerVoteStats, index: number) => (
                  <div key={`ranking-${playerStats.player.id}-${index}`} className="group">
                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all duration-300 transform hover:scale-102">
                      <div className="flex items-center space-x-4">
                        {/* Rank badge - moderne */}
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-lg bg-gradient-to-br ${getRankGradient(index)}`}>
                          {getRankIcon(index)}
                        </div>
                        
                        {/* Player info - typographie moderne */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="font-black text-gray-900 text-base truncate tracking-tight">{playerStats.player.name}</span>
                            {index === 0 && stats.totalVotes > 2 && (
                              <span className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-2 py-1 rounded-full text-xs font-black animate-pulse shadow-md">
                                🔥 EN TÊTE
                              </span>
                            )}
                          </div>
                          <div className="text-gray-600 text-sm font-semibold">
                            {playerStats.player.position} • {playerStats.player.team}
                          </div>
                        </div>
                        
                        {/* Stats - design moderne */}
                        <div className="text-right">
                          <div className="text-2xl font-black text-gray-900">{playerStats.count}</div>
                          <div className="text-sm text-gray-600 font-bold">{playerStats.percentage}%</div>
                          
                          {/* Progress bar moderne */}
                          <div className="w-16 h-2 bg-gray-200 rounded-full mt-2 overflow-hidden">
                            <div 
                              className={`h-full bg-gradient-to-r ${getRankGradient(index)} transition-all duration-1000 ease-out rounded-full`}
                              style={{ width: `${playerStats.percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* État vide - moderne et compact */}
          {(!stats || stats.totalVotes === 0) && (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-gradient-to-br from-yellow-200 via-yellow-300 to-orange-400 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg animate-pulse">
                <Trophy className="w-8 h-8 text-yellow-700" />
              </div>
              <h6 className="text-yellow-800 font-black text-lg mb-2 tracking-tight">Aucun vote</h6>
              <p className="text-yellow-600 text-sm font-semibold max-w-xs mx-auto">Soyez le premier à voter et lancez le débat ! 🚀</p>
            </div>
          )}

          {/* Commentaires section - compact */}
          {showComments && expanded && stats && stats.totalVotes > 0 && (
            <div className="pt-3 border-t border-yellow-200">
              <h6 className="font-semibold text-gray-800 text-sm mb-2 flex items-center space-x-2">
                <MessageCircle className="w-4 h-4 text-orange-500" />
                <span>Avis ({votes.filter(v => v.comment).length})</span>
              </h6>
              
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {votes
                  .filter(vote => vote.comment && vote.comment.trim())
                  .slice(0, 5)
                  .map(vote => (
                    <div key={vote.id} className="bg-white/70 rounded-lg p-2 border border-gray-100">
                      <div className="flex items-start justify-between mb-1">
                        <div className="flex items-center space-x-2">
                          <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                            {(vote.user.name || 'A')[0].toUpperCase()}
                          </div>
                          <span className="font-medium text-gray-900 text-xs">
                            {vote.user.name || 'Anonyme'} → {vote.player.name}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(vote.createdAt).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                      <p className="text-gray-700 italic text-xs">"{vote.comment}"</p>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de vote - taille optimisée */}
      {showVoteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[85vh] overflow-hidden shadow-xl">
            {/* Header modal - moderne */}
            <div className="bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 p-5 text-white relative overflow-hidden">
              <div className="absolute inset-0 opacity-20">
                <div className="absolute top-1 right-1 w-16 h-16 rounded-full bg-white/30 blur-xl"></div>
              </div>
              
              <div className="relative z-10 flex items-center justify-between">
                <div>
                  <h3 className="font-black text-xl tracking-tight flex items-center space-x-2">
                    <span className="text-2xl">{getSportEmoji()}</span>
                    <span className="bg-gradient-to-r from-white to-yellow-100 bg-clip-text text-transparent">Voter</span>
                  </h3>
                  <p className="text-white/90 text-sm font-semibold">Choisissez le meilleur joueur</p>
                </div>
                <button
                  onClick={() => setShowVoteModal(false)}
                  className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center hover:bg-white/30 transition-all duration-300 border border-white/30 group shadow-lg"
                >
                  <X className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                </button>
              </div>
            </div>

            {/* Contenu modal - compact */}
            <div className="p-4 space-y-4 max-h-[50vh] overflow-y-auto">
              {/* Sélection du joueur - compact */}
              <div>
                <label className="block font-semibold text-gray-800 mb-2 text-sm">
                  Choisissez le joueur :
                </label>
                
                <div className="space-y-3">
                  {[homeTeam, awayTeam].map((team, teamIndex) => {
                    const teamPlayers = eligiblePlayers.filter(p => p.team === team)
                    if (teamPlayers.length === 0) return null
                    
                    return (
                      <div key={`team-${teamIndex}-${team}`}>
                        <h4 className="text-xs font-medium text-gray-600 mb-1 px-1">
                          {team} ({teamPlayers.length})
                        </h4>
                        
                        <div className="space-y-1">
                          {teamPlayers.map((player, playerIndex) => (
                            <label
                              key={`player-${teamIndex}-${playerIndex}-${player.id}`}
                              className={`block cursor-pointer rounded-lg border transition-all ${
                                selectedPlayer === player.id
                                  ? 'border-yellow-500 bg-yellow-50'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <input
                                type="radio"
                                name="player"
                                value={player.id}
                                checked={selectedPlayer === player.id}
                                onChange={(e) => setSelectedPlayer(e.target.value)}
                                className="sr-only"
                              />
                              
                              <div className="p-2.5 flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs ${
                                    selectedPlayer === player.id
                                      ? 'bg-yellow-500'
                                      : teamIndex === 0 ? 'bg-blue-500' : 'bg-red-500'
                                  }`}>
                                    {player.number || player.name[0]}
                                  </div>
                                  <div>
                                    <div className="font-medium text-gray-900 text-sm">{player.name}</div>
                                    <div className="text-gray-600 text-xs">
                                      {player.position}{player.number && ` • #${player.number}`}
                                    </div>
                                  </div>
                                </div>
                                
                                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                  selectedPlayer === player.id
                                    ? 'border-yellow-500 bg-yellow-500'
                                    : 'border-gray-300'
                                }`}>
                                  {selectedPlayer === player.id && (
                                    <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                                  )}
                                </div>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Commentaire - compact */}
              <div>
                <label className="block font-semibold text-gray-800 mb-2 text-sm">
                  💭 Commentaire (optionnel)
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-sm resize-none"
                  rows={2}
                  placeholder="Pourquoi ce choix ?"
                  maxLength={150}
                />
                <div className="text-xs text-gray-500 mt-1 text-right">
                  {comment.length}/150
                </div>
              </div>
            </div>

            {/* Footer modal - compact */}
            <div className="p-4 bg-gray-50 border-t">
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowVoteModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 text-sm"
                >
                  Annuler
                </button>
                <button
                  onClick={submitVote}
                  disabled={!selectedPlayer || voting}
                  className={`flex-1 px-4 py-2 rounded-lg font-semibold text-sm ${
                    selectedPlayer && !voting
                      ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white hover:from-yellow-600 hover:to-orange-600'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {voting ? 'Envoi...' : '🗳️ Voter'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}