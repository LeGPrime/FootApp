// pages/lists/[id].tsx - Mise à jour avec drag & drop
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import {
  ArrowLeft, Star, Calendar, MapPin, Eye, Heart, Lock, Globe,
  Edit, Share2, Copy, Check, MoreHorizontal, Trash2, Shuffle
} from 'lucide-react'
import axios from 'axios'
import Navbar from '../../components/Navbar'
import DraggableMatchList from '../../components/DraggableMatchList'

interface ListItem {
  id: string
  note?: string
  position: number
  addedAt: string
  match: {
    id: string
    homeTeam: string
    awayTeam: string
    homeScore?: number
    awayScore?: number
    date: string
    competition: string
    sport: string
    venue?: string
    homeTeamLogo?: string
    awayTeamLogo?: string
    avgRating: number
    totalRatings: number
  }
}

interface ListData {
  id: string
  name: string
  description?: string
  isPublic: boolean
  color?: string
  emoji?: string
  isOwner: boolean
}

export default function ListPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const { id } = router.query

  const [listData, setListData] = useState<ListData | null>(null)
  const [items, setItems] = useState<ListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (id) {
      fetchListData()
    }
  }, [id])

  const fetchListData = async () => {
    try {
      setLoading(true)
      const response = await axios.get(`/api/match-list-items?listId=${id}`)
      
      if (response.data.success) {
        setListData(response.data.list)
        // Trier par position pour être sûr
        const sortedItems = response.data.items.sort((a: ListItem, b: ListItem) => a.position - b.position)
        setItems(sortedItems)
      }
    } catch (error: any) {
      console.error('❌ Erreur chargement liste:', error)
      if (error.response?.status === 404) {
        router.push('/404')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleItemsReorder = (newItems: ListItem[]) => {
    setItems(newItems)
  }

  const handleShare = async () => {
    const url = window.location.href
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${listData?.emoji || '📋'} ${listData?.name}`,
          text: listData?.description || `Liste de matchs par ${session?.user?.name}`,
          url: url
        })
      } catch (error) {
        // L'utilisateur a annulé le partage
      }
    } else {
      // Fallback - copier le lien
      try {
        await navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch (error) {
        console.error('Erreur copie:', error)
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
        <Navbar activeTab="" />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-1/3"></div>
            <div className="h-32 bg-gray-200 dark:bg-slate-700 rounded"></div>
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="h-24 bg-gray-200 dark:bg-slate-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!listData) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
        <Navbar activeTab="" />
        <div className="max-w-4xl mx-auto px-4 py-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Liste non trouvée</h1>
          <Link href="/profile" className="text-blue-600 dark:text-blue-400 hover:text-blue-700">
            ← Retour au profil
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <Navbar activeTab="" />

      <main className="max-w-4xl mx-auto px-4 py-6 md:py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-6">
            <Link 
              href="/profile"
              className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Retour au profil</span>
            </Link>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg overflow-hidden">
            {/* Bande de couleur */}
            <div className={`h-2 ${
              listData.color ? `bg-${listData.color}-500` : 'bg-gradient-to-r from-blue-500 to-purple-600'
            }`}></div>

            <div className="p-6 md:p-8">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between space-y-4 md:space-y-0">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-4">
                    {listData.emoji && <span className="text-3xl">{listData.emoji}</span>}
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                      {listData.name}
                    </h1>
                    <div className="flex items-center space-x-2">
                      {listData.isPublic ? (
                        <div className="flex items-center space-x-1 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-2 py-1 rounded-lg text-sm">
                          <Globe className="w-4 h-4" />
                          <span>Publique</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1 bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400 px-2 py-1 rounded-lg text-sm">
                          <Lock className="w-4 h-4" />
                          <span>Privée</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {listData.description && (
                    <p className="text-gray-600 dark:text-gray-400 text-lg leading-relaxed mb-4">
                      {listData.description}
                    </p>
                  )}

                  <div className="flex items-center space-x-6 text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center space-x-1">
                      <Star className="w-4 h-4" />
                      <span>{items.length} match{items.length > 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-4 h-4" />
                      <span>Créée le {new Date(listData.id).toLocaleDateString('fr-FR')}</span>
                    </div>
                    {listData.isOwner && items.length > 1 && (
                      <div className="flex items-center space-x-1 text-blue-600 dark:text-blue-400">
                        <Shuffle className="w-4 h-4" />
                        <span>Réorganisable</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-3">
                  <button
                    onClick={handleShare}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/40 transition-colors"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Copié !</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="w-4 h-4" />
                        <span>Partager</span>
                      </>
                    )}
                  </button>

                  {listData.isOwner && (
                    <Link
                      href={`/profile?tab=lists&edit=${listData.id}`}
                      className="flex items-center space-x-2 px-4 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                      <span>Modifier</span>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Liste des matchs avec drag & drop */}
        {items.length > 0 ? (
          <DraggableMatchList
            items={items}
            listId={listData.id}
            isOwner={listData.isOwner}
            onItemsReorder={handleItemsReorder}
          />
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-8 text-center">
            <Star className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Liste vide
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Cette liste ne contient pas encore de matchs.
            </p>
            {listData.isOwner && (
              <Link
                href="/"
                className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200 font-semibold"
              >
                <Star className="w-4 h-4" />
                <span>Découvrir des matchs</span>
              </Link>
            )}
          </div>
        )}
      </main>
    </div>
  )
}