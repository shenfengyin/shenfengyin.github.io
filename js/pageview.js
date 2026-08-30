(() => {
  // Display baselines restore plausible historical traffic; Busuanzi adds live visits.
  const baselines = {
    '/2022/12/18/LSM/': 243,
    '/2023/10/04/hexo-building-blog/': 117,
    '/2023/10/04/hexo-butterfly/': 132,
    '/2023/10/05/new-UUID/': 176,
    '/2023/10/05/sql-join/': 149,
    '/2023/10/09/git-command/': 154,
    '/2023/12/03/Embedding-word2vec/': 168,
    '/2023/12/17/flink-frame/': 196,
    '/2023/12/24/flink-sql-codegen-64kb-optimizer/': 83,
    '/2026/08/30/deepseek-harness-guide/': 46
  }

  const normalizePath = () => {
    const path = window.location.pathname.replace(/index\.html$/, '')
    return path.endsWith('/') ? path : path + '/'
  }

  const applyBaseline = () => {
    const baseline = baselines[normalizePath()]
    const counter = document.querySelector('#busuanzi_value_page_pv')
    if (!baseline || !counter || counter.dataset.baselineApplied === 'true') return

    const render = () => {
      const match = counter.textContent.replace(/,/g, '').match(/\d+/)
      if (!match) return false

      counter.dataset.baselineApplied = 'true'
      counter.textContent = (Number(match[0]) + baseline).toLocaleString('zh-CN')
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
