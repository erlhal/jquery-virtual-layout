(function() {
  $.fn.virtualLayout = function(options) {
    var $canvas, $viewport, allRowsCache, canvasHeight, cj, cleanupRows, counterRowsRemoved, counterRowsRendered, data, destroy, getDataItem, getDataLength, getItemRenderer, getMaxSupportedCssHeight, getRenderedRange, getScrollPosition, getViewportHeight, getVisibleRange, handleScroll, height, invalidate, invalidateAllRows, invalidateRow, invalidateRows, lastRenderedScrollTop, maxSupportedCssHeight, n, offset, page, pageHeight, prevScrollTop, removeRowFromCache, render, renderRows, renderedRows, resizeCanvas, scrollDir, scrollTo, scrollTop, setElementTransform, top, updateRowCount, updateRowPositions, viewportHeight, visibleRowsCache, _ref, _ref2, _ref3;
        if (options != null) {
      options;
    } else {
      options = {};
    };
    maxSupportedCssHeight = null;
    canvasHeight = null;
    height = null;
    pageHeight = null;
    n = null;
    cj = 0;
    page = 0;
    offset = 0;
    scrollDir = 1;
    prevScrollTop = 0;
    scrollTop = 0;
    viewportHeight = 0;
    allRowsCache = [];
    visibleRowsCache = [];
    top = 0;
    renderedRows = 0;
    counterRowsRemoved = 0;
    counterRowsRendered = 0;
    lastRenderedScrollTop = 0;
        if ((_ref = options.rowHeight) != null) {
      _ref;
    } else {
      options.rowHeight = 100;
    };
        if ((_ref2 = options.scrollMethod) != null) {
      _ref2;
    } else {
      options.scrollMethod = "transform";
    };
        if ((_ref3 = options.minBuffer) != null) {
      _ref3;
    } else {
      options.minBuffer = 3;
    };
    getItemRenderer = options.itemRenderer;
    data = options.data || {};
    $viewport = $(this);
    if (options.includesViewport) {
      $canvas = $viewport.children();
    } else {
      $canvas = $viewport.wrapInner("<div></div>").children();
    }
    $viewport.addClass("virtual-layout-viewport");
    $canvas.addClass("virtual-layout-canvas");
    $canvas.css("-webkit-transform", "translate3d(0px, 0px, 0px)");
    $canvas.css({
      left: 0,
      top: 0
    });
    getDataLength = function() {
      if (data.getLength) {
        return data.getLength();
      } else {
        return data.length;
      }
    };
    getDataItem = function(i) {
      if (data.getItem) {
        return data.getItem(i);
      } else {
        return data[i];
      }
    };
    destroy = function() {
      var i, row, _len, _len2;
      data = null;
      options = null;
      for (i = 0, _len = visibleRowsCache.length; i < _len; i++) {
        row = visibleRowsCache[i];
        delete visibleRowsCache[i];
      }
      for (i = 0, _len2 = allRowsCache.length; i < _len2; i++) {
        row = allRowsCache[i];
        delete allRowsCache[i];
      }
      visibleRowsCache = void 0;
      allRowsCache = void 0;
      $viewport = void 0;
      return $canvas = void 0;
    };
    scrollTo = function(y) {
      var newScrollTop, oldOffset, range;
      oldOffset = offset;
      page = Math.min(n - 1, Math.floor(y / pageHeight));
      offset = Math.round(page * cj);
      newScrollTop = y - offset;
      if (offset !== oldOffset) {
        range = getVisibleRange(newScrollTop);
        cleanupRows(range.top, range.bottom);
        return updateRowPositions();
      }
    };
    cleanupRows = function(rangeToKeep) {
      var i, row, _len, _results;
      _results = [];
      for (i = 0, _len = visibleRowsCache.length; i < _len; i++) {
        row = visibleRowsCache[i];
        i = parseInt(i, 10);
        _results.push(i < rangeToKeep.top || i > rangeToKeep.bottom ? removeRowFromCache(i) : void 0);
      }
      return _results;
    };
    setElementTransform = function(x, y) {
      scrollTop = -parseFloat(y);
      return handleScroll();
    };
    invalidate = function() {
      updateRowCount();
      invalidateAllRows();
      return render();
    };
    invalidateAllRows = function() {
      var i, row, _len, _results;
      _results = [];
      for (i = 0, _len = visibleRowsCache.length; i < _len; i++) {
        row = visibleRowsCache[i];
        _results.push(removeRowFromCache(i));
      }
      return _results;
    };
    removeRowFromCache = function(row) {
      var node;
      node = visibleRowsCache[row];
      if (node == null) {
        return;
      }
      node.detach();
      delete visibleRowsCache[row];
      renderedRows--;
      return counterRowsRemoved++;
    };
    invalidateRows = function(rows) {
      var i, row, _len, _results;
      if (!rows || !rows.length) {
        return;
      }
      scrollDir = 0;
      _results = [];
      for (i = 0, _len = rows.length; i < _len; i++) {
        row = rows[i];
        _results.push(row ? removeRowFromCache(i) : void 0);
      }
      return _results;
    };
    invalidateRow = function(row) {
      return invalidateRows([row]);
    };
    getViewportHeight = function() {
      return parseFloat($.css($viewport[0], "height", true));
    };
    resizeCanvas = function() {
      var numVisibleRows, _ref4;
      if (options.autoHeight) {
        viewportHeight = options.rowHeight * (getDataLength() + ((_ref4 = options.enableAddRow) != null ? _ref4 : {
          1: 0
        }) + (typeof options.leaveSpaceForNewRows === "function" ? options.leaveSpaceForNewRows(numVisibleRows - {
          1: 0
        }) : void 0));
      } else {
        viewportHeight = getViewportHeight();
      }
      numVisibleRows = Math.ceil(viewportHeight / options.rowHeight);
      $viewport.height(viewportHeight);
      viewportHeight = viewportHeight;
      updateRowCount();
      return render();
    };
    updateRowCount = function() {
      var i, l, newRowCount, oldHeight, oldScrollTopInRange, row, _len;
      newRowCount = getDataLength() + (options.enableAddRow ? 1 : 0) + (options.leaveSpaceForNewRows ? numVisibleRows - 1 : 0);
      oldHeight = height;
      l = options.enableAddRow ? getDataLength() : getDataLength() - 1;
      for (i = 0, _len = visibleRowsCache.length; i < _len; i++) {
        row = visibleRowsCache[i];
        if (i >= l) {
          removeRowFromCache(i);
        }
      }
      canvasHeight = Math.max(options.rowHeight * newRowCount, viewportHeight);
      if (canvasHeight < maxSupportedCssHeight) {
        height = pageHeight = canvasHeight;
        n = 1;
        cj = 0;
      } else {
        height = maxSupportedCssHeight;
        pageHeight = height / 100;
        n = Math.floor(canvasHeight / pageHeight);
        cj = (canvasHeight - height) / (n - 1);
      }
      if (height !== oldHeight) {
        $canvas.css("height", height);
        scrollTop = getScrollPosition().top;
      }
      oldScrollTopInRange = scrollTop + offset <= canvasHeight - viewportHeight;
      if (canvasHeight === 0 || scrollTop === 0) {
        return page = offset = 0;
      } else if (oldScrollTopInRange) {
        return scrollTo(scrollTop + offset);
      } else {
        return scrollTo(canvasHeight - viewportHeight);
      }
    };
    getVisibleRange = function(viewportTop) {
      if (viewportTop == null) {
        viewportTop = scrollTop;
      }
      return {
        top: Math.floor((viewportTop + offset) / options.rowHeight),
        bottom: Math.ceil((viewportTop + offset + viewportHeight) / options.rowHeight)
      };
    };
    getRenderedRange = function(viewportTop) {
      var buffer, min, minBuffer, range;
      range = getVisibleRange(viewportTop);
      buffer = Math.round(viewportHeight / options.rowHeight);
      minBuffer = options.minBuffer;
      if (scrollDir === -1) {
        range.top -= buffer;
        range.bottom += minBuffer;
      } else if (scrollDir === 1) {
        range.top -= minBuffer;
        range.bottom += buffer;
      } else {
        range.top -= minBuffer;
        range.bottom += minBuffer;
      }
      range.top = Math.max(0, range.top);
      min = options.enableAddRow ? getDataLength() : getDataLength() - 1;
      range.bottom = Math.min(min, range.bottom);
      return range;
    };
    renderRows = function(range) {
      var avgRowRenderTime, child, d, element, elementArray, i, needToReselectCell, rowHeight, rows, rowsBefore, startTimestamp, _len;
      rowsBefore = renderedRows;
      elementArray = [];
      rows = [];
      startTimestamp = new Date();
      needToReselectCell = false;
      i = range.top;
      rowHeight = options.rowHeight;
      while (i <= range.bottom) {
        if (!visibleRowsCache[i]) {
          d = getDataItem(i);
          if (d) {
            renderedRows++;
            rows.push(i);
            top = (rowHeight * i - offset) + "px";
            element = allRowsCache[i] || getItemRenderer(d, i);
            element.css({
              top: top,
              position: 'absolute'
            });
            elementArray.push(element);
          }
          counterRowsRendered++;
        }
        i++;
      }
      for (i = 0, _len = elementArray.length; i < _len; i++) {
        child = elementArray[i];
        visibleRowsCache[rows[i]] = allRowsCache[rows[i]] = $(child).appendTo($canvas);
      }
      if (renderedRows - rowsBefore > 5) {
        return avgRowRenderTime = (new Date() - startTimestamp) / (renderedRows - rowsBefore);
      }
    };
    updateRowPositions = function() {
      var i, row, _len, _results;
      _results = [];
      for (i = 0, _len = visibleRowsCache.length; i < _len; i++) {
        row = visibleRowsCache[i];
        _results.push(row ? row.style.top = (i * options.rowHeight - offset) + "px" : void 0);
      }
      return _results;
    };
    render = function() {
      var h_render, rendered, visible;
      visible = getVisibleRange();
      rendered = getRenderedRange();
      cleanupRows(rendered);
      renderRows(rendered);
      lastRenderedScrollTop = scrollTop;
      return h_render = null;
    };
    handleScroll = function() {
      var h_render, oldOffset, scrollDist;
      scrollTop = getScrollPosition().top;
      scrollDist = Math.abs(scrollTop - prevScrollTop);
      if (scrollDist) {
        scrollDir = prevScrollTop < scrollTop ? 1 : -1;
        prevScrollTop = scrollTop;
        if (scrollDist < viewportHeight) {
          scrollTo(scrollTop + offset);
        } else {
          oldOffset = offset;
          page = Math.min(n - 1, Math.floor(scrollTop * ((canvasHeight - viewportHeight) / (height - viewportHeight)) * (1 / pageHeight)));
          offset = Math.round(page * cj);
          if (oldOffset !== offset) {
            invalidateAllRows();
          }
        }
        if (h_render) {
          clearTimeout(h_render);
        }
        if (Math.abs(lastRenderedScrollTop - scrollTop) < viewportHeight) {
          return render();
        } else {
          return h_render = setTimeout(render, 50);
        }
      }
    };
    getScrollPosition = function() {
      var matrix;
      switch (options.scrollMethod) {
        case "transform":
          matrix = $canvas.css("-webkit-transform").toString().match(/matrix\(\s*([^\s]+),\s*([^\s]+),\s*([^\s]+),\s*([^\s]+),\s*([^\s]+),\s*([^\s]+)\s*\)/) || [];
          return {
            top: parseInt(-(matrix[6] || 0)),
            left: parseInt(-(matrix[5] || 0))
          };
        default:
          return {
            top: $canvas[0].scrollTop
          };
      }
    };
    getMaxSupportedCssHeight = function() {
      var div, increment, supportedHeight, testUpTo;
      increment = 1000000;
      supportedHeight = increment;
      testUpTo = $.browser.mozilla ? 5000000 : 1000000000;
      div = $("<div style='display:none' />").appendTo(document.body);
      while (supportedHeight <= testUpTo) {
        div.css("height", supportedHeight + increment);
        if (div.height() !== supportedHeight + increment) {
          break;
        } else {
          supportedHeight += increment;
        }
      }
      div.remove();
      return supportedHeight;
    };
    maxSupportedCssHeight = getMaxSupportedCssHeight();
    $.extend(this, {
      handleScroll: handleScroll,
      render: render,
      viewportHeight: viewportHeight,
      getRenderedRange: getRenderedRange,
      getVisibleRange: getVisibleRange,
      updateRowPositions: updateRowPositions,
      visibleRowsCache: visibleRowsCache,
      allRowsCache: allRowsCache,
      getViewportHeight: getViewportHeight,
      resizeCanvas: resizeCanvas,
      invalidate: invalidate,
      setElementTransform: setElementTransform,
      destroy: destroy
    });
    return this;
  };
}).call(this);
