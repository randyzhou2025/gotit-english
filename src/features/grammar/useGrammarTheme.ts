import { onShow } from '@dcloudio/uni-app'
import { useVisualTheme } from '@/app/useVisualTheme'

export function useGrammarTheme() {
  const theme = useVisualTheme()
  onShow(() => uni.setNavigationBarColor({
    frontColor: '#000000',
    backgroundColor: theme.activeVisualTheme.value.tokens['--page-bg']
  }))
  return theme
}
