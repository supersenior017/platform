import ls from 'local-storage'
import useAuth from '~/use/auth'

export default async ({ route, redirect }) => {
  const { getAccount, isAccountConfirmed } = useAuth()

  await getAccount()

  const routes = ['settings', 'signout']

  if (!isAccountConfirmed() && !routes.includes(route.name)) {
    ls('target', route.fullPath)
    redirect('/settings')
  }
}
