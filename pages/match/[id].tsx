// pages/match/[id].tsx - VERSION AVEC BOUTON RETOUR CORRIGÉ POUR MOBILE
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import {
  ArrowLeft, Clock, MapPin, Users, Star,
  Target, AlertTriangle, RefreshCw, UserCheck,
  BarChart3, Activity, Trophy, Flag, Eye, EyeOff, Car
} from 'lucide-react'
import axios from 'axios'
import FootballMatchDetails from '../../components/FootballMatchDetails'
import BasketballMatchDetails from '../../components/BasketballMatchDetails'
import F1MatchDetails from '../../components/F1MatchDetails'
import MatchReviews from '../../components/MatchReviews'

interface MatchData {
  id: string
  sport: 'FOOTBALL' | 'BASKETBALL' | 'MMA' | 'RUGBY' | 'F1'
  homeTeam: string
  awayTeam: string
  homeScore: number | null
  awayScore: number | null
  date: string
  venue: string
  referee: string
  attendance?: number
  competition: string
  homeTeamLogo?: string
  awayTeamLogo?: string
  details?: any
}

interface MatchDetailsResponse {
  success: boolean
  data: {
    match: MatchData
    events: Array<{
      minute: number
      type: string
      team: string
      player: string
      detail?: string
      assist?: string
    }>
    lineups: {
      home: any
      away: any
    }
    statistics: {
      home: Record<string, any>
      away: Record<string, any>
    }
  }
  ratings: any[]
  avgRating: number
  totalRatings: number
}

interface PlayerRating {
  id: string
  userId: string
  playerId: string
  rating: number
  comment?: string
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

export default function MatchDetailsPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const { id } = router.query
  
  const [matchData, setMatchData] = useState<MatchDetailsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [userRating, setUserRating] = useState<number>(0)
  const [comment, setComment] = useState('')
  const [playerRatings, setPlayerRatings] = useState<PlayerRating[]>([])

  useEffect(() => {
    if (id) {
      fetchMatchDetails()
    }
  }, [id])

  const fetchMatchDetails = async () => {
    try {
      setLoading(true)
      const response = await axios.get(`/api/match-details/${id}`)
      
      if (response.data.success) {
        setMatchData(response.data)
        
        // Récupérer les notations des joueurs/pilotes
        try {
          const ratingsResponse = await axios.get(`/api/player-ratings?matchId=${id}`)
          setPlayerRatings(ratingsResponse.data.ratings || [])
        } catch (error) {
          console.error('Erreur chargement player ratings:', error)
          setPlayerRatings([])
        }
        
        // Vérifier si l'utilisateur a déjà noté le match
        const existingRating = response.data.ratings?.find(
          (r: any) => r.user.id === session?.user?.id
        )
        if (existingRating) {
          setUserRating(existingRating.rating)
          setComment(existingRating.comment || '')
        }
      }
    } catch (error) {
      console.error('Erreur chargement détails:', error)
    } finally {
      setLoading(false)
    }
  }

  const submitRating = async () => {
    if (!userRating) return

    try {
      await axios.post('/api/ratings', {
        matchId: id,
        rating: userRating,
        comment
      })
      
      alert('Événement noté avec succès ! ⭐')
      fetchMatchDetails() // Refresh
    } catch (error) {
      console.error('Erreur notation:', error)
      alert('Erreur lors de la notation')
    }
  }

