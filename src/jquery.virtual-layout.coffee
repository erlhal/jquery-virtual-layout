$.fn.virtualLayout = (options) ->
  options ?= {}
  maxSupportedCssHeight = null        # browsers breaking point
  canvasHeight          = null        # virtual height
  height                = null        # real scrollable height
  pageHeight            = null        # page height
  n                     = null        # number of pages
  cj                    = 0           # "jumpiness" coefficient
  
  page                  = 0           # current page
  offset                = 0           # current page offset
  scrollDir             = 1
  prevScrollTop         = 0
  scrollTop             = 0
  viewportHeight        = 0
  allRowsCache          = []
  visibleRowsCache      = []
  top                   = 0
  renderedRows          = 0
  counterRowsRemoved    = 0
  counterRowsRendered   = 0
  lastRenderedScrollTop = 0
  
  options.rowHeight     ?= 100
  options.scrollMethod  ?= "transform"
  options.minBuffer     ?= 3

  # itemRenderer: (data, index) -> $("#my-template").tmpl(data).outerHTML()
  getItemRenderer       = options.itemRenderer
  data                  = options.data || {}
  
  $viewport             = $(this)
  if options.includesViewport
    $canvas               = $viewport.children()
  else
    $canvas = $viewport.wrapInner("<div></div>").children()
  
  $viewport.addClass("virtual-layout-viewport")
  $canvas.addClass("virtual-layout-canvas")
  
  $canvas.css("-webkit-transform", "translate3d(0px, 0px, 0px)");
  $canvas.css({ left: 0, top: 0 });
  
  getDataLength = ->
    if data.getLength
      return data.getLength()
    else
      return data.length
  
  getDataItem = (i) ->
    if data.getItem
      return data.getItem(i)
    else
      return data[i]
      
  destroy = ->
    data = null
    options = null
    for row, i in visibleRowsCache
      delete visibleRowsCache[i]
    for row, i in allRowsCache
      delete allRowsCache[i]
    visibleRowsCache = undefined
    allRowsCache = undefined
    $viewport = undefined
    $canvas = undefined
  
  scrollTo = (y) ->
    oldOffset    = offset
    page         = Math.min(n-1, Math.floor(y / pageHeight))
    offset       = Math.round(page * cj)
    newScrollTop = y - offset

    if offset != oldOffset
      range      = getVisibleRange(newScrollTop)
      cleanupRows range.top, range.bottom
      updateRowPositions()

  cleanupRows = (rangeToKeep) ->
    for row, i in visibleRowsCache
      i = parseInt(i, 10)
      if i < rangeToKeep.top || i > rangeToKeep.bottom
        removeRowFromCache(i)
  
  setElementTransform = (x, y) ->
    scrollTop = -parseFloat(y)
    handleScroll()
  
  invalidate = ->
    updateRowCount()
    invalidateAllRows()
    render()
  
  invalidateAllRows = ->
    for row, i in visibleRowsCache
      removeRowFromCache(i)

  removeRowFromCache = (row) ->
    node = visibleRowsCache[row]
    return unless node?
    
    # $canvas[0].removeChild(node)
    # node.remove()
    node.detach()
    
    delete visibleRowsCache[row]
    renderedRows--
    counterRowsRemoved++

  invalidateRows = (rows) ->
    return if (!rows || !rows.length)
    scrollDir = 0
    for row, i in rows
      removeRowFromCache(i) if row

  invalidateRow = (row) ->
    invalidateRows([row])

  getViewportHeight = ->
    parseFloat($.css($viewport[0], "height", true))

  resizeCanvas = ->
    if options.autoHeight
      viewportHeight    = options.rowHeight * (getDataLength() + (options.enableAddRow ? 1 : 0) + (options.leaveSpaceForNewRows? numVisibleRows - 1 : 0))
    else
      viewportHeight    = getViewportHeight()

    numVisibleRows = Math.ceil(viewportHeight / options.rowHeight)
    $viewport.height(viewportHeight)
    
    viewportHeight = viewportHeight
    
    updateRowCount()
    render()

  updateRowCount = ->
    newRowCount         = getDataLength() + (if options.enableAddRow then 1 else 0) + (if options.leaveSpaceForNewRows then numVisibleRows - 1 else 0)
    oldHeight           = height
    
    # remove the rows that are now outside of the data range
    # this helps avoid redundant calls to .removeRow() when the size of the data decreased by thousands of rows
    l                   = if options.enableAddRow then getDataLength() else getDataLength() - 1
    for row, i in visibleRowsCache
      if i >= l
        removeRowFromCache(i)
    
    canvasHeight        = Math.max(options.rowHeight * newRowCount, viewportHeight)
    
    if canvasHeight < maxSupportedCssHeight
      # just one page
      height            = pageHeight = canvasHeight
      n                 = 1
      cj                = 0
    else
      # break into pages
      height           = maxSupportedCssHeight
      pageHeight        = height / 100
      n                 = Math.floor(canvasHeight / pageHeight)
      cj                = (canvasHeight - height) / (n - 1)
    
    if height != oldHeight
      $canvas.css("height", height)
      scrollTop         = getScrollPosition().top
    
    oldScrollTopInRange = (scrollTop + offset <= canvasHeight - viewportHeight)
    
    if canvasHeight == 0 || scrollTop == 0
      page = offset = 0
    else if oldScrollTopInRange
      # maintain virtual position
      scrollTo(scrollTop + offset)
    else
      # scroll to bottom
      scrollTo(canvasHeight - viewportHeight)

  getVisibleRange = (viewportTop) ->
    viewportTop = scrollTop unless viewportTop?
    
    {
      top:    Math.floor((viewportTop + offset) / options.rowHeight)
      bottom: Math.ceil((viewportTop + offset + viewportHeight) / options.rowHeight)
    }

  getRenderedRange = (viewportTop) ->
    range     = getVisibleRange(viewportTop)
    buffer    = Math.round(viewportHeight / options.rowHeight)
    minBuffer = options.minBuffer

    if scrollDir == -1
      range.top -= buffer
      range.bottom += minBuffer
    else if scrollDir == 1
      range.top -= minBuffer
      range.bottom += buffer
    else
      range.top -= minBuffer
      range.bottom += minBuffer

    range.top    = Math.max(0, range.top)
    min          = if options.enableAddRow then getDataLength() else getDataLength() - 1
    range.bottom = Math.min(min, range.bottom)

    range

  renderRows = (range) ->
    #console.log "top: #{range.top}, bottom: #{range.bottom}, offset: #{offset}"
    # parentNode         = $canvas[0]
    rowsBefore         = renderedRows
    elementArray        = []
    rows               = []
    startTimestamp     = new Date()
    needToReselectCell = false
    i                  = range.top
    rowHeight          = options.rowHeight
    
    while i <= range.bottom
      unless visibleRowsCache[i]
        # console.log "i: #{i}, #{visibleRowsCache[i]?}"
        d = getDataItem(i)
        if d
          renderedRows++
          rows.push(i)
          top = (rowHeight * i - offset) + "px"
          element = allRowsCache[i] || getItemRenderer(d, i)
          element.css(top: top, position: 'absolute')
          elementArray.push(element)
        counterRowsRendered++
      i++
    
    for child, i in elementArray
      visibleRowsCache[rows[i]] = allRowsCache[rows[i]] = $(child).appendTo($canvas) # parentNode.appendChild($(child)[0])
    
    if renderedRows - rowsBefore > 5
      avgRowRenderTime = (new Date() - startTimestamp) / (renderedRows - rowsBefore)

  updateRowPositions = ->
    for row, i in visibleRowsCache
      if row
        row.style.top = (i * options.rowHeight - offset) + "px"

  render = ->
    visible = getVisibleRange()
    rendered = getRenderedRange()
    
    # remove rows no longer in the viewport
    cleanupRows(rendered)

    # add new rows
    renderRows(rendered)

    lastRenderedScrollTop = scrollTop
    h_render = null

  handleScroll = ->
    scrollTop = getScrollPosition().top
    scrollDist = Math.abs(scrollTop - prevScrollTop)
    #console.log "handleScroll! scrollTop: #{scrollTop}, scrollDist: #{scrollDist}, prevScrollTop: #{prevScrollTop}, lastRenderedScrollTop: #{lastRenderedScrollTop}"
    if scrollDist
      scrollDir = if prevScrollTop < scrollTop then 1 else -1
      prevScrollTop = scrollTop
      
      # switch virtual pages if needed
      if scrollDist < viewportHeight
        scrollTo(scrollTop + offset)
      else
        oldOffset = offset
        page = Math.min(n - 1, Math.floor(scrollTop * ((canvasHeight - viewportHeight) / (height - viewportHeight)) * (1 / pageHeight)))
        offset = Math.round(page * cj)
        if oldOffset != offset
          invalidateAllRows()
      
      if h_render
        clearTimeout(h_render)

      if Math.abs(lastRenderedScrollTop - scrollTop) < viewportHeight
        render()
      else
        h_render = setTimeout(render, 50)
  
  getScrollPosition = ->
    switch options.scrollMethod
      when "transform"
        # $("#content").css("-webkit-transform") == "matrix(1, 0, 0, 1, 0, 300)"
        matrix = $canvas.css("-webkit-transform").toString().match(/matrix\(\s*([^\s]+),\s*([^\s]+),\s*([^\s]+),\s*([^\s]+),\s*([^\s]+),\s*([^\s]+)\s*\)/) || []
        top: parseInt(-(matrix[6] || 0))
        left: parseInt(-(matrix[5] || 0))
      else
        top: $canvas[0].scrollTop
    
  getMaxSupportedCssHeight = ->
    increment       = 1000000
    supportedHeight = increment
    # FF reports the height back but still renders blank after ~6M px
    testUpTo        = if ($.browser.mozilla) then 5000000 else 1000000000
    div             = $("<div style='display:none' />").appendTo(document.body)
    
    while supportedHeight <= testUpTo
      div.css("height", supportedHeight + increment)
      if div.height() != supportedHeight + increment
        break
      else
        supportedHeight += increment
    div.remove()
    supportedHeight
  
  maxSupportedCssHeight = getMaxSupportedCssHeight()
  
  $.extend this,
    handleScroll: handleScroll
    render: render
    viewportHeight: viewportHeight
    getRenderedRange: getRenderedRange
    getVisibleRange: getVisibleRange
    updateRowPositions: updateRowPositions
    visibleRowsCache: visibleRowsCache
    allRowsCache: allRowsCache
    getViewportHeight: getViewportHeight
    resizeCanvas: resizeCanvas
    invalidate: invalidate
    setElementTransform: setElementTransform
    destroy: destroy
  this