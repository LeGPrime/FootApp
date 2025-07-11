// pages/api/ballon-or.ts - Version complète avec support F1 et exclusion coachs
import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../lib/prisma'

interface BallonOrPlayer {
  id: string
  name: string
  normalizedName: string
  positions: string[]
  teams: string[]
  sport: string
  avgRating: number
  totalRatings: number
  totalMatches: number
  bestMatch: {
    id: string
    rating: number
    homeTeam: string
    awayTeam: string
    date: string
    competition: string
    team: string
  }
  recentMatches: Array<{
    matchId: string
    rating: number
    comment?: string
    homeTeam: string
    awayTeam: string
    date: string
    competition: string
    team: string
  }>
  ratingHistory: Array<{
    month: string
    avgRating: number
    matchCount: number
  }>
  teamBreakdown: Array<{
    team: string
    avgRating: number
    matchCount: number
    ratingCount: number
  }>
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const {
      sport = 'all',
      position = 'all', 
      minMatches = '3',
      limit = '50',
      period = 'all-time',
      excludeF1 = 'false'
    } = req.query

    console.log(`🏆 Calcul Ballon d'Or/Driver - Sport: ${sport}, Min matchs: ${minMatches}`)

    // 1. Construire les filtres
    let sportFilter = {}
    if (sport !== 'all') {
      sportFilter = { sport: sport.toString().toUpperCase() }
    } else if (excludeF1 === 'true') {
      // 🚫 Exclure F1 du Ballon d'Or classique UNIQUEMENT si excludeF1=true
      sportFilter = { 
        sport: { 
          not: 'F1' 
        } 
      }
    }

    let positionFilter = {}
    if (position !== 'all') {
      positionFilter = { position: position.toString() }
    }

    // 2. Filtre par période
    let dateFilter = {}
    const now = new Date()
    
    switch (period) {
      case 'this-year':
        const yearAgo = new Date()
        yearAgo.setFullYear(now.getFullYear() - 1)
        dateFilter = { createdAt: { gte: yearAgo } }
        break
      case 'this-season':
        const seasonStart = new Date()
        seasonStart.setMonth(8) // Septembre
        if (now.getMonth() < 8) {
          seasonStart.setFullYear(now.getFullYear() - 1)
        }
        dateFilter = { createdAt: { gte: seasonStart } }
        break
      case 'last-6-months':
        const sixMonthsAgo = new Date()
        sixMonthsAgo.setMonth(now.getMonth() - 6)
        dateFilter = { createdAt: { gte: sixMonthsAgo } }
        break
      default: // 'all-time'
        break
    }

    // 3. 🚫 EXCLURE EXPLICITEMENT LES COACHS - Inclure F1 si demandé explicitement
    let additionalFilters = {}
    
    // Toujours exclure les coachs
    additionalFilters.position = { not: 'COACH' }
    
    // Exclure F1 SEULEMENT si pas explicitement demandé ET excludeF1=true
    if (sport !== 'F1' && excludeF1 === 'true') {
      additionalFilters.sport = { not: 'F1' }
    }