  const ratePlayer = async (playerId: string, rating: number, comment?: string) => {
    try {
      console.log('🎯 Notation joueur/pilote:', { playerId, rating, comment, matchId: id })

      const response = await axios.post('/api/player-ratings', {
        playerId,
        matchId: id,
        rating,
        comment
      })

      console.log('✅ Réponse API:', response.data)

      if (response.data.success) {
        // Recharger TOUTES les notations
        const ratingsResponse = await axios.get(`/api/player-ratings?matchId=${id}`)
        if (ratingsResponse.data.success) {
          setPlayerRatings(ratingsResponse.data.ratings || [])
          console.log(`📊 ${ratingsResponse.data.ratings?.length || 0} notations rechargées`)
        }
        
        // Notification de succès
        const notification = document.createElement('div')
        notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 max-w-sm'
        notification.innerHTML = `
          <div class="flex items-center space-x-2">
            <div class="text-xl">⭐</div>
            <div>
              <div class="font-semibold">${response.data.message || 'Notation enregistrée !'}</div>
              <div class="text-sm opacity-90">Moyenne: ${response.data.avgRating}/${matchData?.data.match.sport === 'F1' ? '10' : '10'} (${response.data.totalRatings} votes)</div>
            </div>
          </div>
        `
        document.body.appendChild(notification)
        
        setTimeout(() => {
          if (document.body.contains(notification)) {
            document.body.removeChild(notification)
          }
        }, 4000)
        
      } else {
        throw new Error(response.data.error || 'Erreur inconnue')
      }

    } catch (error: any) {
      console.error('❌ Erreur notation:', error)
      
      // Notification d'erreur
      const notification = document.createElement('div')
      notification.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 max-w-sm'
      notification.innerHTML = `
        <div class="flex items-center space-x-2">
          <div class="text-xl">❌</div>
          <div>
            <div class="font-semibold">Erreur de notation</div>
            <div class="text-sm opacity-90">${error.response?.data?.error || error.message || 'Erreur inconnue'}</div>
          </div>
        </div>
      `
      document.body.appendChild(notification)
      
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification)
        }
      }, 5000)
      
      throw error
    }
  }

  // Fonctions utilitaires pour différents sports
  const getSportEmoji = (sport: string) => {
    const emojis = {
      'FOOTBALL': '⚽',
      'BASKETBALL': '🏀',
      'MMA': '🥊',
      'RUGBY': '🏉',
      'F1': '🏎️'
    }
    return emojis[sport as keyof typeof emojis] || '🏆'
  }

  const formatScore = (homeScore: number | null, awayScore: number | null, sport: string) => {
    if (sport === 'F1') {
      return 'COURSE TERMINÉE' // Pas de score en F1
    }
    if (sport === 'MMA') {
      return 'W - L' // Win/Loss
    }
    return `${homeScore ?? '?'} - ${awayScore ?? '?'}` // Football, Basketball, Rugby
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Chargement des détails complets...</p>
        </div>
      </div>
    )
  }

  if (!matchData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Événement non trouvé</p>
          <Link href="/" className="text-blue-600 hover:text-blue-700 mt-2 block">
            ← Retour à l'accueil
          </Link>
        </div>
      </div>
    )
  }

  const { match } = matchData.data

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 📱 BOUTON RETOUR MOBILE CORRIGÉ - Descendu encore plus bas */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4">
          {/* Espace supplémentaire en haut pour mobile (safe area + marge) */}
          <div className="pt-4 md:pt-2 safe-area-top">
            {/* Bouton retour repositionné encore plus bas */}
            <div className="flex items-center justify-between py-4 md:py-2">
              <Link href="/" className="flex items-center text-gray-600 hover:text-gray-900 transition-colors touch-target group">
                <div className="flex items-center space-x-2 px-4 py-3 md:px-3 md:py-2 rounded-xl hover:bg-gray-100 transition-all">
                  <ArrowLeft className="w-5 h-5 md:w-5 md:h-5 group-hover:-translate-x-1 transition-transform" />
                  <span className="font-medium text-base md:text-base">Retour</span>
                </div>
              </Link>
              
              {/* Badge sport mobile */}
              <div className="flex items-center space-x-2 bg-gray-100 rounded-xl px-4 py-3 md:px-3 md:py-2">
                <span className="text-xl md:text-lg">{getSportEmoji(match.sport)}</span>
                <span className="text-sm font-medium text-gray-700 hidden sm:block">{match.competition}</span>
              </div>
            </div>
          </div>
          
          {/* Score principal universel */}
          <div className="text-center pb-4 md:pb-6">
            <div className="flex items-center justify-center space-x-2 mb-4 md:mb-2">
              <span className="text-2xl md:text-3xl">{getSportEmoji(match.sport)}</span>
              <span className="text-base md:text-lg font-medium text-gray-600 block sm:hidden md:block">{match.competition}</span>
            </div>

            {/* Header spécifique F1 */}
            {match.sport === 'F1' ? (
              <div className="mb-4">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">🏁 {match.homeTeam}</h1>
                <p className="text-lg md:text-xl text-gray-700">📍 {match.awayTeam}</p>
                <div className="text-base md:text-lg font-medium text-red-600 mt-2">
                  Formula 1 • Grand Prix terminé
                </div>
              </div>
            ) : (
              /* Header classique pour autres sports - Optimisé mobile */
              <div className="space-y-4 md:space-y-0">
                {/* Version mobile - Stack vertical */}
                <div className="block md:hidden">
                  <div className="bg-gradient-to-r from-blue-50 to-red-50 rounded-2xl p-4 mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        {match.homeTeamLogo && (
                          <img src={match.homeTeamLogo} alt="" className="w-6 h-6" />
                        )}
                        <h1 className="text-lg font-bold text-gray-900 truncate">{match.homeTeam}</h1>
                      </div>
                      <div className="text-2xl font-bold text-blue-600">{match.homeScore ?? '?'}</div>
                    </div>
                    
                    <div className="text-center text-gray-500 text-sm font-medium py-2">VS</div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <h1 className="text-lg font-bold text-gray-900 truncate">{match.awayTeam}</h1>
                        {match.awayTeamLogo && (
                          <img src={match.awayTeamLogo} alt="" className="w-6 h-6" />
                        )}
                      </div>
                      <div className="text-2xl font-bold text-red-600">{match.awayScore ?? '?'}</div>
                    </div>
                  </div>
                </div>

                {/* Version desktop - Horizontal */}
                <div className="hidden md:flex items-center justify-center space-x-8 mb-4">
                  <div className="text-center">
                    <div className="flex items-center space-x-2 mb-2">
                      {match.homeTeamLogo && (
                        <img src={match.homeTeamLogo} alt="" className="w-8 h-8" />
                      )}
                      <h1 className="text-2xl font-bold text-gray-900">{match.homeTeam}</h1>
                    </div>
                    <div className="text-4xl font-bold text-blue-600 mt-2">{match.homeScore ?? '?'}</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-gray-500 text-sm">VS</div>
                    <div className="text-2xl font-bold text-gray-900 mt-2">-</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="flex items-center space-x-2 mb-2">
                      <h1 className="text-2xl font-bold text-gray-900">{match.awayTeam}</h1>
                      {match.awayTeamLogo && (
                        <img src={match.awayTeamLogo} alt="" className="w-8 h-8" />
                      )}
                    </div>
                    <div className="text-4xl font-bold text-red-600 mt-2">{match.awayScore ?? '?'}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Infos du match universelles - Responsive */}
            <div className="flex flex-wrap items-center justify-center gap-3 md:gap-6 text-xs md:text-sm text-gray-600">
              <div className="flex items-center space-x-1 bg-gray-100 rounded-lg px-2 py-1">
                <Clock className="w-3 h-3 md:w-4 md:h-4" />
                <span className="font-medium">
                  {new Date(match.date).toLocaleDateString('fr-FR', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short'
                  })}
                </span>
              </div>
              <div className="flex items-center space-x-1 bg-gray-100 rounded-lg px-2 py-1">
                <MapPin className="w-3 h-3 md:w-4 md:h-4" />
                <span className="font-medium truncate max-w-[120px] md:max-w-none">{match.venue}</span>
              </div>
              {match.referee && match.sport !== 'F1' && (
                <div className="flex items-center space-x-1 bg-gray-100 rounded-lg px-2 py-1">
                  <Flag className="w-3 h-3 md:w-4 md:h-4" />
                  <span className="font-medium truncate max-w-[100px] md:max-w-none">{match.referee}</span>
                </div>
              )}
              {match.attendance && (
                <div className="flex items-center space-x-1 bg-gray-100 rounded-lg px-2 py-1">
                  <Users className="w-3 h-3 md:w-4 md:h-4" />
                  <span className="font-medium">{match.attendance.toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Contenu spécifique par sport */}
      <div className="max-w-7xl mx-auto px-4 py-6 md:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          {/* Contenu principal - Varie selon le sport */}
          <div className="lg:col-span-2 space-y-6 md:space-y-8">
            {match.sport === 'FOOTBALL' && (
              <FootballMatchDetails
                matchDetails={matchData.data}
                playerRatings={playerRatings}
                onRatePlayer={ratePlayer}
                currentUserId={session?.user?.id}
              />
            )}
            
            {match.sport === 'BASKETBALL' && (
              <BasketballMatchDetails
                matchDetails={matchData.data}
                playerRatings={playerRatings}
                onRatePlayer={ratePlayer}
                currentUserId={session?.user?.id}
              />
            )}

            {/* Interface F1 */}
            {match.sport === 'F1' && (
              <F1MatchDetails
                matchDetails={matchData.data}
                playerRatings={playerRatings}
                onRatePlayer={ratePlayer}
                currentUserId={session?.user?.id}
              />
            )}

            {/* 🆕 NOUVEAU : Section Reviews & Commentaires */}
            <MatchReviews
              matchId={match.id}
              matchTitle={match.sport === 'F1' ? match.homeTeam : `${match.homeTeam} vs ${match.awayTeam}`}
              currentUserId={session?.user?.id}
              userHasRated={!!userRating}
            />

            {/* Sports pas encore implémentés */}
            {!['FOOTBALL', 'BASKETBALL', 'F1'].includes(match.sport) && (
              <div className="bg-white rounded-xl shadow-lg p-6 md:p-8 text-center">
                <div className="text-4xl md:text-6xl mb-4">{getSportEmoji(match.sport)}</div>
                <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-2">
                  Interface {match.sport} en développement
                </h3>
                <p className="text-gray-600 mb-4 text-sm md:text-base">
                  L'interface détaillée pour {match.sport} sera bientôt disponible !
                </p>
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-blue-800 text-sm">
                    🚧 En attendant, vous pouvez toujours noter l'événement via la sidebar →
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar universelle - Notation de l'événement */}
          <div className="lg:col-span-1 space-y-6">
            <MatchRatingSidebar
              match={match}
              userRating={userRating}
              setUserRating={setUserRating}
              comment={comment}
              setComment={setComment}
              onSubmitRating={submitRating}
              session={session}
              avgRating={matchData.avgRating}
              totalRatings={matchData.totalRatings}
            />
            
            <MatchInfoCard match={match} />

            {/* 🆕 Widget statistiques de la communauté */}
            <CommunityStatsWidget matchId={match.id} />
          </div>
        </div>
      </div>
    </div>
  )
}

// Composant Sidebar de notation universelle
function MatchRatingSidebar({ 
  match, 
  userRating, 
  setUserRating, 
  comment, 
  setComment, 
  onSubmitRating, 
  session,
  avgRating,
  totalRatings
}: any) {
  const getSportEmoji = (sport: string) => {
    const emojis = {
      'FOOTBALL': '⚽',
      'BASKETBALL': '🏀',
      'MMA': '🥊',
      'RUGBY': '🏉',
      'F1': '🏎️'
    }
    return emojis[sport as keyof typeof emojis] || '🏆'
  }

  const getSportLabel = (sport: string) => {
    const labels = {
      'FOOTBALL': 'Match de Football',
      'BASKETBALL': 'Match de Basketball', 
      'MMA': 'Combat MMA',
      'RUGBY': 'Match de Rugby',
      'F1': 'Grand Prix F1'
    }
    return labels[sport as keyof typeof labels] || 'Événement'
  }

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      <div className={`p-4 md:p-6 text-white ${
        match.sport === 'F1' ? 'bg-gradient-to-r from-red-500 to-orange-600' :
        match.sport === 'BASKETBALL' ? 'bg-gradient-to-r from-orange-500 to-red-600' :
        'bg-gradient-to-r from-indigo-500 to-purple-600'
      }`}>
        <div className="flex items-center space-x-3">
          <span className="text-2xl md:text-3xl">{getSportEmoji(match.sport)}</span>
          <div>
            <h3 className="text-base md:text-lg font-semibold">Noter cet événement</h3>
            <p className="text-white/90 text-xs md:text-sm">{getSportLabel(match.sport)}</p>
          </div>
        </div>
      </div>
      
      {/* Stats de l'événement */}
      <div className="px-4 md:px-6 py-4 bg-gray-50 border-b">
        <div className="flex items-center justify-between text-sm">
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900">
              {totalRatings > 0 ? avgRating.toFixed(1) : '—'}
            </div>
            <div className="text-gray-600 text-xs">Note moyenne</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900">{totalRatings}</div>
            <div className="text-gray-600 text-xs">Vote{totalRatings > 1 ? 's' : ''}</div>
          </div>
        </div>
      </div>
      
      {session ? (
        <div className="p-4 md:p-6 space-y-5">
          <div>
            <p className="text-sm font-semibold mb-3 text-gray-700">Votre évaluation :</p>
            <div className="flex space-x-1 md:space-x-2 justify-center">
              {Array.from({ length: 5 }, (_, i) => (
                <Star
                  key={i}
                  className={`w-7 h-7 md:w-9 md:h-9 cursor-pointer transition-all duration-200 touch-target ${
                    i < userRating 
                      ? 'text-yellow-400 fill-current hover:scale-110' 
                      : 'text-gray-300 hover:text-yellow-300 hover:scale-105'
                  }`}
                  onClick={() => setUserRating(i + 1)}
                />
              ))}
            </div>
            {userRating > 0 && (
              <p className="text-center text-xs md:text-sm text-gray-600 mt-2">
                {userRating === 1 && "⭐ Très décevant"}
                {userRating === 2 && "⭐⭐ Décevant"}
                {userRating === 3 && "⭐⭐⭐ Correct"}
                {userRating === 4 && "⭐⭐⭐⭐ Très bon"}
                {userRating === 5 && "⭐⭐⭐⭐⭐ Exceptionnel"}
              </p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-semibold mb-3 text-gray-700">
              💭 Votre commentaire :
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full p-3 md:p-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none text-sm md:text-base"
              rows={3}
              placeholder={`Qu'avez-vous pensé de cet événement ?${getSportEmoji(match.sport)}`}
              maxLength={300}
            />
            <div className="text-xs text-gray-500 mt-1 text-right">
              {comment.length}/300 caractères
            </div>
          </div>
          
          <button
            onClick={onSubmitRating}
            disabled={userRating === 0}
            className={`w-full py-3 px-4 rounded-xl font-semibold transition-all duration-200 touch-target ${
              userRating === 0
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                : match.sport === 'F1' 
                ? 'bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
                : 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
            }`}
          >
            {userRating > 0 ? '✏️ Mettre à jour' : '⭐ Noter'} l'événement
          </button>
        </div>
      ) : (
        <div className="p-4 md:p-6 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Star className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-600 mb-4 text-sm">
            Connectez-vous pour noter cet événement
          </p>
          <Link 
            href="/auth/signin" 
            className="inline-block bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-3 rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all font-medium touch-target"
          >
            Se connecter
          </Link>
        </div>
      )}
    </div>
  )
}

// Composant d'informations sur l'événement
function MatchInfoCard({ match }: { match: MatchData }) {
  return (
    <div className="bg-white rounded-xl shadow-lg p-4 md:p-6">
      <h4 className="font-semibold text-gray-900 mb-4">📊 Informations</h4>
      <div className="space-y-3">
        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
          <span className="text-sm text-gray-600">Sport</span>
          <span className="font-medium text-gray-900">{match.sport}</span>
        </div>
        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
          <span className="text-sm text-gray-600">Date</span>
          <span className="font-medium text-gray-900 text-sm">
            {new Date(match.date).toLocaleDateString('fr-FR')}
          </span>
        </div>
        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
          <span className="text-sm text-gray-600">Lieu</span>
          <span className="font-medium text-gray-900 text-sm truncate max-w-[120px]">{match.venue}</span>
        </div>
        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
          <span className="text-sm text-gray-600">Compétition</span>
          <span className="font-medium text-gray-900 text-sm truncate max-w-[120px]">{match.competition}</span>
        </div>
        {match.referee && match.sport !== 'F1' && (
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <span className="text-sm text-gray-600">Arbitre</span>
            <span className="font-medium text-gray-900 text-sm truncate max-w-[120px]">{match.referee}</span>
          </div>
        )}
        {match.attendance && (
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <span className="text-sm text-gray-600">Spectateurs</span>
            <span className="font-medium text-gray-900 text-sm">
              {match.attendance.toLocaleString()}
            </span>
          </div>
        )}
        
        {/* Infos spécifiques F1 */}
        {match.sport === 'F1' && match.details && (
          <>
            {match.details.circuit?.length && (
              <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                <span className="text-sm text-red-600">Longueur circuit</span>
                <span className="font-medium text-red-800 text-sm">
                  {(match.details.circuit.length / 1000).toFixed(2)} km
                </span>
              </div>
            )}
            {match.details.fastest_lap && (
              <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                <span className="text-sm text-yellow-600">Meilleur tour</span>
                <span className="font-medium text-yellow-800 text-sm">
                  {match.details.fastest_lap.time}
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// Widget statistiques de la communauté
function CommunityStatsWidget({ matchId }: { matchId: string }) {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCommunityStats()
  }, [matchId])

  const fetchCommunityStats = async () => {
    try {
      const response = await axios.get(`/api/match-community-stats?matchId=${matchId}`)
      setStats(response.data.stats)
    } catch (error) {
      console.error('Erreur stats communauté:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-4 md:p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          <div className="h-3 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    )
  }

  if (!stats) return null

  return (
    <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl shadow-lg p-4 md:p-6 border border-purple-200">
      <h4 className="font-bold text-gray-900 mb-4 flex items-center space-x-2">
        <Users className="w-5 h-5 text-purple-600" />
        <span>Activité Communauté</span>
      </h4>
      
      <div className="space-y-4">
        {/* Répartition des notes */}
        <div>
          <p className="text-sm text-gray-600 mb-2">Notes de la communauté</p>
          <div className="space-y-1">
            {stats.ratingDistribution?.map((dist: any) => (
              <div key={dist.rating} className="flex items-center space-x-2">
                <span className="text-xs text-gray-600 w-6">{dist.rating}⭐</span>
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-purple-400 to-indigo-500 h-2 rounded-full transition-all"
                    style={{ width: `${dist.percentage}%` }}
                  ></div>
                </div>
                <span className="text-xs text-gray-600 w-8">{dist.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Stats rapides */}
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-3 bg-white/50 rounded-lg">
            <div className="text-lg font-bold text-purple-700">{stats.totalComments}</div>
            <div className="text-xs text-gray-600">Commentaires</div>
          </div>
          <div className="text-center p-3 bg-white/50 rounded-lg">
            <div className="text-lg font-bold text-purple-700">{stats.totalLikes}</div>
            <div className="text-xs text-gray-600">Likes</div>
          </div>
        </div>

        {/* Top reviewer du match */}
        {stats.topReviewer && (
          <div className="bg-white/60 rounded-lg p-3">
            <p className="text-xs text-gray-600 mb-2">🏆 Top reviewer</p>
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-xs font-bold text-white">
                {stats.topReviewer.name?.[0]?.toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{stats.topReviewer.name}</p>
                <p className="text-xs text-gray-600">{stats.topReviewer.likes} likes reçus</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <Link 
        href={`/match/${matchId}/reviews`}
        className="block w-full text-center mt-4 bg-gradient-to-r from-purple-500 to-indigo-600 text-white py-2 rounded-lg hover:from-purple-600 hover:to-indigo-700 transition-all text-sm font-medium touch-target"
      >
        💬 Voir toutes les reviews
      </Link>
    </div>
  )
}