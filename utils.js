import format from 'date-fns/format'
import formatDistance from 'date-fns/formatDistance'
import MarkdownIt from 'markdown-it'
import excerptHtml from 'excerpt-html'
import _ from 'lodash'
import saveAs from 'file-saver'
import { dsvFormat } from 'd3'
import languages from '~/assets/languages'

export const getObjectKeysFromArray = (arr) => {
  const obj = {}

  arr.forEach((element) => {
    obj[element] = true
  })

  return obj
}

export const sortBy = (_key) => {
  let key = _key
  let multi = 1

  if (_key[0] === '-') {
    key = _key.slice(1)
    multi = -1
  }

  return (a, b) =>
    a[key] > b[key] ? 1 * multi : b[key] > a[key] ? -1 * multi : 0
}

export const toDatetimeLocal = (date) => {
  return format(date, "yyyy-MM-dd'T'HH:mm", {
    awareOfUnicodeTokens: true
  })
}

export const getDateObect = (val) => {
  let date

  if (!val) {
    return null
  }

  if (typeof val.toDate === 'function') {
    date = val.toDate()
  } else {
    date = new Date(val)
  }

  return date
}

export const dateDiff = (val) => {
  if (!val) return ''
  return formatDistance(getDateObect(val), new Date())
}

export const formatDate = (val, formatStr) => {
  if (!val) return ''
  return format(getDateObect(val), formatStr)
}

export const getDateTime = (val) => {
  return formatDate(val, "d MMM' at 'H:mm")
}

export const getDateTimeYear = (val) => {
  return formatDate(val, 'd MMM yyyy')
}

export const getYmdHms = (val) => {
  return formatDate(val, 'yyyy-MM-dd HH:mm:ss')
}

export const getYmd = (val) => {
  return formatDate(val, 'yyyy-MM-dd')
}

export const getDate = (val) => {
  return formatDate(val, 'd MMM')
}

export const getDay = (val) => {
  return formatDate(val, 'iiii')
}

export const getTime = (val) => {
  return formatDate(val, 'H:mm')
}

export const getTimeZone = (val) => {
  return formatDate(val, '(z)')
}

export const openURL = (url) => {
  window.open(url, '_blank')
}

export const getExcerpt = (markdown) => {
  if (!markdown) {
    return ''
  }

  const md = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: true
  })

  const html = md.render(markdown)

  return excerptHtml(html)
}

export const imageExists = async (url) => {
  let result = {}

  try {
    result = await fetch(url, { method: 'HEAD' })

    if (result.ok) {
      return true
    }
  } catch (e) {}

  return false
}

export const camelcase = (text) => {
  if (!text) {
    return ''
  }

  const result = text.replace(/([A-Z])/g, ' $1')
  const finalResult = result.charAt(0).toUpperCase() + result.slice(1)
  return finalResult
}

export const getId = (text) => {
  if (!text) {
    return ''
  }

  return text.replace(' ', '')
}

export const camelize = (str) => {
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, function(word, index) {
      return index === 0 ? word.toLowerCase() : word.toUpperCase()
    })
    .replace(/\s+/g, '')
}

export const addressPart = (result, type) => {
  if (!result) {
    return ''
  }

  const part = _.find(result.address_components, (o) => o.types.includes(type))
  if (!part) {
    return ''
  }

  return part.long_name
}

export const getLocation = (result, usedGps) => ({
  locality: addressPart(result, 'locality'),
  country: addressPart(result, 'country'),
  place_id: result.place_id,
  latitude: result.geometry.location.lat(),
  longitude: result.geometry.location.lng(),
  usedGps
})

export const sanitize = (input, trim, target = '') => {
  const val = input || ''
  const expression = new RegExp(trim, 'gi')
  return val.replace(expression, target).trim()
}

export const saveCSV = (data, filename) => {
  const csvFile = dsvFormat(',').format(data)
  const blob = new Blob([csvFile], {
    type: 'text/csv;charset=utf-8'
  })

  saveAs(blob, filename)
}

export const getOptions = (items, label) => {
  return [
    {
      label,
      value: ''
    },
    ...items
  ]
}

function getLang(languageString) {
  const [language] = languageString
    .replace('-', '_')
    .toLowerCase()
    .split('_')

  return language
}

export function browserLanguages() {
  const langs = []

  if (window?.navigator?.languages) {
    langs.push(...window.navigator.languages)
  }

  if (window?.navigator?.userLanguage) {
    langs.push(window.navigator.userLanguage)
  }

  if (window?.navigator?.language) {
    langs.push(window.navigator.language)
  }

  return langs
}

export function guessLanguages(fromUser, fromBrowser) {
  const input = String(fromUser).toLowerCase()
  const result = {}

  const longLangs = input
    .replace(/[`~!@#$%^&()_+\-?;:'",.\n\r/\\ ]/gi, '|')
    .split('|')
    .filter((l) => l)

  for (const longLang of longLangs) {
    const lang = languages.find(
      (l) =>
        longLang === l.label.toLowerCase() ||
        longLang === l.native.toLowerCase() ||
        (l.synonyms && l.synonyms.includes(longLang))
    )

    if (!lang) {
      continue
    }

    result[lang.value] = true
  }

  const langs = getLanguages(fromBrowser)

  let extended = { ...result, ...langs }

  if (!Object.keys(result)) {
    extended = { en: true }
  }

  return extended
}

export function getLanguages(input) {
  if (!window) {
    return {}
  }

  let langs = input

  if (!input) {
    langs = browserLanguages()
  }

  const locales = getObjectKeysFromArray(langs.map(getLang))

  return locales
}

function traverseAndFlatten(currentNode, target, flattenedKey) {
  for (const key in currentNode) {
    if (key in currentNode) {
      let newKey
      if (flattenedKey === undefined) {
        newKey = key
      } else {
        newKey = flattenedKey + '.' + key
      }

      const value = currentNode[key]
      if (typeof value === 'object' && value && !value.toDate) {
        traverseAndFlatten(value, target, newKey)
      } else {
        target[newKey] = value
      }
    }
  }
}

export function flatten(obj) {
  const flattenedObject = {}
  traverseAndFlatten(obj, flattenedObject)
  return flattenedObject
}
