// pages/top-reviews.tsx - VERSION CORRIGÉE ET AMÉLIORÉE
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import Head from 'next/head'
import {
  Trophy, Heart, Star, Clock, Users, TrendingUp, 
  Calendar, MapPin, Award, Crown, Medal, Target,
  Filter, RefreshCw, ExternalLink, MessageCircle,
  AlertCircle
} from 'lucide-react'
import axios from 'axios'
import Navbar from '../components/Navbar'

interface TopReview {
  id: string
  rating: number
  comment: string
  createdAt: string
  likes: number
  isLiked: boolean
  user: {
    id: string
    name: string
    username?: string
    image?: string
    totalReviews: number
    avgRating: number
  }
  match: {
    id: string
    sport: string
    homeTeam: string
    awayTeam: string
    homeScore?: number
    awayScore?: number
    date: string
    competition: string
    venue: string
    homeTeamLogo?: string
    awayTeamLogo?: string
  }
}

export default function TopReviewsPage() {
  const { data: session } = useSession()
  const [reviews, setReviews] = useState<TopReview[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'week' | 'month' | 'year'>('all')
  const [sportFilter, setSportFilter] = useState<string>('all')
  const [stats, setStats] = useState<any>(null)
  const [debugInfo, setDebugInfo] = useState<any>(null)

  useEffect(() => {
    fetchTopReviews()
  }, [filter, sportFilter])

  const fetchTopReviews = async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('🏆 Chargement top reviews...', { filter, sportFilter })
      
      const response = await axios.get('/api/top-reviews', {
        params: { period: filter, sport: sportFilter, limit: 100 }
      })
      
      console.log('📊 Réponse API:', response.data)
      
      if (response.data.success) {
        setReviews(response.data.reviews || [])
        setStats(response.data.stats || null)
        setDebugInfo(response.data.meta?.debug || null)
      } else {
        setError('Erreur lors du chargement des reviews')
      }
    } catch (error: any) {
      console.error('❌ Erreur chargement top reviews:', error)
      setError(error.response?.data?.details || 'Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  const handleLike = async (reviewId: string) => {
    if (!session?.user?.id) {
      alert('Connectez-vous pour liker les commentaires !')
      return
    }

    try {
      await axios.post('/api/match-reviews/like', { reviewId })
      
      // Mettre à jour l'état local
      setReviews(prevReviews => 
        prevReviews.map(review => 
          review.id === reviewId 
            ? { 
                ...review, 
                isLiked: !review.isLiked,
                likes: review.isLiked ? review.likes - 1 : review.likes + 1
              }
            : review
        )
      )
    } catch (error) {
      console.error('Erreur like:', error)
      alert('Erreur lors du like')
    }
  }

  const getSportEmoji = (sport: string) => {
    const emojis = {
      'football': '⚽',
      'basketball': '🏀',
      'mma': '🥊',
      'rugby': '🏉',
      'f1': '🏎️'
    }
    return emojis[sport.toLowerCase() as keyof typeof emojis] || '🏆'
  }

  const getRankEmoji = (index: number) => {
    if (index === 0) return '🥇'
    if (index === 1) return '🥈'
    if (index === 2) return '🥉'
    return `#${index + 1}`
  }

  const getRankColor = (index: number) => {
    if (index === 0) return 'from-yellow-400 to-yellow-600'
    if (index === 1) return 'from-gray-300 to-gray-500'
    if (index === 2) return 'from-orange-400 to-orange-600'
    return 'from-blue-400 to-blue-600'
  }

  const getTimeAgo = (date: string) => {
    const now = new Date()
    const reviewDate = new Date(date)
    const diffInDays = Math.floor((now.getTime() - reviewDate.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffInDays === 0) return 'Aujourd\'hui'
    if (diffInDays === 1) return 'Hier'
    if (diffInDays < 7) return `Il y a ${diffInDays} jours`
    if (diffInDays < 30) return `Il y a ${Math.floor(diffInDays / 7)} semaines`
    if (diffInDays < 365) return `Il y a ${Math.floor(diffInDays / 30)} mois`
    return `Il y a ${Math.floor(diffInDays / 365)} ans`
  }

  return (
    <>
      <Head>
        <title>Hall of Fame - SportRate</title>
        <meta name="description" content="Les commentaires sportifs les plus appréciés de la communauté SportRate" />
      </Head>
      
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-red-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <Navbar activeTab="hall-of-fame" />

        {/* Hero Header */}
        <div className="bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 text-white">
          <div className="max-w-7xl mx-auto px-4 py-12">
            <div className="text-center">
              <div className="flex items-center justify-center space-x-4 mb-6">
                <Trophy className="w-16 h-16 text-yellow-200" />
                <Crown className="w-12 h-12 text-yellow-300" />
                <Award className="w-14 h-14 text-yellow-200" />
              </div>
              
              <h1 className="text-4xl md:text-5xl font-black mb-4">
                🏆 Hall of Fame
              </h1>
              <p className="text-lg md:text-xl text-yellow-100 mb-6 max-w-2xl mx-auto">
                Les commentaires sportifs les plus appréciés de la communauté
              </p>
              
              {stats && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
                  <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
                    <div className="text-2xl font-bold">{stats.totalReviews?.toLocaleString()}</div>
                    <div className="text-yellow-100">Commentaires</div>
                  </div>
                  <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
                    <div className="text-2xl font-bold">{stats.totalLikes?.toLocaleString()}</div>
                    <div className="text-yellow-100">Likes totaux</div>
                  </div>
                  <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
                    <div className="text-2xl font-bold">{stats.activeUsers?.toLocaleString()}</div>
                    <div className="text-yellow-100">Reviewers actifs</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Filtres */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 mb-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center space-x-4">
                <h3 className="font-bold text-gray-900 dark:text-white flex items-center space-x-2">
                  <Filter className="w-5 h-5" />
                  <span>Filtres</span>
                </h3>
                
                {/* Filtre période */}
                <div className="flex space-x-2">
                  {[
                    { key: 'all', label: 'Tout temps' },
                    { key: 'year', label: 'Cette année' },
                    { key: 'month', label: 'Ce mois' },
                    { key: 'week', label: 'Cette semaine' }
                  ].map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => setFilter(key as any)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        filter === key
                          ? 'bg-orange-500 text-white shadow-lg'
                          : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Filtre sport */}
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Sport:</span>
                <select
                  value={sportFilter}
                  onChange={(e) => setSportFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                >
                  <option value="all">Tous les sports</option>
                  <option value="football">⚽ Football</option>
                  <option value="basketball">🏀 Basketball</option>
                  <option value="f1">🏎️ Formule 1</option>
                  <option value="mma">🥊 MMA</option>
                  <option value="rugby">🏉 Rugby</option>
                </select>
              </div>
            </div>

            {/* Debug Info */}
            {debugInfo && (
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm">
                <p className="text-blue-800 dark:text-blue-200">
                  🔍 Debug: {debugInfo.allReviews} reviews trouvées, {debugInfo.withLikes} avec likes
                </p>
              </div>
            )}
          </div>

          {/* Contenu principal */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-orange-500" />
              <span className="ml-2 text-gray-600 dark:text-gray-400">Chargement des légendes...</span>
            </div>
          ) : error ? (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-8 text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-red-800 dark:text-red-200 mb-2">Erreur de chargement</h3>
              <p className="text-red-600 dark:text-red-300 mb-4">{error}</p>
              <button
                onClick={fetchTopReviews}
                className="bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600 transition-colors"
              >
                Réessayer
              </button>
            </div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-12">
              <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-700 dark:text-gray-300 mb-2">Aucun commentaire dans le Hall of Fame</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                {stats?.totalReviews > 0 
                  ? 'Aucun commentaire n\'a encore reçu de likes avec ces filtres'
                  : 'Aucun commentaire trouvé avec ces filtres'
                }
              </p>
              <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
                <p>💡 Pour apparaître dans le Hall of Fame :</p>
                <p>1. Écrivez un commentaire sur un match</p>
                <p>2. D'autres utilisateurs doivent liker votre commentaire</p>
                <p>3. Plus vous avez de likes, plus vous montez dans le classement !</p>
              </div>
              <Link
                href="/"
                className="inline-block mt-6 bg-orange-500 text-white px-6 py-3 rounded-xl font-medium hover:bg-orange-600 transition-colors"
              >
                🚀 Aller noter des matchs
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {/* En-tête des résultats */}
              <div className="bg-orange-100 dark:bg-orange-900/20 rounded-xl p-4 border border-orange-200 dark:border-orange-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Crown className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                    <span className="font-medium text-orange-800 dark:text-orange-200">
                      {reviews.length} légende{reviews.length > 1 ? 's' : ''} du sport
                    </span>
                  </div>
                  <div className="text-sm text-orange-600 dark:text-orange-400">
                    Période: {filter === 'all' ? 'Tous les temps' : filter}
                  </div>
                </div>
              </div>

              {/* Liste des top reviews */}
              {reviews.map((review, index) => (
                <TopReviewCard
                  key={review.id}
                  review={review}
                  rank={index + 1}
                  onLike={() => handleLike(review.id)}
                  currentUserId={session?.user?.id}
                />
              ))}
            </div>
          )}

          {/* Call to action */}
          <div className="mt-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl p-8 text-white text-center">
            <Trophy className="w-12 h-12 mx-auto mb-4 text-yellow-200" />
            <h3 className="text-2xl font-bold mb-4">Rejoignez le Hall of Fame !</h3>
            <p className="text-orange-100 mb-6 max-w-2xl mx-auto">
              Écrivez des commentaires exceptionnels sur vos matchs préférés et 
              gagnez la reconnaissance de toute la communauté sportive !
            </p>
            <Link
              href="/"
              className="inline-block bg-white text-orange-600 px-8 py-3 rounded-xl font-bold hover:bg-gray-100 transition-all transform hover:scale-105"
            >
              🚀 Découvrir les matchs
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}

// Composant pour une review individuelle
function TopReviewCard({ 
  review, 
  rank, 
  onLike, 
  currentUserId 
}: {
  review: TopReview
  rank: number
  onLike: () => void
  currentUserId?: string
}) {
  const getSportEmoji = (sport: string) => {
    const emojis = {
      'football': '⚽',
      'basketball': '🏀',
      'mma': '🥊',
      'rugby': '🏉',
      'f1': '🏎️'
    }
    return emojis[sport.toLowerCase() as keyof typeof emojis] || '🏆'
  }

  const getRankEmoji = (index: number) => {
    if (index === 1) return '🥇'
    if (index === 2) return '🥈'
    if (index === 3) return '🥉'
    return `#${index}`
  }

  const getRankColor = (index: number) => {
    if (index === 1) return 'from-yellow-400 to-yellow-600'
    if (index === 2) return 'from-gray-300 to-gray-500'
    if (index === 3) return 'from-orange-400 to-orange-600'
    return 'from-blue-400 to-blue-600'
  }

  const getTimeAgo = (date: string) => {
    const now = new Date()
    const reviewDate = new Date(date)
    const diffInDays = Math.floor((now.getTime() - reviewDate.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffInDays === 0) return 'Aujourd\'hui'
    if (diffInDays === 1) return 'Hier'
    if (diffInDays < 7) return `Il y a ${diffInDays} jours`
    if (diffInDays < 30) return `Il y a ${Math.floor(diffInDays / 7)} semaines`
    if (diffInDays < 365) return `Il y a ${Math.floor(diffInDays / 30)} mois`
    return `Il y a ${Math.floor(diffInDays / 365)} ans`
  }

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl shadow-lg overflow-hidden transform hover:scale-[1.02] transition-all duration-300 ${
      rank <= 3 ? 'ring-2 ring-yellow-300 dark:ring-yellow-600 shadow-xl' : ''
    }`}>
      {/* Badge de rang */}
      <div className="relative">
        <div className={`absolute top-4 left-4 z-10 w-16 h-16 bg-gradient-to-br ${getRankColor(rank)} rounded-full flex items-center justify-center text-white font-black text-lg shadow-lg`}>
          {getRankEmoji(rank)}
        </div>
        
        {/* Header match */}
        <div className="bg-gradient-to-r from-gray-100 to-gray-200 dark:from-slate-700 dark:to-slate-600 p-6 pt-8">
          <div className="ml-20">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">{getSportEmoji(review.match.sport)}</span>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    {review.match.sport === 'f1' 
                      ? review.match.homeTeam 
                      : `${review.match.homeTeam} vs ${review.match.awayTeam}`
                    }
                  </h3>
                  <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                    <span>{review.match.competition}</span>
                    <span>•</span>
                    <Clock className="w-3 h-3" />
                    <span>{getTimeAgo(review.match.date)}</span>
                    <span>•</span>
                    <MapPin className="w-3 h-3" />
                    <span>{review.match.venue}</span>
                  </div>
                </div>
              </div>
              
              <Link
                href={`/match/${review.match.id}`}
                className="flex items-center space-x-1 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-all text-sm font-medium"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Voir le match</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Contenu de la review */}
      <div className="p-6">
        {/* Utilisateur et note */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Link href={`/user/${review.user.username || review.user.id}`}>
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold cursor-pointer hover:scale-105 transition-transform">
                {review.user.image ? (
                  <img src={review.user.image} alt="" className="w-full h-full rounded-full" />
                ) : (
                  review.user.name?.[0]?.toUpperCase() || '?'
                )}
              </div>
            </Link>
            
            <div>
              <div className="flex items-center space-x-2">
                <Link 
                  href={`/user/${review.user.username || review.user.id}`}
                  className="font-bold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  {review.user.name}
                </Link>
                {review.user.totalReviews > 50 && (
                  <div className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 px-2 py-0.5 rounded-full text-xs font-medium">
                    🏆 Expert
                  </div>
                )}
              </div>
              
              <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                <span>{review.user.totalReviews} reviews</span>
                <span>•</span>
                <span>Moyenne: {review.user.avgRating.toFixed(1)}/5</span>
              </div>
            </div>
          </div>

          {/* Note de la review */}
          <div className="text-right">
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {review.rating.toFixed(1)}
            </div>
            <div className="flex">
              {Array.from({ length: 5 }, (_, i) => (
                <Star
                  key={i}
                  className={`w-4 h-4 ${
                    i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300 dark:text-gray-600'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Commentaire */}
        <div className="mb-4">
          <p className="text-gray-800 dark:text-gray-200 leading-relaxed text-lg italic">
            "{review.comment}"
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-slate-700">
          <div className="flex items-center space-x-4">
            <button
              onClick={onLike}
              disabled={!currentUserId}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
                review.isLiked 
                  ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50' 
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-red-600 dark:hover:text-red-400'
              } ${!currentUserId ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Heart className={`w-5 h-5 ${review.isLiked ? 'fill-current' : ''}`} />
              <span className="font-medium">{review.likes}</span>
            </button>

            <div className="flex items-center space-x-1 text-gray-500 dark:text-gray-400 text-sm">
              <MessageCircle className="w-4 h-4" />
              <span>#{rank} dans le Hall of Fame</span>
            </div>
          </div>

          <div className="text-xs text-gray-500 dark:text-gray-400">
            {getTimeAgo(review.createdAt)}
          </div>
        </div>
      </div>
    </div>
  )
}