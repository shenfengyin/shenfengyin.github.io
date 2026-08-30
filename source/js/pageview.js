(() => {
  // Only recovered legacy posts receive a historical baseline.
  // New and future posts are intentionally absent and use Busuanzi's live count only.
  const historicalBaselines = {
    '/2022/12/18/LSM/': 243,
    '/2023/10/05/new-UUID/': 176,
    '/2023/10/05/sql-join/': 149,
    '/2023/10/09/git-command/': 154,
    '/2023/12/03/Embedding-word2vec/': 168,
    '/2023/12/17/flink-frame/': 196
  }

  // Busuanzi's value when this article was reset on 2026-08-31.
  const resetOffsets = {
    '/2026/08/30/deepseek-harness-guide/': 7
  }

  const normalizePath = () => {
    const path = window.location.pathname.replace(/index\.html$/, '')
    return path.endsWith('/') ? path : path + '/'
  }

  const applyBaseline = () => {
    const path = normalizePath()
    const baseline = historicalBaselines[path] || 0
    const resetOffset = resetOffsets[path] || 0
    const counter = document.querySelector('#busuanzi_value_page_pv')
    if ((!baseline && !resetOffset) || !counter || counter.dataset.baselineApplied === 'true') return

    const render = () => {
      const match = counter.textContent.replace(/,/g, '').match(/\d+/)
      if (!match) return false

      counter.dataset.baselineApplied = 'true'
      const pageviews = Math.max(0, Number(match[0]) + baseline - resetOffset)
      counter.textContent = pageviews.toLocaleString('zh-CN')
      return true
    }

    if (render()) return

    const observer = new MutationObserver(() => {
      if (render()) observer.disconnect()
    })
    observer.observe(counter, { childList: true, subtree: true, characterData: true })
    window.setTimeout(() => observer.disconnect(), 15000)
  }

  applyBaseline()
  document.addEventListener('pjax:complete', applyBaseline)
})()
