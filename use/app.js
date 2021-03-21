import firebase from 'firebase/app'
import 'firebase/firestore'
import { createGlobalState, when } from '@vueuse/core'
import { useFirestore } from '@vueuse/firebase'
import { computed } from '@nuxtjs/composition-api'
import { getCountFavorites } from '~/use/favorites'
import { getFiltered, getOptionsFromHash } from '~/utils'

const db = firebase.initializeApp(process.env.firebase.config).firestore()

export async function cache(name, keyField, check, fields) {
  const collection = await db.collection(name).get()

  const items = {}

  for (const doc of collection.docs) {
    const item = doc.data()
    item.id = doc.id
    const keyValue = item[keyField]

    if (check && !check(item)) {
      continue
    }

    if (!fields) {
      items[keyValue] = item
      continue
    }

    for (const field of fields) {
      if (item[field]) {
        items[keyValue] = items[keyValue] || {}
        items[keyValue][field] = item[field]
      }
    }
  }

  return items
}

export async function warmup() {
  const profiles = await cache('profiles', 'id', (d) => d.username, [
    'username',
    'photo',
    'height',
    'weight',
    'bio',
    'community',
    'locales'
  ])
  const cities = await cache('cities', 'name')

  await db
    .collection('app')
    .doc('latest')
    .set({
      profiles,
      cities
    })
}

export const useCache = createGlobalState(() =>
  useFirestore(db.collection('app').doc('latest'))
)

export const posterLabelColors = {
  profiles: 'bg-green-500',
  events: 'bg-red-500',
  posts: 'bg-orange-500'
}

export const getCityLabel = (doc) => `${doc.name}, ${doc.location.country}`

export const useApp = () => {
  const cache = useCache()

  const getPosterLabelColor = (collection, type) => {
    return posterLabelColors[collection] || 'bg-indigo-500'
  }

  const read = (collection, id, field) => {
    if (
      !cache.value ||
      !collection ||
      !id ||
      !cache.value[collection] ||
      !cache.value[collection][id]
    ) {
      return ''
    }

    if (!field) {
      return cache.value[collection][id]
    }

    return cache.value[collection][id][field]
  }

  const mapDetails = (item) => {
    return {
      ...item,
      savedByCount: getCountFavorites(item),
      createdByUsername: item.createdBy
        ? read('profiles', item.createdBy, 'username')
        : ''
    }
  }

  const getCities = async (q) => {
    await when(cache).not.toBeUndefined()

    const results = getOptionsFromHash(cache.value.cities, getCityLabel)

    return getFiltered(results, q, 'label')
  }

  return { read, cache, getPosterLabelColor, mapDetails, getCities }
}

export const useFullItems = (docs) => {
  const { mapDetails } = useApp()

  const items = computed(() => (docs.value ? docs.value.map(mapDetails) : []))

  return {
    items
  }
}