    const playersWithRatings = await prisma.player.findMany({
      where: {
        ...sportFilter,
        ...additionalFilters,
        ratings: {
          some: {
            ...dateFilter
          }
        }
      },
      include: {
        ratings: {
          where: dateFilter,
          include: {
            match: {
              select: {
                id: true,
                homeTeam: true,
                awayTeam: true,
                date: true,
                competition: true,
                sport: true
              }
            },
            user: {
              select: {
                id: true,
                name: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    console.log(`👥 ${playersWithRatings.length} entités récupérées (SANS COACHS${sport === 'F1' ? ' - PILOTES F1' : excludeF1 === 'true' ? ' & SANS F1' : ''})`)

    // 4. 🧠 FUSION INTELLIGENTE - VERSION AMÉLIORÉE
    const fusedPlayers = new Map<string, any>()

    for (const player of playersWithRatings) {
      if (player.ratings.length === 0) continue

      // Normaliser le nom pour la fusion (pilotes F1 ou joueurs)
      const normalizedName = sport === 'F1' ? normalizeDriverName(player.name) : normalizePlayerName(player.name)
      
      // Si le joueur/pilote existe déjà (même nom normalisé), fusionner
      if (fusedPlayers.has(normalizedName)) {
        const existingPlayer = fusedPlayers.get(normalizedName)
        
        // Fusionner les données
        existingPlayer.ratings.push(...player.ratings)
        existingPlayer.teams.add(player.team)
        if (player.position) {
          existingPlayer.positions.add(player.position)
        }
        
        console.log(`🔗 Fusion réussie: ${player.name} (${player.team}) avec ${existingPlayer.name}`)
        console.log(`   -> Total ratings: ${existingPlayer.ratings.length}, équipes: ${Array.from(existingPlayer.teams).join(', ')}`)
      } else {
        // Nouveau joueur/pilote
        fusedPlayers.set(normalizedName, {
          originalId: player.id,
          name: sport === 'F1' ? chooseBestDriverName(player.name, normalizedName) : chooseBestPlayerName(player.name, normalizedName),
          normalizedName,
          sport: player.sport,
          teams: new Set([player.team]),
          positions: new Set(player.position ? [player.position] : []),
          ratings: [...player.ratings]
        })
        
        console.log(`🆕 Nouvelle entité: ${player.name} (${player.team})`)
      }
    }

    console.log(`🔗 Après fusion intelligente: ${fusedPlayers.size} entités uniques`)

    // 5. Calculer les statistiques pour chaque entité fusionnée
    const ballonOrCandidates: BallonOrPlayer[] = []

    for (const [normalizedName, fusedPlayer] of fusedPlayers.entries()) {
      const ratings = fusedPlayer.ratings
      
      if (ratings.length < parseInt(minMatches.toString())) {
        continue
      }

      // Filtre position après fusion
      if (position !== 'all' && !fusedPlayer.positions.has(position)) {
        continue
      }

      // Calculer la moyenne globale
      const avgRating = ratings.reduce((sum: number, r: any) => sum + r.rating, 0) / ratings.length
      
      // Trouver le meilleur match
      const bestRating = ratings.reduce((best: any, current: any) => 
        current.rating > best.rating ? current : best
      )

      // Récupérer les matchs uniques avec moyenne par match
      const uniqueMatches = new Map()
      ratings.forEach((rating: any) => {
        const matchId = rating.match.id
        if (!uniqueMatches.has(matchId)) {
          uniqueMatches.set(matchId, {
            match: rating.match,
            ratings: []
          })
        }
        uniqueMatches.get(matchId).ratings.push(rating)
      })

      const totalMatches = uniqueMatches.size

      // Calculer les 5 matchs les plus récents
      const recentMatches = Array.from(uniqueMatches.values())
        .sort((a: any, b: any) => new Date(b.match.date).getTime() - new Date(a.match.date).getTime())
        .slice(0, 5)
        .map((matchData: any) => {
          const matchAvgRating = matchData.ratings.reduce((sum: number, r: any) => sum + r.rating, 0) / matchData.ratings.length
          const bestComment = matchData.ratings.find((r: any) => r.comment)?.comment
          
          // Déterminer l'équipe du joueur/pilote pour ce match
          const playerTeam = getPlayerTeamForMatch(matchData.match, Array.from(fusedPlayer.teams))
          
          return {
            matchId: matchData.match.id,
            rating: Number(matchAvgRating.toFixed(1)),
            comment: bestComment,
            homeTeam: matchData.match.homeTeam,
            awayTeam: matchData.match.awayTeam,
            date: matchData.match.date,
            competition: matchData.match.competition,
            team: playerTeam
          }
        })

      // Calculer l'historique mensuel
      const ratingHistory = calculateMonthlyHistory(ratings)

      // Calculer la répartition par équipe
      const teamBreakdown = calculateTeamBreakdown(ratings, Array.from(fusedPlayer.teams))

      // Déterminer l'équipe du meilleur match
      const bestMatchTeam = getPlayerTeamForMatch(bestRating.match, Array.from(fusedPlayer.teams))

      ballonOrCandidates.push({
        id: `fused_${normalizedName}`,
        name: fusedPlayer.name,
        normalizedName,
        positions: Array.from(fusedPlayer.positions),
        teams: Array.from(fusedPlayer.teams),
        sport: fusedPlayer.sport,
        avgRating: Number(avgRating.toFixed(2)),
        totalRatings: ratings.length,
        totalMatches,
        bestMatch: {
          id: bestRating.match.id,
          rating: bestRating.rating,
          homeTeam: bestRating.match.homeTeam,
          awayTeam: bestRating.match.awayTeam,
          date: bestRating.match.date,
          competition: bestRating.match.competition,
          team: bestMatchTeam
        },
        recentMatches,
        ratingHistory,
        teamBreakdown
      })
    }

    // 6. Trier par moyenne des notes
    ballonOrCandidates.sort((a, b) => {
      if (Math.abs(a.avgRating - b.avgRating) < 0.01) {
        return b.totalMatches - a.totalMatches
      }
      return b.avgRating - a.avgRating
    })

    // 7. Limiter les résultats
    const topPlayers = ballonOrCandidates.slice(0, parseInt(limit.toString()))

    // 8. Statistiques globales
    const globalStats = {
      totalPlayers: ballonOrCandidates.length,
      totalRatings: ballonOrCandidates.reduce((sum, p) => sum + p.totalRatings, 0),
      totalMatches: ballonOrCandidates.reduce((sum, p) => sum + p.totalMatches, 0),
      avgRatingGlobal: ballonOrCandidates.length > 0 
        ? ballonOrCandidates.reduce((sum, p) => sum + p.avgRating, 0) / ballonOrCandidates.length 
        : 0,
      topRating: topPlayers[0]?.avgRating || 0,
      sportBreakdown: calculateSportBreakdown(ballonOrCandidates),
      fusionStats: {
        originalPlayers: playersWithRatings.length,
        fusedPlayers: ballonOrCandidates.length,
        fusionReduction: playersWithRatings.length - ballonOrCandidates.length
      }
    }

    console.log(`🏆 ${sport === 'F1' ? 'Driver of the Fans' : 'Ballon d\'Or'} calculé:`)
    console.log(`   - ${playersWithRatings.length} entités originales`)
    console.log(`   - ${ballonOrCandidates.length} entités après fusion intelligente`)
    console.log(`   - Leader: ${topPlayers[0]?.name} (${topPlayers[0]?.avgRating}/10)`)
    console.log(`   - Équipes: ${topPlayers[0]?.teams.join(', ')}`)

    res.status(200).json({
      success: true,
      ballonOr: topPlayers,
      stats: globalStats,
      filters: {
        sport,
        position,
        period,
        minMatches: parseInt(minMatches.toString()),
        playersOnly: true, // 🆕 Indicateur que c'est uniquement des joueurs/pilotes
        excludeCoaches: true, // 🆕 Les coachs sont exclus
        excludeF1: sport !== 'F1' && excludeF1 === 'true', // 🆕 F1 exclu sauf si explicitement demandé
        isF1: sport === 'F1' // 🆕 Indicateur si c'est spécifiquement F1
      }
    })

  } catch (error) {
    console.error('❌ Erreur Ballon d\'Or/Driver:', error)
    res.status(500).json({
      success: false,
      error: 'Erreur serveur',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    })
  }
}

// 🧠 Fonction de normalisation intelligente des noms - VERSION AMÉLIORÉE
function normalizePlayerName(name: string): string {
  let normalized = name
    .toLowerCase()
    .trim()
    // Supprimer les accents
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    // Supprimer les caractères spéciaux sauf espaces et tirets
    .replace(/[^a-z\s-]/g, '')
    // Supprimer les doubles espaces
    .replace(/\s+/g, ' ')
    // Supprimer les espaces en début/fin
    .trim()

  // 🔍 NORMALISATION SPÉCIALE POUR LES GRANDES STARS
  const starMappings = {
    // Lionel Messi
    'l messi': 'lionel messi',
    'l. messi': 'lionel messi',
    'leo messi': 'lionel messi',
    'lionel messi': 'lionel messi',
    'messi': 'lionel messi',
    
    // Kylian Mbappé
    'k mbappe': 'kylian mbappe',
    'k. mbappe': 'kylian mbappe',
    'kylian mbappe': 'kylian mbappe',
    'mbappe': 'kylian mbappe',
    
    // Cristiano Ronaldo
    'c ronaldo': 'cristiano ronaldo',
    'c. ronaldo': 'cristiano ronaldo',
    'cristiano ronaldo': 'cristiano ronaldo',
    'ronaldo': 'cristiano ronaldo',
    'cr7': 'cristiano ronaldo',
    
    // Rayan Cherki
    'r cherki': 'rayan cherki', 
    'r. cherki': 'rayan cherki',
    'rayan cherki': 'rayan cherki',
    'cherki': 'rayan cherki',
    
    // Antoine Griezmann
    'a griezmann': 'antoine griezmann',
    'a. griezmann': 'antoine griezmann',
    'antoine griezmann': 'antoine griezmann',
    'griezmann': 'antoine griezmann',
    
    // Neymar
    'neymar jr': 'neymar',
    'neymar junior': 'neymar',
    'neymar': 'neymar',
    
    // Erling Haaland
    'e haaland': 'erling haaland',
    'e. haaland': 'erling haaland',
    'erling haaland': 'erling haaland',
    'haaland': 'erling haaland',
    
    // Vinicius Jr
    'vinicius jr': 'vinicius junior',
    'vinicius junior': 'vinicius junior',
    'vini jr': 'vinicius junior',
    'vinicius': 'vinicius junior',
    
    // LeBron James (basketball)
    'l james': 'lebron james',
    'l. james': 'lebron james',
    'lebron james': 'lebron james',
    'james': 'lebron james',
    
    // Stephen Curry
    's curry': 'stephen curry',
    's. curry': 'stephen curry',
    'stephen curry': 'stephen curry',
    'steph curry': 'stephen curry',
    'curry': 'stephen curry'
  }

  // Vérifier si on a une correspondance dans les mappings
  if (starMappings[normalized]) {
    normalized = starMappings[normalized]
    console.log(`⭐ Star détectée: "${name}" -> "${normalized}"`)
    return normalized
  }

  // 🔍 NORMALISATION GÉNÉRIQUE POUR LES INITIALES
  // Pattern: "Initiale. Nom" -> "prenom nom"
  const initialPattern = /^([a-z])\.\s*([a-z]+)$/
  const match = normalized.match(initialPattern)
  
  if (match) {
    const initial = match[1]
    const lastName = match[2]
    
    // Essayer de deviner le prénom complet pour certains noms
    const commonNames = {
      'm': { 
        'mbappe': 'kylian',
        'salah': 'mohamed'
      },
      'l': {
        'messi': 'lionel',
        'suarez': 'luis',
        'modric': 'luka'
      },
      'c': {
        'ronaldo': 'cristiano',
        'mbappe': 'kylian' // Au cas où
      },
      'r': {
        'cherki': 'rayan',
        'mahrez': 'riyad'
      },
      'a': {
        'griezmann': 'antoine',
        'mbappe': 'kylian' // Parfois mal écrit
      }
    }
    
    if (commonNames[initial] && commonNames[initial][lastName]) {
      const fullName = `${commonNames[initial][lastName]} ${lastName}`
      console.log(`🔍 Expansion initiale: "${name}" -> "${fullName}"`)
      return fullName
    }
  }

  console.log(`🔍 Normalisation standard: "${name}" -> "${normalized}"`)
  return normalized
}

// 🏎️ Fonction de normalisation spéciale pour les pilotes F1
function normalizeDriverName(name: string): string {
  let normalized = name
    .toLowerCase()
    .trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z\s-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  // 🔍 NORMALISATION SPÉCIALE POUR LES PILOTES F1
  const driverMappings = {
    // Max Verstappen
    'm verstappen': 'max verstappen',
    'm. verstappen': 'max verstappen',
    'max verstappen': 'max verstappen',
    'verstappen': 'max verstappen',
    
    // Lewis Hamilton
    'l hamilton': 'lewis hamilton',
    'l. hamilton': 'lewis hamilton',
    'lewis hamilton': 'lewis hamilton',
    'hamilton': 'lewis hamilton',
    
    // Charles Leclerc
    'c leclerc': 'charles leclerc',
    'c. leclerc': 'charles leclerc',
    'charles leclerc': 'charles leclerc',
    'leclerc': 'charles leclerc',
    
    // Lando Norris
    'l norris': 'lando norris',
    'l. norris': 'lando norris',
    'lando norris': 'lando norris',
    'norris': 'lando norris',
    
    // George Russell
    'g russell': 'george russell',
    'g. russell': 'george russell',
    'george russell': 'george russell',
    'russell': 'george russell',
    
    // Carlos Sainz
    'c sainz': 'carlos sainz',
    'c. sainz': 'carlos sainz',
    'carlos sainz': 'carlos sainz',
    'sainz': 'carlos sainz',
    
    // Fernando Alonso
    'f alonso': 'fernando alonso',
    'f. alonso': 'fernando alonso',
    'fernando alonso': 'fernando alonso',
    'alonso': 'fernando alonso',
    
    // Sergio Perez
    's perez': 'sergio perez',
    's. perez': 'sergio perez',
    'sergio perez': 'sergio perez',
    'checo perez': 'sergio perez',
    'perez': 'sergio perez'
  }

  // Vérifier si on a une correspondance dans les mappings
  if (driverMappings[normalized]) {
    normalized = driverMappings[normalized]
    console.log(`🏎️ Pilote détecté: "${name}" -> "${normalized}"`)
    return normalized
  }

  console.log(`🔍 Normalisation pilote standard: "${name}" -> "${normalized}"`)
  return normalized
}

// 🎯 Fonction pour choisir le meilleur nom d'affichage
function chooseBestPlayerName(originalName: string, normalizedName: string): string {
  // Préférer les noms complets aux initiales
  const hasInitial = originalName.includes('.')
  
  // Pour les stars connues, utiliser le nom complet canonique
  const canonicalNames = {
    'lionel messi': 'Lionel Messi',
    'cristiano ronaldo': 'Cristiano Ronaldo',
    'kylian mbappe': 'Kylian Mbappé',
    'neymar': 'Neymar Jr',
    'erling haaland': 'Erling Haaland',
    'vinicius junior': 'Vinicius Jr',
    'rayan cherki': 'Rayan Cherki',
    'antoine griezmann': 'Antoine Griezmann',
    'lebron james': 'LeBron James',
    'stephen curry': 'Stephen Curry'
  }
  
  // Si on a un nom canonique, l'utiliser
  if (canonicalNames[normalizedName]) {
    console.log(`⭐ Nom canonique choisi: ${canonicalNames[normalizedName]}`)
    return canonicalNames[normalizedName]
  }
  
  // Sinon, préférer le nom sans initiale
  if (hasInitial) {
    // Essayer de construire un nom complet
    const parts = originalName.split(' ')
    if (parts.length >= 2 && parts[0].includes('.')) {
      // Format "A. Nom" -> garder tel quel si pas de correspondance
      return originalName
    }
  }
  
  // Capitaliser proprement le nom original
  return originalName
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

// 🏎️ Fonction pour choisir le meilleur nom d'affichage pour les pilotes
function chooseBestDriverName(originalName: string, normalizedName: string): string {
  // Noms canoniques pour les pilotes F1
  const canonicalDriverNames = {
    'max verstappen': 'Max Verstappen',
    'lewis hamilton': 'Lewis Hamilton',
    'charles leclerc': 'Charles Leclerc',
    'lando norris': 'Lando Norris',
    'george russell': 'George Russell',
    'carlos sainz': 'Carlos Sainz',
    'fernando alonso': 'Fernando Alonso',
    'sergio perez': 'Sergio Pérez'
  }
  
  // Si on a un nom canonique, l'utiliser
  if (canonicalDriverNames[normalizedName]) {
    console.log(`🏎️ Nom canonique pilote choisi: ${canonicalDriverNames[normalizedName]}`)
    return canonicalDriverNames[normalizedName]
  }
  
  // Sinon, capitaliser proprement le nom original
  return originalName
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

// Fonction pour déterminer l'équipe du joueur/pilote dans un match
function getPlayerTeamForMatch(match: any, playerTeams: string[]): string {
  // Essayer de faire correspondre avec les équipes du match
  const homeTeam = match.homeTeam.toLowerCase()
  const awayTeam = match.awayTeam.toLowerCase()
  
  for (const team of playerTeams) {
    const teamLower = team.toLowerCase()
    
    // Correspondance exacte ou partielle
    if (homeTeam.includes(teamLower) || teamLower.includes(homeTeam.split(' ')[0])) {
      return match.homeTeam
    }
    if (awayTeam.includes(teamLower) || teamLower.includes(awayTeam.split(' ')[0])) {
      return match.awayTeam
    }
    
    // Pour les équipes nationales
    if (team.includes('France') && (homeTeam.includes('france') || awayTeam.includes('france'))) {
      return homeTeam.includes('france') ? match.homeTeam : match.awayTeam
    }
  }
  
  // Si aucune correspondance, retourner la première équipe connue
  return playerTeams[0] || 'Équipe inconnue'
}

// Calculer la répartition par équipe
function calculateTeamBreakdown(ratings: any[], teams: string[]) {
  const teamStats = new Map()
  
  // Initialiser les stats pour chaque équipe
  teams.forEach(team => {
    teamStats.set(team, {
      team,
      ratings: [],
      matches: new Set()
    })
  })
  
  // Répartir les ratings par équipe (basé sur le match)
  ratings.forEach(rating => {
    const playerTeam = getPlayerTeamForMatch(rating.match, teams)
    const normalizedTeam = teams.find(t => 
      t.toLowerCase().includes(playerTeam.toLowerCase()) || 
      playerTeam.toLowerCase().includes(t.toLowerCase())
    ) || teams[0]
    
    if (teamStats.has(normalizedTeam)) {
      teamStats.get(normalizedTeam).ratings.push(rating.rating)
      teamStats.get(normalizedTeam).matches.add(rating.match.id)
    }
  })
  
  // Calculer les moyennes
  return Array.from(teamStats.values())
    .filter(stats => stats.ratings.length > 0)
    .map(stats => ({
      team: stats.team,
      avgRating: Number((stats.ratings.reduce((sum: number, r: number) => sum + r, 0) / stats.ratings.length).toFixed(2)),
      matchCount: stats.matches.size,
      ratingCount: stats.ratings.length
    }))
    .sort((a, b) => b.avgRating - a.avgRating)
}

// Fonctions utilitaires existantes (inchangées)
function calculateMonthlyHistory(ratings: any[]): Array<{month: string, avgRating: number, matchCount: number}> {
  const monthlyData = new Map()
  
  ratings.forEach(rating => {
    const date = new Date(rating.createdAt)
    const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`
    
    if (!monthlyData.has(monthKey)) {
      monthlyData.set(monthKey, {
        ratings: [],
        matches: new Set()
      })
    }
    
    monthlyData.get(monthKey).ratings.push(rating.rating)
    monthlyData.get(monthKey).matches.add(rating.match.id)
  })

  return Array.from(monthlyData.entries())
    .map(([month, data]) => ({
      month,
      avgRating: Number((data.ratings.reduce((sum: number, r: number) => sum + r, 0) / data.ratings.length).toFixed(2)),
      matchCount: data.matches.size
    }))
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-12)
}

function calculateSportBreakdown(players: BallonOrPlayer[]) {
  const breakdown = new Map()
  
  players.forEach(player => {
    if (!breakdown.has(player.sport)) {
      breakdown.set(player.sport, {
        count: 0,
        totalRatings: 0
      })
    }
    
    const data = breakdown.get(player.sport)
    data.count++
    data.totalRatings += player.totalRatings
  })

  return Array.from(breakdown.entries()).map(([sport, data]) => ({
    sport,
    playerCount: data.count,
    avgRating: players
      .filter(p => p.sport === sport)
      .reduce((sum, p) => sum + p.avgRating, 0) / data.count,
    totalRatings: data.totalRatings
  }))
}